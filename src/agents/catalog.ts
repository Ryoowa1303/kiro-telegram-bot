/**
 * Discover Kiro custom agents from disk: the global ~/.kiro/agents and the
 * selected project's .kiro/agents directory.
 */
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { createLogger } from "../logger.js";

const log = createLogger("agents");

export interface AgentInfo {
  name: string;
  description?: string;
  scope: "project" | "global";
}

export function listAgents(projectPath?: string): AgentInfo[] {
  const found = new Map<string, AgentInfo>();
  if (projectPath) scan(join(projectPath, ".kiro", "agents"), "project", found);
  scan(join(homedir(), ".kiro", "agents"), "global", found);
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function scan(dir: string, scope: "project" | "global", out: Map<string, AgentInfo>): void {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return;
  }
  for (const file of files) {
    const name = basename(file, ".json");
    if (out.has(name)) continue;
    let description: string | undefined;
    try {
      const json = JSON.parse(readFileSync(join(dir, file), "utf-8")) as { description?: string };
      description = json.description;
    } catch (e) {
      log.debug(`skip ${file}:`, (e as Error).message);
    }
    out.set(name, { name, description, scope });
  }
}
