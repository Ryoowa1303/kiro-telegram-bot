/**
 * SessionRuntime — binds one Telegram chat to one Kiro ACP session and drives
 * the prompt/stream lifecycle, the typing indicator, and the follow-up queue.
 */
import type { Api } from "grammy";
import type { AcpClient } from "../acp/client.js";
import type { SessionUpdate } from "../acp/types.js";
import type { AppConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { buildTranscript } from "../sessions/history.js";
import { TailWatcher } from "../sessions/tail.js";
import type { HistoryEntry } from "../sessions/types.js";
import { formatToolCall } from "../render/tool-call.js";
import { ResponseStreamer } from "../stream/streamer.js";
import { sendMarkdownDoc } from "./telegram-io.js";
import { TypingIndicator } from "./typing.js";

const log = createLogger("runtime");

const WATCH_ENTRY_MAX = 700;
const WATCH_ICON: Record<string, string> = {
  user: "\u{1F464}",
  assistant: "\u{1F916}",
  tool: "\u{1F527}",
  system: "\u2139\uFE0F",
};

export type AttachResult = "resumed" | "forked";

export class SessionRuntime {
  sessionId: string | undefined;
  cwd: string;
  projectName: string | undefined;

  private busy = false;
  private cancelled = false;
  private readonly queue: string[] = [];
  private streamer: ResponseStreamer | undefined;
  private readonly typing: TypingIndicator;
  private shownToolIds = new Set<string>();
  private readonly listener: (sessionId: string, update: SessionUpdate) => void;
  /** Context prepended to the next prompt after a fork (continuation). */
  private primingContext: string | undefined;
  /** Live read-only follower of an active session's event log. */
  private watcher: TailWatcher | undefined;
  /** Set when the ACP agent restarted and the session must be re-bound. */
  private rebindPending = false;
  private readonly restartListener: () => void;

  constructor(
    private readonly api: Api,
    private readonly chatId: number,
    private readonly acp: AcpClient,
    private readonly cfg: AppConfig,
  ) {
    this.cwd = cfg.workspace;
    this.typing = new TypingIndicator(api, chatId);
    this.listener = (sid, update) => this.onUpdate(sid, update);
    this.acp.on("session-update", this.listener);
    this.restartListener = () => {
      if (this.sessionId) this.rebindPending = true;
    };
    this.acp.on("restarted", this.restartListener);
  }

  get isBusy(): boolean {
    return this.busy;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  get isWatching(): boolean {
    return this.watcher?.running ?? false;
  }

  dispose(): void {
    this.acp.off("session-update", this.listener);
    this.acp.off("restarted", this.restartListener);
    this.typing.stop();
    this.stopWatch();
  }

  /** Create a fresh session in the given project directory. */
  async startNewSession(cwd: string, projectName?: string): Promise<void> {
    this.stopWatch();
    this.sessionId = await this.acp.newSession(cwd);
    this.cwd = cwd;
    this.projectName = projectName;
    log.info(`chat ${this.chatId} -> new session ${this.sessionId} @ ${cwd}`);
  }

  /** Attach to an existing session (resume / connect to a PC session). */
  async resumeSession(sessionId: string, cwd: string, projectName?: string): Promise<void> {
    if (!this.acp.supportsLoadSession) {
      throw new Error("This Kiro CLI build does not support loading sessions.");
    }
    this.stopWatch();
    await this.acp.loadSession(sessionId, cwd);
    this.sessionId = sessionId;
    this.cwd = cwd;
    this.projectName = projectName;
    log.info(`chat ${this.chatId} -> resumed session ${sessionId} @ ${cwd}`);
  }

  /**
   * Connect to a session. If it can be loaded (not locked by another live
   * process) we resume it. Otherwise — e.g. it's running right now on the PC and
   * Kiro holds an exclusive lock — we open a linked continuation in the same
   * project, primed with its recent history, so the user can keep interacting.
   */
  async attach(
    sessionId: string,
    cwd: string,
    projectName: string | undefined,
    priorEntries: HistoryEntry[],
  ): Promise<AttachResult> {
    try {
      await this.resumeSession(sessionId, cwd, projectName);
      return "resumed";
    } catch (err) {
      log.warn(`load failed (${(err as Error).message}); forking ${sessionId.slice(0, 8)}`);
      await this.startNewSession(cwd, projectName);
      if (priorEntries.length > 0) {
        this.primingContext = buildPriming(buildTranscript(priorEntries));
      }
      return "forked";
    }
  }

  /** Start following an active session's event log read-only. */
  startWatch(jsonlPath: string): void {
    this.stopWatch();
    this.watcher = new TailWatcher(jsonlPath, (entries) => void this.onWatchEntries(entries));
    this.watcher.start(true);
  }

  stopWatch(): boolean {
    if (!this.watcher) return false;
    this.watcher.stop();
    this.watcher = undefined;
    return true;
  }

  /**
   * Handle a user message. If a turn is already running, the text is queued and
   * sent automatically once the current turn finishes.
   * Returns "ran" | "queued".
   */
  async submit(text: string): Promise<"ran" | "queued"> {
    await this.ensureSession();
    if (this.busy) {
      this.queue.push(text);
      return "queued";
    }
    void this.runTurn(text);
    return "ran";
  }

  /** Ensure a usable session exists, re-binding after an ACP restart. */
  private async ensureSession(): Promise<void> {
    if (this.rebindPending && this.sessionId) {
      this.rebindPending = false;
      try {
        await this.acp.loadSession(this.sessionId, this.cwd);
        log.info(`chat ${this.chatId} re-bound session ${this.sessionId.slice(0, 8)} after restart`);
        return;
      } catch {
        log.warn(`re-bind failed; starting fresh session for chat ${this.chatId}`);
        await this.startNewSession(this.cwd, this.projectName);
        return;
      }
    }
    if (!this.sessionId) await this.startNewSession(this.cfg.workspace);
  }

  /** Explicitly queue a follow-up ("by the way…") regardless of busy state. */
  enqueue(text: string): void {
    this.queue.push(text);
  }

  /** Cancel the current turn. */
  async cancel(): Promise<boolean> {
    if (!this.busy || !this.sessionId) return false;
    this.cancelled = true;
    await this.acp.cancel(this.sessionId);
    return true;
  }

  clearQueue(): number {
    const n = this.queue.length;
    this.queue.length = 0;
    return n;
  }

  /** Remove all queued items and return them joined as a single prompt. */
  drainQueueToPrompt(): string | undefined {
    if (this.queue.length === 0) return undefined;
    return this.queue.splice(0, this.queue.length).join("\n\n");
  }

  // ── turn lifecycle ───────────────────────────────────────────────────────

  private async runTurn(text: string): Promise<void> {
    this.busy = true;
    this.cancelled = false;
    this.shownToolIds = new Set();
    this.streamer = new ResponseStreamer(this.api, this.chatId, this.cfg.streamThrottleMs);
    this.typing.start();

    // After a fork, prepend the prior conversation context once.
    let prompt = text;
    if (this.primingContext) {
      prompt = `${this.primingContext}\n\n---\n\nUser's new message:\n${text}`;
      this.primingContext = undefined;
    }

    try {
      const result = await this.acp.prompt(this.sessionId!, [{ type: "text", text: prompt }]);
      await this.streamer.finalize();
      if (this.cancelled || result.stopReason === "cancelled") {
        await this.notify("\u23F9 Stopped.");
      } else if (!this.streamer.hasOutput) {
        await this.notify("\u2705 Done (no text output).");
      }
    } catch (err) {
      await this.streamer?.finalize().catch(() => {});
      await this.notify(`\u274C Error: ${(err as Error).message}`);
    } finally {
      this.typing.stop();
      this.streamer = undefined;
      this.busy = false;
    }

    await this.flushQueue();
  }

  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0 || this.busy) return;
    const batch = this.queue.splice(0, this.queue.length).join("\n\n");
    await this.notify(`\u25B6\uFE0F Processing queued message\u2026`);
    void this.runTurn(batch);
  }

  private onUpdate(sessionId: string, update: SessionUpdate): void {
    if (!this.busy || sessionId !== this.sessionId || !this.streamer) return;
    const kind = update.sessionUpdate;

    if (kind === "agent_message_chunk" || kind === "agent_thought_chunk") {
      const text = update.content?.text;
      if (typeof text === "string") void this.streamer.appendText(text);
      return;
    }

    if (kind === "tool_call" || kind === "tool_call_update") {
      if (!this.cfg.showToolCalls) return;
      const id = update.toolCallId || `${kind}:${update.title ?? ""}`;
      if (this.shownToolIds.has(id)) return;
      this.shownToolIds.add(id);
      const md = formatToolCall(update, {
        showDiffs: this.cfg.showEditDiffs,
        diffMaxLines: this.cfg.diffMaxLines,
      });
      if (md) void this.streamer.addToolMessage(md, md);
    }
  }

  private async notify(text: string): Promise<void> {
    try {
      await this.api.sendMessage(this.chatId, text);
    } catch {
      /* non-fatal */
    }
  }

  /** Render newly observed events from a watched session into Telegram. */
  private async onWatchEntries(entries: HistoryEntry[]): Promise<void> {
    const body = entries
      .map((e) => {
        const icon = WATCH_ICON[e.role] ?? "\u2022";
        if (e.role === "tool") {
          const head = e.tool ? `\`${e.tool}\`` : "tool";
          return `${icon} ${head}`;
        }
        const text = e.text.length > WATCH_ENTRY_MAX ? e.text.slice(0, WATCH_ENTRY_MAX) + " …" : e.text;
        return `${icon} ${text}`;
      })
      .filter(Boolean)
      .join("\n\n");
    if (body.trim()) await sendMarkdownDoc(this.api, this.chatId, body);
  }
}

/** Build a priming preamble that seeds a forked continuation with context. */
function buildPriming(transcript: string): string {
  return [
    "You are resuming a conversation that is currently still running in another",
    "window on this machine, so this is a linked continuation. Below is the recent",
    "transcript for context — use it to continue seamlessly.",
    "",
    "=== RECENT TRANSCRIPT ===",
    transcript,
    "=== END TRANSCRIPT ===",
  ].join("\n");
}
