/**
 * Shared dependencies passed to all handlers, plus a small per-chat cache for
 * mapping inline-keyboard buttons back to long values (project paths).
 */
import type { Api } from "grammy";
import type { AcpClient } from "../acp/client.js";
import type { AppConfig } from "../config.js";
import type { ProjectManager, ProjectEntry } from "../projects/manager.js";
import type { SessionStore } from "../sessions/store.js";
import type { RuntimeRegistry } from "./registry.js";

export interface BotDeps {
  api: Api;
  cfg: AppConfig;
  acp: AcpClient;
  registry: RuntimeRegistry;
  store: SessionStore;
  projects: ProjectManager;
  menuCache: MenuCache;
}

/** Caches the last project list shown per chat for callback resolution. */
export class MenuCache {
  private readonly projectLists = new Map<number, ProjectEntry[]>();

  setProjects(chatId: number, list: ProjectEntry[]): void {
    this.projectLists.set(chatId, list);
  }

  getProject(chatId: number, index: number): ProjectEntry | undefined {
    return this.projectLists.get(chatId)?.[index];
  }
}
