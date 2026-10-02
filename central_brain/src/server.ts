import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load workspace environment variables
dotenv.config();

import { 
  db, 
  getAllLedgerRecords, 
  getLedgerRecordById, 
  updateLedgerSummary, 
  getAllRegisteredAgents, 
  getCircuitBreaker, 
  setCircuitBreaker, 
  getGlobalMetrics,
  purgeLedgerRecordCascade
} from './core/db.js';
import { buildCentralBrainGraph } from './core/brain_graph.js';
import { discoverAgentRuntimes } from './core/agent_discovery.js';
import { adapterManager } from './adapters/adapter_manager.js';
import { syncMasterIndexFiles } from './core/master_index_sync.js';
import { normalizeBrowserPayload } from './adapters/browser_adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  path: '/stream',
  verifyClient: ({ req }, done) => {
    if (isAuthorizedRequest(req)) done(true);
    else done(false, 401, 'Authentication required');
  }
});

const PORT = Number(process.env.CENTRAL_BRAIN_PORT) || 8200;
const BIND_HOST = process.env.CENTRAL_BRAIN_HOST || '127.0.0.1';
const API_TOKEN = process.env.JARVIS_API_TOKEN?.trim() || '';
const ALLOWED_ORIGINS = new Set(
  (process.env.CENTRAL_BRAIN_CORS_ORIGINS || 'http://127.0.0.1:8200,http://localhost:8200,http://127.0.0.1:3000,http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

function isLoopbackAddress(address?: string): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function isAuthorizedRequest(req: any): boolean {
  if (isLoopbackAddress(req.socket?.remoteAddress)) return true;
  if (!API_TOKEN) return false;
  const bearer = String(req.headers.authorization || '');
  const headerToken = String(req.headers['x-jarvis-api-token'] || '');
  return bearer === `Bearer ${API_TOKEN}` || headerToken === API_TOKEN;
}

if (!['127.0.0.1', 'localhost', '::1'].includes(BIND_HOST) && !API_TOKEN) {
  throw new Error('JARVIS_API_TOKEN must be configured before binding Central Brain to a non-loopback host.');
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by Central Brain CORS policy'));
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  if (isAuthorizedRequest(req)) return next();
  res.status(401).json({ error: 'Authentication required. Use a loopback client or provide JARVIS_API_TOKEN.' });
});

// Active WebSocket connections pool
const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  clients.add(ws);

  // Send initial state upon connection
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    data: {
      metrics: getGlobalMetrics(),
      agents: getAllRegisteredAgents(),
      circuitBreaker: getCircuitBreaker(),
      recentLogs: getAllLedgerRecords().slice(0, 10)
    },
    timestamp: new Date().toISOString()
  }));

  ws.on('close', () => clients.delete(ws));
});

