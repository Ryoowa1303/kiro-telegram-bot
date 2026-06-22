/**
 * Ephemeral message tracker — keeps the chat history clean.
 *
 * Navigation surfaces (the inline menu, session/project cards, pickers, status
 * snapshots, submenus) are *transient*: they're tracked per chat and removed
 * when a new surface opens or an action resolves. Persistent messages
 * (🔀 Switched / ✨ New session boundary markers, agent output, Done summaries,
 * the pinned status panel) are simply never tracked, so they survive clear().
 *
 * The user's own command / menu-button messages are deleted by a global
 * middleware (see bot.ts) — bots may delete incoming messages in private chats.
 */
import type { Api, Context } from "grammy";

export class Ephemeral {
  private readonly byChat = new Map<number, number[]>();

  constructor(private readonly api: Api) {}

  /** Track a bot message id for later cleanup. */
  remember(chatId: number, messageId: number | undefined): void {
    if (!messageId) return;
    const arr = this.byChat.get(chatId);
    if (arr) arr.push(messageId);
    else this.byChat.set(chatId, [messageId]);
  }

  /** Delete every tracked transient message for a chat (best-effort). */
  async clear(chatId: number | undefined): Promise<void> {
    if (chatId === undefined) return;
    const arr = this.byChat.get(chatId);
    if (!arr?.length) return;
    this.byChat.delete(chatId);
    await Promise.all(arr.map((id) => this.api.deleteMessage(chatId, id).catch(() => {})));
  }

  /**
   * Open a fresh navigation surface: clear whatever transient surface was up.
   * Call at the start of every menu/card/picker handler.
   */
  async open(ctx: Context): Promise<void> {
    await this.clear(ctx.chat?.id);
  }

  /** Send a transient reply (tracked) — use for menus / cards / pickers. */
  async reply(ctx: Context, text: string, extra: Record<string, unknown> = {}): Promise<number | undefined> {
    try {
      const msg = await ctx.reply(text, extra);
      this.remember(ctx.chat!.id, msg.message_id);
      return msg.message_id;
    } catch {
      return undefined;
    }
  }

  /** Delete just one tracked message (e.g. closing a single card). */
  async drop(ctx: Context): Promise<void> {
    await ctx.deleteMessage().catch(() => {});
  }
}
