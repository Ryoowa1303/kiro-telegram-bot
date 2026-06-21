/**
 * PermissionService — when Kiro is NOT in trust-all mode it asks the client to
 * approve risky tool calls (file writes, shell commands…). This turns each
 * ACP `session/request_permission` into inline Approve/Deny buttons and resolves
 * the request with the user's choice.
 */
import type { Api } from "grammy";
import { InlineKeyboard } from "grammy";
import type { PermissionOutcome, RequestPermissionParams } from "../acp/types.js";
import { createLogger } from "../logger.js";
import type { RuntimeRegistry } from "./registry.js";

const log = createLogger("permissions");
const TIMEOUT_MS = 10 * 60 * 1000;

const KIND_ICON: Record<string, string> = {
  read: "\u{1F4D6}",
  edit: "\u270F\uFE0F",
  execute: "\u{1F4BB}",
  delete: "\u{1F5D1}\uFE0F",
  move: "\u{1F4E6}",
  fetch: "\u{1F310}",
};

interface Pending {
  resolve: (o: PermissionOutcome) => void;
  options: RequestPermissionParams["options"];
  chatId: number;
  messageId?: number;
  timer: NodeJS.Timeout;
}

export class PermissionService {
  private readonly pending = new Map<string, Pending>();
  private seq = 0;

  constructor(
    private readonly api: Api,
    private readonly registry: RuntimeRegistry,
  ) {}

  /** Handle a permission request: ask the owning chat, or auto-allow if none. */
  async handle(params: RequestPermissionParams): Promise<PermissionOutcome> {
    const chatId = this.registry.findChatBySession(params.sessionId);
    if (chatId === undefined) return autoDecide(params); // unattended (e.g. scheduled task)

    const reqId = String(++this.seq);
    const kb = new InlineKeyboard();
    params.options.forEach((o, i) => kb.text(buttonLabel(o), `perm:${reqId}:${i}`).row());

    let messageId: number | undefined;
    try {
      const msg = await this.api.sendMessage(chatId, describe(params), { reply_markup: kb });
      messageId = msg.message_id;
    } catch (e) {
      log.warn("failed to send permission prompt:", (e as Error).message);
      return autoDecide(params);
    }

    return new Promise<PermissionOutcome>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(reqId);
        void this.api
          .editMessageText(chatId, messageId!, "\u231B Approval timed out \u2014 denied.")
          .catch(() => {});
        resolve({ outcome: { outcome: "cancelled" } });
      }, TIMEOUT_MS);
      this.pending.set(reqId, { resolve, options: params.options, chatId, messageId, timer });
    });
  }

  /** Resolve a pending request from a button tap; returns the chosen label. */
  resolveChoice(reqId: string, index: number): string | undefined {
    const p = this.pending.get(reqId);
    if (!p) return undefined;
    clearTimeout(p.timer);
    this.pending.delete(reqId);
    const opt = p.options[index];
    if (!opt) {
      p.resolve({ outcome: { outcome: "cancelled" } });
      return undefined;
    }
    p.resolve({ outcome: { outcome: "selected", optionId: opt.optionId } });
    return opt.name;
  }
}

function describe(params: RequestPermissionParams): string {
  const tc = params.toolCall;
  const kind = (tc?.kind || "other").toLowerCase();
  const icon = KIND_ICON[kind] ?? "\u{1F527}";
  const title = tc?.title || kind;
  const raw = (tc?.rawInput || {}) as Record<string, unknown>;
  const cmd = typeof raw.command === "string" ? raw.command : undefined;
  const path = typeof raw.path === "string" ? raw.path : undefined;
  const detail = cmd ? `\n\n$ ${cmd}` : path ? `\n\n${path}` : "";
  return `\u{1F510} Kiro wants to run a tool:\n${icon} ${title}${detail}\n\nApprove?`;
}

function buttonLabel(o: { name: string; kind?: string }): string {
  const k = `${o.kind ?? ""} ${o.name}`.toLowerCase();
  const icon = /reject|deny|no|cancel/.test(k) ? "\u26D4" : /always|all/.test(k) ? "\u2705\u267E\uFE0F" : "\u2705";
  return `${icon} ${o.name}`;
}

/** Pick an allow option when nobody can be asked (otherwise cancel). */
function autoDecide(params: RequestPermissionParams): PermissionOutcome {
  const allow = params.options.find((o) => /allow|approve|yes|once/i.test(`${o.kind ?? ""} ${o.name}`));
  return allow
    ? { outcome: { outcome: "selected", optionId: allow.optionId } }
    : { outcome: { outcome: "cancelled" } };
}
