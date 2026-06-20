#!/usr/bin/env node
/**
 * `kiro-tg` launcher — runs the TypeScript CLI through the tsx loader so the
 * project needs no build step.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "src", "cli.ts");

const result = spawnSync(process.execPath, ["--import", "tsx", cli, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: root,
});

process.exit(result.status ?? 0);
