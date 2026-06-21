/**
 * /sessions — list recent Kiro sessions and connect to one.
 * /active   — list sessions currently running on this PC.
 * /unwatch  — stop following a live session.
 *
 * Each row offers: Connect (resume, or fork if the session is locked/live),
 * 📜 History (static view), and 📡 Watch (live read-only follow).
 */
import { type Bot, type Context, InlineKeyboard } from "grammy";
import { basename } from "node:path";
import type { BotDeps } from "../deps.js";
import { readHistory } from "../../sessions/history.js";
import type { SessionMeta } from "../../sessions/types.js";
import { showHistory } from "./history.js";

const LIMIT = 20;
const UUID = "([0-9a-fA-F-]{36})";

export async function showSessions(ctx: Context, deps: BotDeps, query?: string): Promise<void> {
  const q = (query ?? "").trim().toLowerCase();
  let metas = deps.store.list(q ? 200 : LIMIT);
  if (q) {
    metas = metas
      .filter((m) => `${m.title} ${m.cwd} ${m.sessionId}`.toLowerCase().includes(q))
      .slice(0, LIMIT);
  }
  if (metas.length === 0) {
    await ctx.reply(q ? `No sessions match "${q}".` : "No saved sessions found in ~/.kiro/sessions/cli.");
    return;
  }
  const header = q ? `Sessions matching "${q}"` : "Recent sessions";
  await ctx.reply(`${header} \u2014 \u{1F7E2} active first \u00B7 tap to connect, \u{1F4DC} history, \u{1F4E1} watch:`, {
    reply_markup: buildKeyboard(metas),
  });
}

export function registerSessions(bot: Bot, deps: BotDeps): void {
  bot.command("sessions", (ctx) => showSessions(ctx, deps, ctx.match?.toString()));

  bot.command("active", async (ctx) => {
    const metas = deps.store.listActive();
    if (metas.length === 0) {
      await ctx.reply("No sessions are currently running on this PC.");
      return;
    }
    await ctx.reply("\u{1F7E2} Live sessions running now \u2014 tap to connect or \u{1F4E1} to watch:", {
      reply_markup: buildKeyboard(metas),
    });
  });

  bot.command("unwatch", async (ctx) => {
    const rt = deps.registry.get(ctx.chat.id);
    await ctx.reply(rt.stopWatch() ? "\u{1F6D1} Stopped watching." : "Not watching anything.");
  });

  bot.callbackQuery(new RegExp(`^sess:${UUID}$`), async (ctx) => {
    const id = ctx.match![1]!;
    const meta = deps.store.get(id);
    if (!meta) {
      await ctx.answerCallbackQuery({ text: "Session not found." });
      return;
    }
    await ctx.answerCallbackQuery();
    const rt = deps.registry.get(ctx.chat!.id);
    const prior = readHistory(deps.store.jsonlPath(id), 24);
    try {
      const result = await rt.attach(id, meta.cwd || rt.cwd, basename(meta.cwd || ""), prior);
      await ctx.editMessageText(connectMessage(result, meta));
      await showHistory(deps, ctx.chat!.id, id, meta);
    } catch (err) {
      await ctx.editMessageText(`\u274C Could not connect: ${(err as Error).message}`);
    }
  });

  bot.callbackQuery(new RegExp(`^hist:${UUID}$`), async (ctx) => {
    const id = ctx.match![1]!;
    await ctx.answerCallbackQuery();
    const meta = deps.store.get(id);
    await showHistory(deps, ctx.chat!.id, id, meta);
  });

  bot.callbackQuery(new RegExp(`^watch:${UUID}$`), async (ctx) => {
    const id = ctx.match![1]!;
    await ctx.answerCallbackQuery();
    const meta = deps.store.get(id);
    const rt = deps.registry.get(ctx.chat!.id);
    rt.startWatch(deps.store.jsonlPath(id));
    await ctx.reply(
      `\u{1F4E1} Watching live: ${meta?.title ?? id.slice(0, 8)}\nNew activity streams here. Send /unwatch to stop.`,
    );
  });
}

function connectMessage(result: "resumed" | "forked", meta: SessionMeta): string {
  if (result === "resumed") {
    return `\u2705 Resumed: ${meta.title}\n${meta.cwd}\n\nSend a message to continue.`;
  }
  return [
    `\u26A0\uFE0F ${meta.title} is live on your PC right now, so Kiro keeps it locked.`,
    `I opened a linked continuation here in the same project with its recent context.`,
    `${meta.cwd}`,
    ``,
    `Send a message to keep going \u2014 or tap \u{1F4E1} to watch the original live.`,
  ].join("\n");
}

function buildKeyboard(metas: SessionMeta[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const m of metas) {
    const dot = m.active ? "\u{1F7E2}" : "\u26AA";
    const proj = m.cwd ? basename(m.cwd) : "";
    const title = m.title.length > 24 ? m.title.slice(0, 24) + "\u2026" : m.title;
    const label = `${dot} ${title}${proj ? ` \u00B7 ${proj}` : ""}`;
    kb.text(label, `sess:${m.sessionId}`)
      .text("\u{1F4DC}", `hist:${m.sessionId}`)
      .text("\u{1F4E1}", `watch:${m.sessionId}`)
      .row();
  }
  return kb;
}
