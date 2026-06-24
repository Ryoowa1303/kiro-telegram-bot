/**
 * Parse the (noisy) stdout of `kiro-cli login --use-device-flow` into the few
 * stable fields worth showing: the verification URL, the device code, and
 * whether login completed.
 *
 * The CLI animates a spinner ("▰▱▱… Logging in…") by rewriting one terminal
 * line with carriage returns. With stdio piped the `\r`s are stripped, so those
 * frames pile up into one long string ("▰▱▱… Logging in…▰▰▱… Logging in…"). We
 * discard that noise and surface only meaningful values, which the bot renders
 * on a single, self-animated status line instead of echoing every frame.
 */

/** Block/braille glyphs the CLI uses to draw progress bars / spinners. */
const BAR_CHARS = "▰▱▮▯■□▪▫●○◐◓◑◒⣾⣽⣻⢿⡿⣟⣯⣷⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
const BAR_CLASS = `[${BAR_CHARS}]`;

export interface DeviceFlow {
  /** Verification URL, if the CLI printed one. */
  url?: string;
  /** Device/user code (e.g. `VKKH-PPMX`), if present. */
  code?: string;
  /** True once the CLI reports a completed login. */
  loggedIn: boolean;
  /** A short error line, if the output looks like a failure. */
  error?: string;
}

/** Remove spinner frames, repeated "Logging in…" and stray bar glyphs. */
export function stripSpinner(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .replace(new RegExp(`${BAR_CLASS}+\\s*Logging in[.\\u2026]*`, "gi"), "")
    .replace(/Logging in[.\u2026]*/gi, "")
    .replace(new RegExp(`${BAR_CLASS}+`, "g"), "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const ERROR_RE = /error|failed|denied|expired|invalid|unable|timed out/i;

export function parseDeviceFlow(raw: string): DeviceFlow {
  const text = stripSpinner(raw);

  // Collect every URL, then prefer the device-verification one (it embeds the
  // user code, so it's directly clickable). `firstUrl` guards against two URLs
  // run together with no separator (terminal echo), which would otherwise be
  // matched as one giant token.
  const urls = (text.match(/https?:\/\/[^\s'"<>)\]]+/gi) ?? []).map(firstUrl);
  const url = urls.find((u) => /user_code=|\/device/i.test(u)) ?? urls[0];

  // Prefer the unambiguous XXXX-XXXX shape; fall back to a "Code:" label.
  const code =
    text.match(/\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/)?.[0] ??
    text.match(/Code[:\s]+([A-Z0-9][A-Z0-9-]{3,})/)?.[1];

  const loggedIn = /logged in|login successful|successfully logged in/i.test(text);

  const error =
    !loggedIn && ERROR_RE.test(text)
      ? text
          .split("\n")
          .map((l) => l.trim())
          .reverse()
          .find((l) => ERROR_RE.test(l))
      : undefined;

  return { url, code, loggedIn, error };
}

/** Trim a token that accidentally contains two concatenated URLs down to the
 *  first one (e.g. "https://x/starthttps://x/start" → "https://x/start"). */
function firstUrl(u: string): string {
  const second = u.indexOf("http", 4);
  return second > 0 ? u.slice(0, second) : u;
}
