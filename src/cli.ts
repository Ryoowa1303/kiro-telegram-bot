/**
 * Command-line interface for the Kiro Telegram Bot.
 *
 *   kiro-tg run         Run in the foreground (same as `npm start`)
 *   kiro-tg install     Install as a background service that starts on boot
 *   kiro-tg uninstall   Remove the background service
 *   kiro-tg start|stop|restart|status
 *   kiro-tg logs [n]    Show the last n log lines (default 100)
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PROJECT_ROOT } from "./config.js";
import { buildLaunchSpec, getController } from "./service/index.js";

const HELP = `Kiro Telegram Bot — CLI

Usage: kiro-tg <command>

  run                 Run in the foreground
  install             Install + start a background service (autostart on boot)
  uninstall           Stop + remove the background service
  start               Start the service
  stop                Stop the service
  restart             Restart the service
  status              Show install + running status
  logs [n]            Show the last n log lines (default 100)
  help                Show this help
`;

async function main(): Promise<void> {
  const [cmd, arg] = process.argv.slice(2);

  switch (cmd) {
    case "run":
    case undefined:
      await import("./index.js");
      return;

    case "install": {
      preflight();
      const r = await getController().install(buildLaunchSpec());
      console.log(r.ok ? `✓ ${r.message}` : `✗ ${r.message}`);
      if (r.ok) console.log("\nManage it with: kiro-tg status | stop | restart | logs");
      process.exit(r.ok ? 0 : 1);
      break;
    }

    case "uninstall":
    case "start":
    case "stop":
    case "restart":
    case "status": {
      const ctrl = getController();
      const spec = buildLaunchSpec();
      let result;
      if (cmd === "restart") {
        await ctrl.stop(spec);
        result = await ctrl.start(spec);
      } else {
        result = await ctrl[cmd](spec);
      }
      console.log(result.ok ? result.message : `✗ ${result.message}`);
      process.exit(result.ok ? 0 : 1);
      break;
    }

    case "logs":
      printLogs(arg ? Number(arg) || 100 : 100);
      break;

    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      break;

    default:
      console.error(`Unknown command: ${cmd}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

function preflight(): void {
  const envPath = join(PROJECT_ROOT, ".env");
  if (!existsSync(envPath)) {
    console.warn("⚠ No .env found. Run `npm run setup` and set TELEGRAM_BOT_TOKEN first.");
    return;
  }
  const env = readFileSync(envPath, "utf-8");
  if (!/^TELEGRAM_BOT_TOKEN=.+/m.test(env)) {
    console.warn("⚠ TELEGRAM_BOT_TOKEN is not set in .env — the service will fail to start.");
  }
}

function printLogs(n: number): void {
  const file = buildLaunchSpec().logFile;
  if (!existsSync(file)) {
    console.log(`No log file yet at ${file}`);
    return;
  }
  const lines = readFileSync(file, "utf-8").split("\n");
  console.log(lines.slice(-n).join("\n"));
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
