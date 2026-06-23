/**
 * Kiro authentication control for /reauth: `kiro-cli logout` then an interactive
 * `kiro-cli login --use-device-flow`. The device flow prints a verification URL
 * + code to stdout (no browser redirect on the bot host), which we stream back
 * to Telegram so the user can complete it on their own device.
 */
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { createLogger } from "../logger.js";

const run = promisify(execFile);
const log = createLogger("auth");

// Strip ANSI colour/cursor escapes so the Telegram transcript stays readable.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

export interface LoginResult {
  ok: boolean;
  code: number | null;
}

export class AuthService {
  constructor(private readonly kiroCliPath: string) {}

  /** Run `kiro-cli logout` (non-interactive). */
  async logout(): Promise<{ ok: boolean; out: string }> {
    try {
      const { stdout, stderr } = await run(this.kiroCliPath, ["logout"], {
        timeout: 30_000,
        encoding: "utf-8",
      });
      return { ok: true, out: clean(`${stdout}${stderr}`) };
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      const out = clean(`${err.stdout ?? ""}${err.stderr ?? ""}`) || err.message || "logout failed";
      return { ok: false, out };
    }
  }

  /**
   * Run `kiro-cli login --use-device-flow [extraArgs]`, streaming decoded output
   * to `onOutput` as it arrives (so the device code/URL reaches the user fast).
   * Resolves when the process exits or the timeout fires.
   */
  login(extraArgs: string[], onOutput: (text: string) => void, timeoutMs = 300_000): Promise<LoginResult> {
    return new Promise<LoginResult>((resolve) => {
      const args = ["login"];
      if (!extraArgs.includes("--use-device-flow")) args.push("--use-device-flow");
      args.push(...extraArgs);
      log.info(`spawning login: ${this.kiroCliPath} ${args.join(" ")}`);

      let proc;
      try {
        // stdin ignored: any interactive prompt gets EOF rather than hanging.
        proc = spawn(this.kiroCliPath, args, { stdio: ["ignore", "pipe", "pipe"] });
      } catch (e) {
        onOutput(`error: ${(e as Error).message}`);
        resolve({ ok: false, code: null });
        return;
      }

      const feed = (b: Buffer): void => {
        const t = clean(b.toString("utf-8"));
        if (t) onOutput(t);
      };
      proc.stdout.on("data", feed);
      proc.stderr.on("data", feed);

      const timer = setTimeout(() => {
        onOutput("\n\u23F1\uFE0F Timed out waiting for login to complete.");
        try {
          proc.kill();
        } catch {
          /* ignore */
        }
      }, timeoutMs);

      proc.on("error", (e) => {
        clearTimeout(timer);
        onOutput(`error: ${e.message}`);
        resolve({ ok: false, code: null });
      });
      proc.on("exit", (code) => {
        clearTimeout(timer);
        resolve({ ok: code === 0, code });
      });
    });
  }
}

function clean(s: string): string {
  return s.replace(ANSI_RE, "").replace(/\r/g, "");
}
