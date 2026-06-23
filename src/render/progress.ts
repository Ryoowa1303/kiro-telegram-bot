/**
 * Task-progress support: parse the `{progress: N%}` marker the agent appends to
 * its messages, strip it from the visible text, and render a green loading bar.
 *
 * The agent is asked (see PROGRESS_DIRECTIVE) to end each message with a marker
 * like `{progress: 65%}`. The bot extracts the latest value, removes the marker
 * so it never shows raw, and renders a 0–100% bar (filled = 🟩, empty = ⬜) on
 * the live message, in session cards, and in the pinned status panel.
 */

/** Matches a complete marker: `{progress: 65%}`, `{ progress:65 }`, etc. */
const PROGRESS_RE = /\{\s*progress\s*:\s*(\d{1,3})\s*%?\s*\}/gi;
/** Matches a trailing, not-yet-closed marker mid-stream (e.g. `…{progress: 6`). */
const PARTIAL_TAIL_RE = /\{\s*progress\b[^}]*$/i;

const FILLED = "\u{1F7E9}"; // 🟩
const EMPTY = "\u2B1C"; // ⬜
const SEGMENTS = 10;

/** The instruction appended to prompts so the agent emits a progress marker. */
export const PROGRESS_DIRECTIVE =
  "On the very last line of every message you send, append your overall task-completion " +
  "estimate in EXACTLY this format and write nothing after it: {progress: N%} \u2014 where N " +
  "is an integer from 0 to 100 (use 100 only when the task is fully complete). This marker is " +
  "parsed and removed by the client and shown to the user as a progress bar.";

export interface ProgressExtract {
  /** Latest progress value found (0–100), or undefined if none. */
  value?: number;
  /** The input text with all progress markers removed. */
  cleaned: string;
}

/** Pull the latest `{progress: N%}` value out of `text` and strip every marker
 *  (plus any trailing half-streamed marker so it never flashes raw). */
export function extractProgress(text: string): ProgressExtract {
  let value: number | undefined;
  let cleaned = text.replace(PROGRESS_RE, (_m, digits: string) => {
    const v = Math.max(0, Math.min(100, Number.parseInt(digits, 10)));
    if (Number.isFinite(v)) value = v; // keep the LAST occurrence (most recent)
    return "";
  });
  cleaned = cleaned.replace(PARTIAL_TAIL_RE, "");
  return { value, cleaned: tidy(cleaned) };
}

/** Tidy whitespace left behind by a removed marker. */
function tidy(s: string): string {
  return s
    .replace(/[ \t]+\n/g, "\n") // trailing spaces on lines
    .replace(/\n{3,}/g, "\n\n") // collapse blank-line runs
    .replace(/\s+$/g, ""); // trailing whitespace/newlines
}

/** A 10-segment green progress bar, e.g. `🟩🟩🟩🟩🟩⬜⬜⬜⬜⬜ 50%` (✅ at 100%). */
export function progressBar(pct: number): string {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  const filled = Math.round((v / 100) * SEGMENTS);
  const bar = FILLED.repeat(filled) + EMPTY.repeat(SEGMENTS - filled);
  return `${bar} ${v}%${v >= 100 ? " \u2705" : ""}`;
}
