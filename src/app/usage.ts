/**
 * Account info via `kiro-cli whoami`. (Kiro's full billing/quota panel isn't
 * available headlessly over ACP, so /usage shows account + live context usage.)
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface AccountInfo {
  accountType?: string;
  email?: string;
  region?: string;
  startUrl?: string;
}

export class UsageService {
  constructor(private readonly kiroCliPath: string) {}

  async account(): Promise<AccountInfo | undefined> {
    try {
      const { stdout } = await run(this.kiroCliPath, ["whoami", "--format", "json"], {
        timeout: 10_000,
        encoding: "utf-8",
      });
      const match = stdout.match(/\{[\s\S]*?\}/);
      return match ? (JSON.parse(match[0]) as AccountInfo) : undefined;
    } catch {
      return undefined;
    }
  }
}
