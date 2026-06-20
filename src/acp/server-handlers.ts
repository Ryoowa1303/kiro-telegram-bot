/**
 * Handlers for requests the Kiro agent sends back to us (client) during a turn:
 * file reads/writes, terminal execution, and permission prompts.
 *
 * With --trust-all-tools, Kiro usually executes tools itself, but the protocol
 * still allows it to delegate fs/terminal work to the client, so we implement them.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import type { RequestPermissionParams } from "./types.js";
import { createLogger } from "../logger.js";

const log = createLogger("acp:server");

export interface ServerHandlerOptions {
  workspace: string;
  /** When true, auto-approve permission requests. */
  trustAllTools: boolean;
}

function resolveInWorkspace(p: string, workspace: string): string {
  return isAbsolute(p) ? p : join(workspace, p);
}

/**
 * Dispatch a request initiated by the agent. Returns a JSON-RPC `result`.
 * Throws on unsupported methods (caller converts to a JSON-RPC error).
 */
export async function handleServerRequest(
  method: string,
  params: Record<string, unknown>,
  opts: ServerHandlerOptions,
): Promise<unknown> {
  switch (method) {
    case "fs/readTextFile": {
      const p = resolveInWorkspace(String(params.path), opts.workspace);
      return { content: readFileSync(p, "utf-8") };
    }

    case "fs/writeTextFile": {
      const p = resolveInWorkspace(String(params.path), opts.workspace);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, String(params.content ?? ""), "utf-8");
      return { success: true };
    }

    case "terminal/execute": {
      const output = execSync(String(params.command), {
        cwd: opts.workspace,
        timeout: 60_000,
        encoding: "utf-8",
        maxBuffer: 16 * 1024 * 1024,
      });
      return { output };
    }

    case "session/request_permission": {
      return choosePermission(params as unknown as RequestPermissionParams, opts);
    }

    default:
      throw new Error(`Unsupported client method: ${method}`);
  }
}

/**
 * Auto-approve permission requests when trustAllTools is set. Prefers an
 * "allow always" option, then "allow once", else the first non-reject option.
 */
function choosePermission(
  params: RequestPermissionParams,
  opts: ServerHandlerOptions,
): unknown {
  const options = params.options || [];
  if (!opts.trustAllTools || options.length === 0) {
    const reject = options.find((o) => /reject|deny|no/i.test(o.kind || o.name || ""));
    return { outcome: { outcome: "cancelled" }, optionId: reject?.optionId };
  }
  const allowAlways = options.find((o) => /allow.*always|always/i.test(o.kind || o.name || ""));
  const allowOnce = options.find((o) => /allow|approve|yes|once/i.test(o.kind || o.name || ""));
  const chosen = allowAlways || allowOnce || options[0];
  log.debug("auto-permission ->", chosen?.name || chosen?.optionId);
  return { outcome: { outcome: "selected", optionId: chosen?.optionId } };
}
