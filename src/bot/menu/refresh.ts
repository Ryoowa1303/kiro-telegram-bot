/**
 * Sends a message that refreshes the persistent keyboard (so its labels show
 * the current project/agent/reasoning/model) and updates the pinned panel.
 */
import type { Context } from "grammy";
import type { BotDeps } from "../deps.js";
import { mainKeyboard } from "./keyboard.js";

export async function refreshMenu(ctx: Context, deps: BotDeps, text: string): Promise<void> {
  const chatId = ctx.chat!.id;
  const s = deps.settings.get(chatId);
  const rt = deps.registry.get(chatId);
  await ctx.reply(text, { reply_markup: mainKeyboard(s, rt.projectName) });
  await deps.statusPanel.refresh(chatId);
}
