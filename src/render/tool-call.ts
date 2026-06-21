/**
 * Format ACP tool-call updates into clear, RAW markdown blocks so they read
 * distinctly from the agent's prose and thinking. Commands appear in a `bash`
 * block, file edits as a `diff` block.
 */
import type { SessionUpdate, ToolCallContent } from "../acp/types.js";
import { renderUnifiedDiff } from "./diff.js";

const KIND_ICON: Record<string, string> = {
  read: "\u{1F4D6}",
  edit: "\u270F\uFE0F",
  execute: "\u{1F4BB}",
  search: "\u{1F50E}",
  delete: "\u{1F5D1}\uFE0F",
  move: "\u{1F4E6}",
  fetch: "\u{1F310}",
  think: "\u{1F4AD}",
  other: "\u{1F527}",
};

const STATUS_ICON: Record<string, string> = {
  pending: "",
  in_progress: "\u23F3",
  completed: "\u2705",
  failed: "\u274C",
};

export interface ToolFormatOptions {
  showDiffs: boolean;
  diffMaxLines: number;
}

/** Returns a RAW markdown block describing the tool call, or "" to skip. */
export function formatToolCall(u: SessionUpdate, opts: ToolFormatOptions): string {
  const kind = (u.kind || "other").toLowerCase();
  const icon = KIND_ICON[kind] ?? KIND_ICON.other;
  const status = u.status ? (STATUS_ICON[u.status] ?? "") : "";
  const raw = (u.rawInput || {}) as Record<string, unknown>;
  const title = u.title || titleFromRaw(kind, raw);

  let out = `${icon} **${title}**${status ? ` ${status}` : ""}`;

  if (kind === "execute") {
    const cmd = strOf(raw.command ?? raw.cmd);
    if (cmd) out += "\n```bash\n" + cmd + "\n```";
  }

  if (kind === "edit" && opts.showDiffs) {
    const diff = buildEditDiff(u, raw, opts.diffMaxLines);
    if (diff && diff.block) {
      const stat = `${diff.added > 0 ? "+" + diff.added : ""}${diff.removed > 0 ? " -" + diff.removed : ""}`.trim();
      out += `${stat ? `  (${stat})` : ""}\n${diff.block}`;
    }
  }

  return out;
}

function buildEditDiff(u: SessionUpdate, raw: Record<string, unknown>, maxLines: number) {
  const blocks = collectContent(u);
  const diffBlock = blocks.find((b) => b.type === "diff");
  if (diffBlock) {
    return renderUnifiedDiff({
      path: strOf(diffBlock.path) || strOf(raw.path) || "file",
      oldText: typeof diffBlock.oldText === "string" ? diffBlock.oldText : "",
      newText: typeof diffBlock.newText === "string" ? diffBlock.newText : "",
      maxLines,
    });
  }
  const oldStr = strOf(raw.old_str ?? raw.oldStr);
  const newStr = strOf(raw.new_str ?? raw.newStr);
  if (oldStr || newStr) {
    return renderUnifiedDiff({ path: strOf(raw.path) || "file", oldText: oldStr, newText: newStr, maxLines });
  }
  const content = strOf(raw.file_text ?? raw.content ?? raw.text);
  if (content) {
    return renderUnifiedDiff({ path: strOf(raw.path) || "file", oldText: "", newText: content, maxLines });
  }
  return undefined;
}

function titleFromRaw(kind: string, raw: Record<string, unknown>): string {
  const path = strOf(raw.path ?? raw.file_path ?? raw.filename);
  if (path) return `${capitalize(kind)} ${path}`;
  return capitalize(kind);
}

function collectContent(u: SessionUpdate): ToolCallContent[] {
  const out: ToolCallContent[] = [];
  if (Array.isArray(u.content_blocks)) out.push(...u.content_blocks);
  const content = (u as unknown as { content?: unknown }).content;
  if (Array.isArray(content)) out.push(...(content as ToolCallContent[]));
  return out;
}

function strOf(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function capitalize(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}
