/**
 * /usage — show account info and the current session's context usage.
 */
import type { Bot, Context } from "grammy";
import type { BotDeps } from "../deps.js";

export async function showUsage(ctx: Context, deps: BotDeps): Promise<void> {
  await ctx.replyWithChatAction("typing").catch(() => {});
  const rt = deps.registry.get(ctx.chat!.id);
  const acct = await deps.usage.account();
  const meta = rt.contextInfo();
  const ctx100 = meta?.contextUsagePercentage;

  const lines = [
    "\u{1F4CA} Usage & account",
    acct?.email ? `\u{1F464} ${acct.email}` : "",
    acct?.accountType ? `\u{1F511} ${acct.accountType}${acct.region ? ` \u00B7 ${acct.region}` : ""}` : "",
    "",
    `\u{1F9F5} Session: ${rt.sessionId ? rt.sessionId.slice(0, 8) : "none"}`,
    `\u{1F9E9} Model: ${rt.model || "default"}`,
    `\u{1F4CA} Context used: ${ctx100 !== undefined ? `${ctx100.toFixed(0)}%` : "\u2014"}`,
    meta?.effort ? `\u{1F9E0} Effort: ${meta.effort}` : "",
    "",
    "\u2139\uFE0F Full billing/quota lives in the Kiro app, or run /usage inside `kiro-cli chat`.",
  ].filter(Boolean);

  if (!acct) lines.splice(1, 0, "(account info unavailable \u2014 is kiro-cli logged in?)");
  await deps.ephemeral.open(ctx);
  await deps.ephemeral.reply(ctx, lines.join("\n"));
}

export function registerUsage(bot: Bot, deps: BotDeps): void {
  bot.command("usage", (ctx) => showUsage(ctx, deps));
}
