/**
 * Plain text messages -> Kiro prompts. While a turn is running, messages are
 * queued and run automatically when the current turn finishes.
 * (Wizard input and menu-button text are intercepted by earlier handlers.)
 */
import type { Bot } from "grammy";
import { textPrompt } from "../../app/types.js";
import type { BotDeps } from "../deps.js";

export function registerMessages(bot: Bot, deps: BotDeps): void {
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text) return;

    if (text.startsWith("/")) {
      await ctx.reply("Unknown command. Type /help to see what I can do.");
      return;
    }

    const rt = deps.registry.get(ctx.chat.id);
    const outcome = await rt.submit(textPrompt(text));
    if (outcome === "queued") {
      await ctx.reply(
        `\u{1F4E5} Queued (position ${rt.queueLength}) \u2014 I'm still working on the previous task. It'll run next.`,
      );
    }
  });
}
