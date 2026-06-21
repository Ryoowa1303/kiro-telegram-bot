/**
 * Shared application types: per-chat settings, reasoning levels, and the
 * prompt input model (text plus optional images) used across the bot.
 */

export const REASONING_LEVELS = ["minimal", "low", "medium", "high", "max"] as const;
export type ReasoningEffort = (typeof REASONING_LEVELS)[number];

/**
 * Model ids verified to work with Kiro's ACP `session/set_model` (an invalid id
 * is silently accepted but then breaks the next prompt, so we only offer these).
 */
export const VALID_MODELS = [
  "claude-opus-4.8",
  "claude-sonnet-4.5",
  "claude-sonnet-4",
  "claude-haiku-4.5",
] as const;

export function isValidModel(id: string | undefined): boolean {
  return !!id && (VALID_MODELS as readonly string[]).includes(id);
}

export interface ChatSettings {
  projectPath?: string;
  projectName?: string;
  sessionId?: string;
  agent?: string;
  model?: string;
  reasoning: ReasoningEffort;
  /** Telegram message id of the pinned status panel, if any. */
  statusMessageId?: number;
}

export function defaultSettings(): ChatSettings {
  return { reasoning: "medium" };
}

/** A decoded image to attach to a prompt as an ACP image content block. */
export interface PromptImage {
  data: string; // base64-encoded bytes
  mimeType: string;
}

/** A unit of work submitted to the agent: text plus optional images. */
export interface PromptInput {
  text: string;
  images: PromptImage[];
}

export function textPrompt(text: string): PromptInput {
  return { text, images: [] };
}
