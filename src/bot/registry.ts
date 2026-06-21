/**
 * Tracks one SessionRuntime per Telegram chat and wires each runtime's
 * state-change notifications to a refresher (used by the status panel).
 */
import type { Api } from "grammy";
import type { AcpClient } from "../acp/client.js";
import type { SettingsStore } from "../app/settings-store.js";
import type { AppConfig } from "../config.js";
import { SessionRuntime } from "./session-runtime.js";

export class RuntimeRegistry {
  private readonly runtimes = new Map<number, SessionRuntime>();
  private refresher: ((chatId: number) => void) | undefined;

  constructor(
    private readonly api: Api,
    private readonly acp: AcpClient,
    private readonly cfg: AppConfig,
    private readonly settings: SettingsStore,
  ) {}

  setRefresher(fn: (chatId: number) => void): void {
    this.refresher = fn;
  }

  get(chatId: number): SessionRuntime {
    let rt = this.runtimes.get(chatId);
    if (!rt) {
      rt = new SessionRuntime(this.api, chatId, this.acp, this.cfg, this.settings);
      rt.onStateChange = () => this.refresher?.(chatId);
      this.runtimes.set(chatId, rt);
    }
    return rt;
  }

  disposeAll(): void {
    for (const rt of this.runtimes.values()) rt.dispose();
    this.runtimes.clear();
  }

  /** Find the chat that currently owns a given session id. */
  findChatBySession(sessionId: string): number | undefined {
    for (const [chatId, rt] of this.runtimes) {
      if (rt.sessionId === sessionId) return chatId;
    }
    return undefined;
  }
}
