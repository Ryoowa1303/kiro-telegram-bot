/**
 * /projects — browse configured roots and pick the folder Kiro works in.
 * Exposes a reusable project menu used by the menu button and the task wizard.
 */
import { type Context, InlineKeyboard } from "grammy";
import type { Bot } from "grammy";
import type { BotDeps } from "../deps.js";
import { refreshMenu } from "../menu/refresh.js";

const PAGE = 40;

/** Send a project picker. `prefix` is the callback-data prefix (e.g. "proj:"). */
export async function sendProjectMenu(
  ctx: Context,
  deps: BotDeps,
  prefix: string,
  title: string,
): Promise<void> {
  const chatId = ctx.chat!.id;
  const list = deps.projects.list(PAGE);
  deps.menuCache.setProjects(chatId, list);
  if (list.length === 0) {
    await ctx.reply("No projects found. Set PROJECT_ROOTS in .env.");
    return;
  }
  const kb = new InlineKeyboard();
  list.forEach((p, i) => kb.text(`\u{1F4C1} ${p.name}`, `${prefix}${i}`).row());
  await ctx.reply(title, { reply_markup: kb });
}

export async function showProjects(ctx: Context, deps: BotDeps): Promise<void> {
  await sendProjectMenu(ctx, deps, "proj:", "Choose a project:");
}

export function registerProjects(bot: Bot, deps: BotDeps): void {
  bot.command("projects", (ctx) => showProjects(ctx, deps));

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
      await ctx.editMessageText(
        `\u2705 Project set: ${entry.name}\n${entry.path}\n\nNew session ready \u2014 send a message.`,
      );
      await refreshMenu(ctx, deps, `\u{1F4C1} Now working in ${entry.name}`);
    } catch (err) {
      await ctx.editMessageText(`\u274C Could not open ${entry.name}: ${(err as Error).message}`);
    }
  });
}
