/**
 * Project manager — discovers candidate project directories under the
 * configured roots so the user can pick a workspace from Telegram.
 */
import { readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { createLogger } from "../logger.js";

const log = createLogger("projects");

const IGNORE = new Set([
  "node_modules",
  ".git",
  ".history",
  "dist",
  "build",
  "out",
  ".cache",
  "target",
  ".venv",
  "__pycache__",
]);

export interface ProjectEntry {
  name: string;
  path: string;
}

export class ProjectManager {
  constructor(private readonly roots: string[]) {}

  /** List immediate subdirectories of each root as selectable projects. */
  list(limit = 100): ProjectEntry[] {
    const seen = new Set<string>();
    const out: ProjectEntry[] = [];

    for (const root of this.roots) {
      // The root itself is always selectable.
      addEntry(out, seen, root);
      let children: string[];
      try {
        children = readdirSync(root);
      } catch (e) {
        log.debug(`cannot read root ${root}:`, (e as Error).message);
        continue;
      }
      for (const child of children) {
        if (IGNORE.has(child) || child.startsWith(".")) continue;
        const full = join(root, child);
        try {
          if (statSync(full).isDirectory()) addEntry(out, seen, full);
        } catch {
          /* skip unreadable */
        }
      }
    }

    out.sort((a, b) => a.name.localeCompare(b.name));
    return out.slice(0, limit);
  }

  /** Validate a path is an existing directory. */
  isDirectory(path: string): boolean {
    try {
      return statSync(path).isDirectory();
    } catch {
      return false;
    }
  }
}

function addEntry(out: ProjectEntry[], seen: Set<string>, full: string): void {
  if (seen.has(full)) return;
  seen.add(full);
  out.push({ name: basename(full) || full, path: full });
}