function broadcast(type: string, data: any) {
  const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Hook adapter manager into WebSocket broadcast feed
adapterManager.setBroadcaster((type, data) => {
  broadcast(type, data);
});

// --- REST API ROUTES ---

// 1. Agent Discovery & Status
app.get('/api/agents', (req, res) => {
  const agents = getAllRegisteredAgents();
  res.json({ success: true, count: agents.length, agents });
});

app.post('/api/agents/scan', (req, res) => {
  const agents = discoverAgentRuntimes();
  broadcast('AGENTS_DISCOVERED', agents);
  res.json({ success: true, count: agents.length, agents });
});

// 2. Memory Ledger Queries
app.get('/api/ledger', (req, res) => {
  const records = getAllLedgerRecords();
  res.json({ success: true, count: records.length, records });
});

app.get('/api/sessions', (req, res) => {
  const records = getAllLedgerRecords();
  res.json({ success: true, count: records.length, sessions: records });
});

app.get('/api/ledger/:id', (req, res) => {
  const record = getLedgerRecordById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json({ success: true, record });
});

app.put('/api/ledger/:id', (req, res) => {
  const { summary } = req.body;
  if (!summary) return res.status(400).json({ error: 'Summary is required' });

  const success = updateLedgerSummary(req.params.id, summary);
  if (success) {
    syncMasterIndexFiles();
    broadcast('LEDGER_UPDATED', { id: req.params.id, summary });
    return res.json({ success: true, message: 'Summary updated successfully' });
  }
  res.status(404).json({ error: 'Record not found' });
});

// 3. System Metrics & Status
app.get('/api/metrics', (req, res) => {
  const metrics = getGlobalMetrics();
  res.json({ success: true, metrics });
});

// 4. Circuit Breaker Controls
app.get('/api/circuit-breaker', (req, res) => {
  const breaker = getCircuitBreaker();
  res.json({ success: true, circuitBreaker: breaker });
});

app.post('/api/circuit-breaker/toggle', (req, res) => {
  const current = getCircuitBreaker();
  const nextStatus = current.status === 'STANDBY' ? 'ACTIVE' : 'STANDBY';
  const updated = setCircuitBreaker(nextStatus, `User toggled via Central Brain Console`);

  broadcast('CIRCUIT_BREAKER_UPDATED', updated);
  res.json({ success: true, circuitBreaker: updated });
});

// 5. Generic Event Ingestion
app.post('/api/ingest', async (req, res) => {
  const { agentId, sessionId, payload, sourcePath, metadata } = req.body;
  if (!payload) return res.status(400).json({ error: 'Payload is required' });

  const rawEvent = {
    id: crypto.randomUUID(),
    agentId: agentId || 'External_Tool',
    sessionId: sessionId || `session_${Date.now()}`,
    timestamp: new Date().toISOString(),
    payload,
    sourcePath: sourcePath || 'api_ingest',
    metadata
  };

  const result = await adapterManager.ingestEvent(rawEvent);
  res.json({ status: 'INGESTED', result });
});

// ==============================================================================
// FIXTURE A: BROWSER INGESTION GATEWAY & CASCADE PURGE
// ==============================================================================

// FIX: Add Browser HTTP Ingestion Gateway matching Context Spec
app.post('/api/ingest/browser', async (req, res) => {
  const { url, title, selectedText, rawSessionText } = req.body;
  const graph = buildCentralBrainGraph();

  const rawEvent = {
    id: crypto.randomUUID(),
    agentId: 'browser-extension',
    sessionId: crypto.createHash('md5').update(url || 'default').digest('hex').slice(0, 12),
    timestamp: new Date().toISOString(),
    payload: `[Browser Tab: ${title || 'Untitled'}] URL: ${url || 'unknown'}\nContent: ${selectedText || rawSessionText || ''}`,
    sourcePath: 'network_gateway'
  };

  broadcast('EVENT_INGESTED', {
    agentId: rawEvent.agentId,
    sessionId: rawEvent.sessionId,
    timestamp: rawEvent.timestamp,
    preview: rawEvent.payload.slice(0, 140)
  });

  await graph.invoke({
    rawEvent,
    auditPassed: false,
    circuitBreakerOpen: false,
    errors: []
  });

  res.json({ status: 'INGESTED' });
});

// FIX: Cascade Purge must clear both Ledger and Deduplication Hashes
app.delete('/api/ledger/purge/:id', (req, res) => {
  const { id } = req.params;
  
  // 1. Fetch entry to trace the original payload hash before dropping
  const targetRecord = db.prepare("SELECT id, summary, event_hash FROM brain_ledger WHERE id = ?").get(id) as { id: string; summary: string; event_hash?: string } | undefined;
  
  if (!targetRecord) {
    return res.status(404).json({ error: "Memory index cell not found." });
  }

  const transaction = db.transaction(() => {
    // 2. Erase ledger record
    db.prepare("DELETE FROM brain_ledger WHERE id = ?").run(id);
    
    // 3. Clear dedup mapping so this event pattern can be legally parsed/re-ingested if needed
    if (targetRecord.event_hash) {
      db.prepare("DELETE FROM event_dedup WHERE hash = ?").run(targetRecord.event_hash);
    }
    db.prepare("DELETE FROM event_dedup WHERE event_id = ?").run(id);
  });
  
  transaction();

  // 4. Atomically synchronize master index files
  syncMasterIndexFiles();

  broadcast('RECORD_PURGED', { id, summary: targetRecord.summary });
  res.json({ success: true, message: `Cascaded runtime memory cell and token fingerprints cleared.` });
});

// Alias for /api/sessions/:id DELETE
app.delete('/api/sessions/:id', (req, res) => {
  const { id } = req.params;
  const result = purgeLedgerRecordCascade(id);
  if (!result.success) {
    return res.status(404).json({ error: 'Session not found' });
  }
  syncMasterIndexFiles();
  broadcast('RECORD_PURGED', { id });
  res.json({ success: true, message: 'Session purged successfully' });
});

// Serve frontend static distribution if built
const FRONTEND_DIST = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// Start server
server.listen(PORT, BIND_HOST, async () => {
  console.log(`=======================================================`);
  console.log(`🧠 [CENTRAL BRAIN] Multi-Agent Platform Running`);
  console.log(`📡 HTTP & Telemetry WS: http://${BIND_HOST}:${PORT}`);
  console.log(`🛡️ Circuit Breaker:     ${getCircuitBreaker().status}`);
  console.log(`=======================================================`);

  // Start autonomous discovery and adapters
  await adapterManager.startAll();
  syncMasterIndexFiles();
});

export { app, server };
