/**
 * /reauth — log out of Kiro and start a fresh device-flow login, streaming the
 * verification URL + code into the chat. On success the ACP agent is restarted
 * so it picks up the new credentials.
 *
 * Guarded: refused while a prompt is in flight (logging out would break the
 * running turn) and serialised so two /reauth runs can't overlap.
 */
import type { Bot } from "grammy";
import { AuthService } from "../../app/auth-service.js";
import { createLogger } from "../../logger.js";
import type { BotDeps } from "../deps.js";

const log = createLogger("reauth");

/** Keep the last N chars of a transcript (the device URL/code are near the end). */
function tail(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? "\u2026" + t.slice(-n) : t;
}

export function registerReauth(bot: Bot, deps: BotDeps): void {
  const auth = new AuthService(deps.cfg.kiroCliPath);
  let inProgress = false;

  bot.command("reauth", async (ctx) => {
    if (inProgress) {
      await ctx.reply("\u{1F510} A re-authentication is already in progress.");
      return;
    }
    if (deps.acp.hasInflightPrompt()) {
      await ctx.reply("\u23F3 Kiro is busy running a turn \u2014 try /reauth when idle (or /cancel first).");
      return;
    }
    const extra = (ctx.match?.toString() ?? "").trim().split(/\s+/).filter(Boolean);

    inProgress = true;
    try {
      await ctx.reply("\u{1F510} Re-authenticating Kiro\u2026\n\u{1F6AA} Logging out\u2026");
      const out = await auth.logout();

      // A status message we keep editing (throttled) with the login transcript.
      const msg = await ctx.reply(
        `\u{1F6AA} Logged out${out.out ? `: ${tail(out.out, 200)}` : "."}\n\n\u{1F511} Starting device-flow login\u2026`,
      );

      let transcript = "";
      let timer: NodeJS.Timeout | undefined;
      const flush = async (): Promise<void> => {
        timer = undefined;
        const text = `\u{1F511} Kiro login (device flow)\n\n${tail(transcript, 1200) || "\u2026"}`;
        await ctx.api.editMessageText(ctx.chat.id, msg.message_id, text).catch(() => {});
      };
      const onOutput = (t: string): void => {
        transcript += t;
        if (!timer) timer = setTimeout(() => void flush(), 800);
      };

      const result = await auth.login(extra, onOutput, 300_000);
      if (timer) clearTimeout(timer);
      await flush(); // show the final transcript

      if (result.ok) {
        await ctx.reply("\u2705 Logged in. Restarting the Kiro agent\u2026");
        try {
          await deps.acp.restart();
          await ctx.reply("\u2705 Re-authenticated and agent restarted. Your session re-binds on the next message.");
        } catch (e) {
          await ctx.reply(`\u26A0\uFE0F Logged in, but agent restart failed: ${(e as Error).message}. Use /restart.`);
        }
      } else {
        await ctx.reply(
          `\u274C Login did not complete (exit ${result.code ?? "?"}).\n` +
            "If it asked for a license, retry with the flag, e.g.\n" +
            "\u2022 /reauth --license free\n" +
            "\u2022 /reauth --license pro --region <region> --identity-provider <url>",
        );
      }
    } catch (e) {
      log.warn("reauth failed:", (e as Error).message);
      await ctx.reply(`\u274C Re-auth error: ${(e as Error).message}`);
    } finally {
      inProgress = false;
    }
  });
}
