// ============================================================================
// CONNECTOR SERVICE (Python Bridge)
// Provides typed interface delegating to connectors.py.
// ============================================================================

import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { CONNECTOR_REGISTRY } from "./connector-registry.js";
import type { ConnectorDefinition, ConnectorStatus } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PY_SCRIPT = path.resolve(__dirname, "connectors.py");

function runPy(args: string[]): Promise<any> {
  return new Promise((resolve) => {
    execFile(
      "python3",
      [PY_SCRIPT, ...args],
      { timeout: 15000, env: process.env },
      (err, stdout, stderr) => {
        if (err) return resolve({ error: err.message || stderr || "Execution error" });
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          resolve({ raw: stdout.trim() });
        }
      }
    );
  });
}

export const ConnectorService = {
  getRegistry(): ConnectorDefinition[] {
    return CONNECTOR_REGISTRY;
  },

  getConnectorById(id: string): ConnectorDefinition | undefined {
    return CONNECTOR_REGISTRY.find((c) => c.id === id);
  },

  async getStatuses(): Promise<ConnectorStatus[]> {
    const res = await runPy(["statuses"]);
    return Array.isArray(res) ? res : [];
  },

  async getStatus(id: string): Promise<ConnectorStatus> {
    const res = await runPy(["status", id]);
    return res && res.id ? res : { id, connected: false };
  },

  async getOAuthUrl(connectorId: string, callbackUrl: string): Promise<string | null> {
    const res = await runPy(["auth_url", connectorId, callbackUrl]);
    return res?.authUrl || null;
  },

  async handleOAuthCallback(connectorId: string, code: string, callbackUrl: string): Promise<{ success: boolean; error?: string }> {
    return await runPy(["callback", connectorId, code, callbackUrl]);
  },

  async disconnect(connectorId: string): Promise<boolean> {
    const res = await runPy(["disconnect", connectorId]);
    return !!res?.success;
  },

  async callTool(toolName: string, args: Record<string, any> = {}): Promise<any> {
    return await runPy(["call", toolName, JSON.stringify(args)]);
  },
};

export default ConnectorService;
