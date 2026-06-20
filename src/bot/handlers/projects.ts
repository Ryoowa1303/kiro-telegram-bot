/**
 * /projects — browse configured roots and pick the folder Kiro works in.
 */
import { type Bot, InlineKeyboard } from "grammy";
import type { BotDeps } from "../deps.js";

const PAGE = 40;

export function registerProjects(bot: Bot, deps: BotDeps): void {
  bot.command("projects", async (ctx) => {
    const list = deps.projects.list(PAGE);
    deps.menuCache.setProjects(ctx.chat.id, list);
    if (list.length === 0) {
      await ctx.reply("No projects found. Set PROJECT_ROOTS in .env.");
      return;
    }
    const kb = new InlineKeyboard();
    list.forEach((p, i) => {
      kb.text(`\u{1F4C1} ${p.name}`, `proj:${i}`).row();
    });
    await ctx.reply("Choose a project:", { reply_markup: kb });
  });

  bot.callbackQuery(/^proj:(\d+)$/, async (ctx) => {
    const index = Number(ctx.match![1]);
    const entry = deps.menuCache.getProject(ctx.chat!.id, index);
    if (!entry) {
      await ctx.answerCallbackQuery({ text: "Selection expired, run /projects again." });
      return;
    }
    await ctx.answerCallbackQuery();
    const rt = deps.registry.get(ctx.chat!.id);
    try {
      await rt.startNewSession(entry.path, entry.name);
      await ctx.editMessageText(`\u2705 Project set: ${entry.name}\n${entry.path}\n\nNew session ready \u2014 send a message.`);
    } catch (err) {
      await ctx.editMessageText(`\u274C Could not open ${entry.name}: ${(err as Error).message}`);
    }
  });
}
