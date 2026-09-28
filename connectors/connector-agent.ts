// ============================================================================
// CONNECTOR AGENT / DISPATCHER (Python Bridge)
// Dispatches Gemini Live tool calls to connectors.py.
// ============================================================================

import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { CONNECTOR_REGISTRY } from "./connector-registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PY_SCRIPT = path.resolve(__dirname, "connectors.py");

export const CONNECTOR_TOOL_NAMES = [
  "search_emails",
  "read_email",
  "send_email",
  "create_draft",
  "list_labels",
  "list_events",
  "create_event",
  "update_event",
  "delete_event",
  "find_free_time",
  "list_tasks",
  "create_task",
  "complete_google_task",
  "create_document",
  "get_document",
  "append_document_text",
  "create_presentation",
  "get_presentation",
  "add_slide",
  "list_drive_files",
  "get_drive_file",
  "list_repos",
  "search_issues",
  "get_pull_request",
  "create_issue",
  "list_notifications",
];

export function getConnectorToolNames(): string[] {
  return CONNECTOR_TOOL_NAMES;
}

export function isConnectorTool(toolName: string): boolean {
  return CONNECTOR_TOOL_NAMES.includes(toolName);
}

export function getConnectorToolDeclarations(): any[] {
  return CONNECTOR_REGISTRY.flatMap((c) =>
    c.tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters || { type: "object", properties: {} },
    }))
  );
}

export function dispatchConnectorTool(
  toolName: string,
  args: Record<string, any> = {}
): Promise<any> {
  return new Promise((resolve) => {
    execFile(
      "python3",
      [PY_SCRIPT, "call", toolName, JSON.stringify(args || {})],
      { timeout: 20000, env: process.env },
      (err, stdout, stderr) => {
        if (err) {
          console.warn(`[Connector Agent] Execution error for '${toolName}':`, err.message);
          return resolve({ error: err.message || stderr || "Execution failed" });
        }
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          resolve({ raw: stdout.trim() });
        }
      }
    );
  });
}
