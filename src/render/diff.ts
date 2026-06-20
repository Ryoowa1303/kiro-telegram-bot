/**
 * Render a unified diff for a file edit as a Telegram `diff` code block.
 */
import { structuredPatch } from "diff";
import { escapeCode } from "./escape.js";

export interface DiffInput {
  path: string;
  oldText: string | null | undefined;
  newText: string | null | undefined;
  maxLines: number;
}

/**
 * Returns a MarkdownV2 ```diff code block, or an empty string when there is
 * no textual change to show.
 */
export function renderUnifiedDiff(input: DiffInput): string {
  const oldText = input.oldText ?? "";
  const newText = input.newText ?? "";
  if (oldText === newText) return "";

  const patch = structuredPatch(input.path, input.path, oldText, newText, "", "", {
    context: 3,
  });

  const lines: string[] = [];
  let added = 0;
  let removed = 0;

  for (const hunk of patch.hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
    for (const l of hunk.lines) {
      if (l.startsWith("+")) added++;
      else if (l.startsWith("-")) removed++;
      lines.push(l);
    }
  }

  if (lines.length === 0) return "";

  let truncatedNote = "";
  let shown = lines;
  if (lines.length > input.maxLines) {
    shown = lines.slice(0, input.maxLines);
    truncatedNote = `\n… (+${lines.length - input.maxLines} more lines)`;
  }

  const body = escapeCode(shown.join("\n") + truncatedNote);
  const stat = `+${added} -${removed}`;
  return "```diff\n" + body + "\n```\n" + escapeStat(stat);
}

function escapeStat(stat: string): string {
  // Used outside a code block, so escape MarkdownV2 specials in the +/- stat.
  return "_" + stat.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1") + "_";
}
