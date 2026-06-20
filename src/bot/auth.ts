/**
 * Authorization middleware: restricts the bot to ALLOWED_USERS when configured.
 */
import type { Context, NextFunction } from "grammy";
import type { AppConfig } from "../config.js";
import { createLogger } from "../logger.js";

const log = createLogger("auth");

export function createAuthMiddleware(cfg: AppConfig) {
  const allowAll = cfg.allowedUsers.size === 0;
  if (allowAll) {
    log.warn("ALLOWED_USERS is empty — the bot will respond to ANY Telegram user.");
  }

  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const userId = ctx.from?.id ? String(ctx.from.id) : undefined;
    if (allowAll || (userId && cfg.allowedUsers.has(userId))) {
      await next();
      return;
    }
    log.warn(`blocked unauthorized user ${userId ?? "unknown"}`);
    if (ctx.chat) {
      await ctx.reply("\u26D4 Not authorized. Ask the bot owner to add your Telegram ID.");
    }
  };
}
