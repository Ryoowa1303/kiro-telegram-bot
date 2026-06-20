/**
 * Menu handler — wires the persistent reply-keyboard buttons to actions and
 * provides inline submenus for Agent, Reasoning and Model.
 */
import { type Bot, type Context, InlineKeyboard } from "grammy";
import { listAgents, type AgentInfo } from "../../agents/catalog.js";
import { reasoningLabel } from "../../app/reasoning.js";
import { REASONING_LEVELS, type ReasoningEffort } from "../../app/types.js";
import type { BotDeps } from "../deps.js";
import { BTN, BUTTON_LABELS } from "../menu/keyboard.js";
import { showProjects } from "./projects.js";
import { showSessions } from "./sessions.js";
import { showTasks } from "./tasks.js";

const agentCache = new Map<number, AgentInfo[]>();

export function registerMenu(bot: Bot, deps: BotDeps): void {
  bot.hears(BUTTON_LABELS, async (ctx) => {
    const chatId = ctx.chat.id;
    deps.wizard.abort(chatId); // buttons take priority over any active wizard
    const rt = deps.registry.get(chatId);

    switch (ctx.message?.text) {
      case BTN.project:
        return showProjects(ctx, deps);
      case BTN.sessions:
        return showSessions(ctx, deps);
      case BTN.tasks:
        return showTasks(ctx, deps);
      case BTN.agent:
        return showAgentMenu(ctx, deps);
      case BTN.reasoning:
        return showReasoningMenu(ctx, deps);
      case BTN.model:
        return showModelMenu(ctx, deps);
      case BTN.status:
        await deps.statusPanel.refresh(chatId);
        return void ctx.reply(deps.statusPanel.render(chatId));
      case BTN.newSession:
        try {
          await rt.startNewSession(rt.cwd, rt.projectName);
          return void ctx.reply(`\u2728 New session started in ${rt.projectName ?? rt.cwd}`);
        } catch (e) {
          return void ctx.reply(`\u274C ${(e as Error).message}`);
        }
      case BTN.stop:
        return void ctx.reply((await rt.cancel()) ? "\u23F9 Cancelling\u2026" : "Nothing is running.");
    }
  });

  // ── Agent ────────────────────────────────────────────────────────────────
  bot.callbackQuery(/^agent:set:(\d+)$/, async (ctx) => {
    const list = agentCache.get(ctx.chat!.id) ?? [];
    const agent = list[Number(ctx.match![1])];
    await ctx.answerCallbackQuery();
    if (!agent) return void ctx.editMessageText("Selection expired, tap Agent again.");
    await deps.registry.get(ctx.chat!.id).setAgentPref(agent.name);
    await ctx.editMessageText(`\u{1F916} Agent set to: ${agent.name}`);
  });
  bot.callbackQuery("agent:default", async (ctx) => {
    await ctx.answerCallbackQuery();
    await deps.registry.get(ctx.chat!.id).setAgentPref("");
    await ctx.editMessageText("\u{1F916} Agent set to: default");
  });

  // ── Reasoning ──────────────────────────────────────────────────────────────
  bot.callbackQuery(/^reason:(minimal|low|medium|high|max)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const level = ctx.match![1] as ReasoningEffort;
    deps.registry.get(ctx.chat!.id).setReasoningPref(level);
    await ctx.editMessageText(`\u{1F9E0} Reasoning effort set to: ${reasoningLabel(level)}`);
  });

  // ── Model ────────────────────────────────────────────────────────────────
  bot.callbackQuery("model:clear", async (ctx) => {
    await ctx.answerCallbackQuery();
    await deps.registry.get(ctx.chat!.id).setModelPref("");
    await ctx.editMessageText("\u{1F9E9} Model reset to the session default.");
  });
}

async function showAgentMenu(ctx: Context, deps: BotDeps): Promise<void> {
  const chatId = ctx.chat!.id;
  const rt = deps.registry.get(chatId);
  const agents = listAgents(rt.cwd);
  agentCache.set(chatId, agents);
  const kb = new InlineKeyboard();
  agents.forEach((a, i) => kb.text(`\u{1F916} ${a.name}`, `agent:set:${i}`).row());
  kb.text("Default agent", "agent:default");
  const current = rt.agent || "default";
  const note = agents.length === 0 ? "\n(No custom agents found in .kiro/agents.)" : "";
  await ctx.reply(`Current agent: ${current}\nChoose an agent:${note}`, { reply_markup: kb });
}

async function showReasoningMenu(ctx: Context, deps: BotDeps): Promise<void> {
  const rt = deps.registry.get(ctx.chat!.id);
  const kb = new InlineKeyboard();
  REASONING_LEVELS.forEach((l) => kb.text(reasoningLabel(l), `reason:${l}`));
  await ctx.reply(`Current reasoning: ${reasoningLabel(rt.reasoning)}\nChoose effort:`, {
    reply_markup: kb,
  });
}

async function showModelMenu(ctx: Context, deps: BotDeps): Promise<void> {
  const rt = deps.registry.get(ctx.chat!.id);
  const kb = new InlineKeyboard().text("Reset to default", "model:clear");
  await ctx.reply(
    `Current model: ${rt.model || "default"}\n\nTo set a specific model, send:\n/model <model-id>`,
    { reply_markup: kb },
  );
}
