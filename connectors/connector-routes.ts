// ============================================================================
// CONNECTOR HTTP ROUTES (Python Bridge)
// Express endpoints for UI federation backed by connectors.py engine.
// ============================================================================

import { Router } from "express";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PY_SCRIPT = path.resolve(__dirname, "connectors.py");

export const connectorRouter = Router();

function runConnectorPython(args: string[]): Promise<any> {
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

/**
 * GET /api/connectors
 * Returns all connector definitions with live status.
 */
connectorRouter.get("/api/connectors", async (_req, res) => {
  const result = await runConnectorPython(["list"]);
  res.json(result);
});

/**
 * GET /api/connectors/status/all
 * Fast polling endpoint returning only statuses.
 */
connectorRouter.get("/api/connectors/status/all", async (_req, res) => {
  const result = await runConnectorPython(["statuses"]);
  res.json(result);
});

/**
 * GET /api/connectors/:id
 * Single connector status with definition.
 */
connectorRouter.get("/api/connectors/:id", async (req, res) => {
  const list = await runConnectorPython(["list"]);
  if (Array.isArray(list)) {
    const conn = list.find((c: any) => c.id === req.params.id);
    if (conn) return res.json(conn);
  }
  res.status(404).json({ error: "Connector not found" });
});

/**
 * POST /api/connectors/:id/auth
 * Generates OAuth redirect URL.
 */
connectorRouter.post("/api/connectors/:id/auth", async (req, res) => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers.host || "localhost:3000";
  const callbackUrl = `${protocol}://${host}/api/connectors/callback`;

  const result = await runConnectorPython(["auth_url", req.params.id, callbackUrl]);
  if (result.error) {
    return res.status(400).json(result);
  }
  res.json(result);
});

/**
 * GET /api/connectors/callback
 * OAuth callback handler redirecting back to UI.
 */
connectorRouter.get("/api/connectors/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) {
    return res.redirect(`/?connector_error=${encodeURIComponent(String(error))}`);
  }
  if (!code || !state) {
    return res.status(400).json({ error: "Missing code or state parameter" });
  }

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers.host || "localhost:3000";
  const callbackUrl = `${protocol}://${host}/api/connectors/callback`;

  const result = await runConnectorPython(["callback", String(state), String(code), callbackUrl]);
  if (result.success) {
    res.redirect(`/?connector_connected=${encodeURIComponent(String(state))}`);
  } else {
    res.redirect(`/?connector_error=${encodeURIComponent(result.error || "OAuth failed")}`);
  }
});

/**
 * POST /api/connectors/:id/disconnect
 * Disconnects connector and revokes credentials.
 */
connectorRouter.post("/api/connectors/:id/disconnect", async (req, res) => {
  const result = await runConnectorPython(["disconnect", req.params.id]);
  res.json(result);
});

/**
 * POST /api/connectors/call
 * Direct HTTP execution for tools.
 */
connectorRouter.post("/api/connectors/call", async (req, res) => {
  const { tool, args } = req.body;
  if (!tool) {
    return res.status(400).json({ error: "Tool name required" });
  }
  const result = await runConnectorPython(["call", tool, JSON.stringify(args || {})]);
  res.json(result);
});

export default connectorRouter;
