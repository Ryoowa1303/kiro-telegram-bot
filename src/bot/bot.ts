/**
 * Assemble the grammY bot: dependencies, middleware, handlers, and the command
 * menu. Handler registration order matters — the catch-all text handler is last.
 */
import { Bot } from "grammy";
import type { AcpClient } from "../acp/client.js";
import type { AppConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { ProjectManager } from "../projects/manager.js";
import { SessionStore } from "../sessions/store.js";
import { createAuthMiddleware } from "./auth.js";
import { COMMANDS } from "./commands.js";
import { type BotDeps, MenuCache } from "./deps.js";
import { registerControl } from "./handlers/control.js";
import { registerHistory } from "./handlers/history.js";
import { registerMessages } from "./handlers/message.js";
import { registerProjects } from "./handlers/projects.js";
import { registerSessions } from "./handlers/sessions.js";
import { registerSystem } from "./handlers/system.js";
import { RuntimeRegistry } from "./registry.js";

const log = createLogger("bot");

export interface BotBundle {
  bot: Bot;
  registry: RuntimeRegistry;
}

export async function createBot(cfg: AppConfig, acp: AcpClient): Promise<BotBundle> {
  const bot = new Bot(cfg.token);
  const registry = new RuntimeRegistry(bot.api, acp, cfg);

  const deps: BotDeps = {
    api: bot.api,
    cfg,
    acp,
    registry,
    store: new SessionStore(cfg.sessionsDir),
    projects: new ProjectManager(cfg.projectRoots),
    menuCache: new MenuCache(),
  };

  bot.use(createAuthMiddleware(cfg));

  registerControl(bot, deps);
  registerProjects(bot, deps);
  registerSessions(bot, deps);
  registerHistory(bot, deps);
  registerSystem(bot, deps);
  registerMessages(bot, deps); // catch-all text — keep last

  bot.catch((err) => {
    log.error("unhandled bot error:", err.error instanceof Error ? err.error.message : err.error);
  });

  try {
    await bot.api.setMyCommands(COMMANDS);
  } catch (e) {
    log.warn("setMyCommands failed:", (e as Error).message);
  }

  return { bot, registry };
}
