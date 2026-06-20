/**
 * ResponseStreamer — turns a stream of agent text deltas and tool-call updates
 * into a live, professional Telegram transcript.
 *
 * - Assistant text is shown in a "live" bubble edited in place (throttled).
 * - When a tool call arrives, the current bubble is sealed and the tool message
 *   is posted, so the chat reads chronologically: text -> tool -> text.
 * - Long output is split into multiple messages without breaking code fences.
 */
import type { Api } from "grammy";
import { chunkMarkdown } from "../render/chunk.js";
import { toTelegramMarkdown } from "../render/markdown.js";
import { safeEdit, safeSend } from "../bot/telegram-io.js";

const RAW_SOFT_LIMIT = 3000; // raw markdown chars before sealing a bubble

export class ResponseStreamer {
  private pending = "";
  private liveId: number | undefined;
  private timer: NodeJS.Timeout | undefined;
  private flushing = false;
  private dirty = false;

  constructor(
    private readonly api: Api,
    private readonly chatId: number,
    private readonly throttleMs: number,
  ) {}

  /** Append a streamed text delta from the agent. */
  async appendText(delta: string): Promise<void> {
    if (!delta) return;
    this.pending += delta;
    await this.sealOverflow();
    this.scheduleFlush();
  }

  /** Post a standalone tool-call message (sealing the current text bubble). */
  async addToolMessage(markdownV2: string, plain: string): Promise<void> {
    await this.sealLive();
    await safeSend(this.api, this.chatId, markdownV2, plain);
  }

  /** Flush everything and finalize the transcript. */
  async finalize(): Promise<void> {
    this.clearTimer();
    await this.sealOverflow();
    await this.sealLive();
  }

  /** Whether any visible content was produced. */
  get hasOutput(): boolean {
    return this.liveId !== undefined || this.pending.length > 0;
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private scheduleFlush(): void {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, this.throttleMs);
  }

  private async flush(): Promise<void> {
    if (this.flushing) {
      this.scheduleFlush();
      return;
    }
    if (!this.dirty || this.pending.length === 0) return;
    this.flushing = true;
    this.dirty = false;
    try {
      const rendered = toTelegramMarkdown(this.pending);
      if (this.liveId === undefined) {
        this.liveId = await safeSend(this.api, this.chatId, rendered, this.pending);
      } else {
        await safeEdit(this.api, this.chatId, this.liveId, rendered, this.pending);
      }
    } finally {
      this.flushing = false;
    }
  }

  /** Seal whole bubbles once the buffer grows past the soft limit. */
  private async sealOverflow(): Promise<void> {
    while (this.pending.length > RAW_SOFT_LIMIT) {
      const split = findSafeSplit(this.pending, RAW_SOFT_LIMIT);
      if (split <= 0) break; // no safe boundary yet; let it grow
      const head = this.pending.slice(0, split);
      this.pending = this.pending.slice(split).replace(/^\n+/, "");
      await this.sealText(head);
    }
  }

  /** Finalize the current live bubble with all remaining pending text. */
  private async sealLive(): Promise<void> {
    if (this.pending.length === 0) {
      this.liveId = undefined;
      return;
    }
    await this.sealText(this.pending);
    this.pending = "";
  }

  /** Render `md` and commit it as final message(s), reusing liveId for the first. */
  private async sealText(md: string): Promise<void> {
    const rendered = toTelegramMarkdown(md);
    const chunks = chunkMarkdown(rendered);
    const plainChunks = chunkMarkdown(md);
    if (chunks.length === 0) {
      this.liveId = undefined;
      return;
    }
    for (let i = 0; i < chunks.length; i++) {
      const mdv2 = chunks[i]!;
      const plain = plainChunks[i] ?? mdv2;
      if (i === 0 && this.liveId !== undefined) {
        await safeEdit(this.api, this.chatId, this.liveId, mdv2, plain);
      } else {
        await safeSend(this.api, this.chatId, mdv2, plain);
      }
    }
    this.liveId = undefined;
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}

/** Find a newline split point <= max where ``` fences stay balanced. */
function findSafeSplit(text: string, max: number): number {
  const window = text.slice(0, max);
  const candidates = [window.lastIndexOf("\n\n"), window.lastIndexOf("\n")];
  for (const idx of candidates) {
    if (idx > 0 && fencesBalanced(text.slice(0, idx))) return idx;
  }
  return -1;
}

function fencesBalanced(text: string): boolean {
  const fences = text.match(/^```/gm);
  return !fences || fences.length % 2 === 0;
}
