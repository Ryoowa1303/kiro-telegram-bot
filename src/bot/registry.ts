/**
 * Tracks one SessionRuntime per Telegram chat.
 */
import type { Api } from "grammy";
import type { AcpClient } from "../acp/client.js";
import type { AppConfig } from "../config.js";
import { SessionRuntime } from "./session-runtime.js";

export class RuntimeRegistry {
  private readonly runtimes = new Map<number, SessionRuntime>();

  constructor(
    private readonly api: Api,
    private readonly acp: AcpClient,
    private readonly cfg: AppConfig,
  ) {}

  get(chatId: number): SessionRuntime {
    let rt = this.runtimes.get(chatId);
    if (!rt) {
      rt = new SessionRuntime(this.api, chatId, this.acp, this.cfg);
      this.runtimes.set(chatId, rt);
    }
    return rt;
  }

  disposeAll(): void {
    for (const rt of this.runtimes.values()) rt.dispose();
    this.runtimes.clear();
  }
}
