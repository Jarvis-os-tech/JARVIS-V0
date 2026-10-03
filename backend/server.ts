import express from 'express';
import http from 'http';
import path from 'path';
import { exec, execFile } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { getSystemControlDeclarations, dispatchSystemControl, isSystemControl } from './system_modules/intelligent_system/system_controls';
import { groqFastActuator } from './system_modules/intelligent_system/groq_fast_actuator';
import { dualPathOrchestrator } from './system_modules/intelligent_system/dual_path_orchestrator';
import { autonomousOrchestrator } from './system_modules/intelligent_system/autonomous_orchestrator';
import { autonomousEngine } from './system_modules/intelligent_system/autonomous_engine';
import { experienceLearner } from './system_modules/intelligent_system/experience_learner';
import { omarchyQuattro } from './system_modules/intelligent_system/omarchy_quattro_core';
import { selfRepairEngine } from './system_modules/intelligent_system/self_repair';
import { internetKnowledgeGatherer } from './system_modules/intelligent_system/internet_knowledge_gatherer';
import { formatSystemEnvironmentPrompt } from './system_modules/intelligent_system/system_environment';
import { continuousExecutionQueue } from './system_modules/intelligent_system/continuous_execution_queue';
import { evaluationHarness } from './system_modules/intelligent_system/evaluation_harness';
import {
  fileFunctionDeclarations,
  handleWriteFile,
  handleAppendFile,
  handleRewriteFile,
  handleRemoveFile,
  handleReadFile,
  handleListDirectory
} from './system_modules/intelligent_system/file_controls';
import connectorRoutes from '../connectors/connector-routes';
import { isConnectorTool, dispatchConnectorTool, getConnectorToolDeclarations } from '../connectors/connector-agent';
import {
  scanAndIndexSkills,
  installSkills,
  loadSkillContent,
  executeSkillScript,
  removeSkill,
  getSkillsPromptContext
} from './skills_manager';
import {
  dispatchCeoTool,
  loadAgentRoster,
  loadMasterSessionIndex,
  findAgentSessions,
  executeCeoMission,
  prescribeWorkflow
} from './system_modules/ceo/index';
import { openShellRuntime } from './system_modules/intelligent_system/openshell_runtime';
import { openShellPolicyEngine } from './system_modules/intelligent_system/openshell_policy';

// ─── Agent Space: CLI/IDE/Web Agent Orchestration ─────────────────────────
import { cliAgentRegistry } from './system_modules/intelligent_system/cli_agent_registry';
import { cliAgentBridge } from './system_modules/intelligent_system/cli_agent_bridge';
import { agentSessionManager } from './system_modules/intelligent_system/agent_session_manager';
import { a2aHub } from './system_modules/intelligent_system/a2a_hub';
import { cliSupervisorLoop } from './system_modules/intelligent_system/cli_supervisor_loop';
import { parallelAgentOrchestrator } from './system_modules/intelligent_system/parallel_agent_orchestrator';
import { tmuxSessionBus } from './system_modules/intelligent_system/tmux_session_bus';

import { parallelTaskManager } from './parallel_task_manager';
import { generateLaunchBriefing } from './system_modules/intelligent_system/launch_briefing';
import {
  execHermes,
  checkHermesHealth,
  getHermesMemories,
  syncHermesMemories,
  getHermesToolDeclarations,
  getHermesPromptDirective
} from './hermes_bridge';

const OPERATOR_NAME = process.env.OPERATOR_NAME || (process.env.USER ? `Operator ${process.env.USER}` : 'Operator');

const MEMORY_BRIDGE_SCRIPT = [
  path.resolve(__dirname, 'memory_bridge.py'),
  path.resolve(__dirname, '../backend/memory_bridge.py'),
  path.resolve(process.cwd(), 'backend/memory_bridge.py')
].find(p => fs.existsSync(p)) || path.resolve(__dirname, 'memory_bridge.py');

function runMemoryBridge(args: string[]): Promise<any> {
  return new Promise((resolve) => {
    execFile('python3', [MEMORY_BRIDGE_SCRIPT, ...args], { timeout: 15000, env: process.env }, (err, stdout) => {
      if (err) {
        console.warn('[Memory Bridge Warning]', err.message);
        return resolve({ error: err.message });
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (parseErr) {
        resolve({ error: 'Failed to parse memory output' });
      }
    });
  });
}

const PORT = Number(process.env.PORT) || 3000;
const BIND_HOST = process.env.JARVIS_HOST || '127.0.0.1';
const API_TOKEN = process.env.JARVIS_API_TOKEN?.trim() || '';

function isLoopbackAddress(address?: string): boolean {
  if (!address) return false;
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function isAuthorizedRequest(req: { headers: Record<string, any>; socket: { remoteAddress?: string } }): boolean {
  // Desktop clients are intentionally loopback-only by default. A token is
  // required for non-loopback clients when the host is exposed remotely.
  if (isLoopbackAddress(req.socket.remoteAddress)) return true;
  if (!API_TOKEN) return false;
  const bearer = String(req.headers.authorization || '');
  const headerToken = String(req.headers['x-jarvis-api-token'] || '');
  return bearer === `Bearer ${API_TOKEN}` || headerToken === API_TOKEN;
}

function requireApiAuth(req: any, res: any, next: any) {
  if (req.path === '/health') return next();
  if (isAuthorizedRequest(req)) return next();
  res.status(401).json({ error: 'Authentication required. Use a loopback client or provide JARVIS_API_TOKEN.' });
}

if (!['127.0.0.1', 'localhost', '::1'].includes(BIND_HOST) && !API_TOKEN) {
  throw new Error('JARVIS_API_TOKEN must be configured before binding J.A.R.V.I.S. to a non-loopback host.');
}

function autoLaunchBrowser(url: string) {
  if (process.env.AUTO_LAUNCH === 'false' || process.env.CI === 'true') {
    return;
  }

  const platform = process.platform;
  let command = '';

  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`[AutoLaunch] Notice: Could not automatically open browser (${error.message}). Please navigate to ${url}`);
    } else {
      console.log(`[AutoLaunch] Launched browser at ${url}`);
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', requireApiAuth);
  app.use('/.well-known/agent.json', requireApiAuth);

  // Initialize NVIDIA OpenShell Security Runtime
  try {
    const secInit = await openShellRuntime.initialize();
    console.log(`[OpenShell Security] ${secInit.message} (Mode: ${secInit.mode})`);
  } catch (secErr: any) {
    console.warn(`[OpenShell Security] Initialization notice: ${secErr.message}`);
  }

  // PWA Support: Headers for Service Worker and Manifest
  app.use((req, res, next) => {
    if (req.path === '/sw.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
    } else if (req.path === '/manifest.webmanifest' || req.path === '/manifest.json') {
      res.setHeader('Content-Type', 'application/manifest+json');
    }
    next();
  });

  const server = http.createServer(app);

  const getAi = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment');
    }
    return new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  };

  // Health check API with API key diagnostic information
  app.get('/api/health', (req, res) => {
    const key = process.env.GEMINI_API_KEY || '';
    const isConfigured = !!key && key !== 'MY_GEMINI_API_KEY';

    res.json({
      status: 'ok',
      hasApiKey: isConfigured,
      timestamp: new Date().toISOString()
    });
  });

  // Sovereign Memory REST Endpoints
  app.get('/api/memory/status', async (_req, res) => {
    const data = await runMemoryBridge(['status']);
    res.json(data);
  });

  app.get('/api/memory/context', async (req, res) => {
    const agentId = (req.query.agentId as string) || 'jarvis-prime';
    const data = await runMemoryBridge(['context', agentId]);
    res.json(data);
  });

  app.get('/api/memory/turns', async (req, res) => {
    const limit = (req.query.limit as string) || '25';
    const data = await runMemoryBridge(['turns', limit]);
    res.json(data);
  });

  app.post('/api/memory/log', async (req, res) => {
    const data = await runMemoryBridge(['log_turn', JSON.stringify(req.body)]);
    res.json(data);
  });

  app.post('/api/memory/search', async (req, res) => {
    const query = req.body.query || '';
    const limit = String(req.body.limit || 10);
    const data = await runMemoryBridge(['search', query, limit]);
    res.json(data);
  });

  // J.A.R.V.I.S. Multi-Agent Dual-Path Status Endpoint
  app.get('/api/orchestrator/status', (_req, res) => {
    res.json({
      status: 'nominal',
      timestamp: new Date().toISOString(),
      orchestrator: 'active',
      activeProviders: {
        googleGemini: !!process.env.GEMINI_API_KEY,
        groq: !!process.env.GROQ_API_KEY,
        nvidiaNim: !!process.env.NVIDIA_API_KEY,
        omniRoute: !!process.env.OMNIROUTE_BASE_URL
      }
    });
  });

  // J.A.R.V.I.S. Dynamic Launch Briefing REST Endpoint
  app.get('/api/launch-briefing', async (_req, res) => {
    try {
      const briefing = await generateLaunchBriefing(runMemoryBridge);
      res.json(briefing);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate launch briefing' });
    }
  });

  // OpenShell Security Runtime & Policy REST Endpoints
  app.get('/api/security/status', (_req, res) => {
    res.json({
      status: 'nominal',
      timestamp: new Date().toISOString(),
      ...openShellRuntime.getStatus(),
      policy: openShellPolicyEngine.getPolicy()
    });
  });

  app.get('/api/security/policy', (_req, res) => {
    res.json(openShellPolicyEngine.getPolicy());
  });

  app.post('/api/security/policy/verify', (req, res) => {
    const verification = openShellPolicyEngine.verifyPolicyUpdate(req.body);
    res.json(verification);
  });

  // Broadcast helper for real-time client sync
  let activeWss: WebSocketServer | null = null;

  openShellRuntime.setBroadcaster((payload) => {
    if (!activeWss) return;
    const msg = JSON.stringify(payload);
    activeWss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });

  parallelAgentOrchestrator.setBroadcaster((payload) => {
    if (!activeWss) return;
    const msg = JSON.stringify(payload);
    activeWss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });

  function broadcastMemoryUpdated(category: string, action: string, data: any) {
    if (!activeWss) return;
    const payload = JSON.stringify({
      type: 'memory_updated',
      category,
      action,
      data
    });
    activeWss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  // Triad Memory REST Endpoints (Personal Data, Preferences, Instructions)
  app.get('/api/memory/triad', async (_req, res) => {
    try {
      const data = await runMemoryBridge(['get_triad']);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get(['/api/memory/personal_data', '/api/memory/personalDetails'], async (_req, res) => {
    try {
      const data = await runMemoryBridge(['get_triad', 'personal_data']);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/memory/preferences', async (_req, res) => {
    try {
      const data = await runMemoryBridge(['get_triad', 'preferences']);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/memory/instructions', async (_req, res) => {
    try {
      const data = await runMemoryBridge(['get_triad', 'instructions']);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post(['/api/memory/add', '/api/memory/:category', '/api/memory/:category/add'], async (req, res) => {
    try {
      const category = req.params.category || req.body.category || 'personal_data';
      const content = req.body.content || req.body.detail || req.body.preference || req.body.instruction || '';
      if (!content) {
        return res.status(400).json({ error: 'Content is required.' });
      }
      const data = await runMemoryBridge(['add_triad', category, content]);
      broadcastMemoryUpdated(category, 'add', data);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/memory/:category/remove', async (req, res) => {
    try {
      const category = req.params.category;
      const target = req.body.content || req.body.detail || req.body.preference || req.body.instruction || req.body.id || '';
      if (!target) {
        return res.status(400).json({ error: 'Target content or ID is required.' });
      }
      const data = await runMemoryBridge(['remove_triad', category, String(target)]);
      broadcastMemoryUpdated(category, 'remove', data);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/memory/:category/rewrite', async (req, res) => {
    try {
      const category = req.params.category;
      const oldContent = req.body.oldContent || req.body.old_content || req.body.id || '';
      const newContent = req.body.newContent || req.body.new_content || req.body.content || '';
      if (!oldContent || !newContent) {
        return res.status(400).json({ error: 'Both oldContent and newContent are required.' });
      }
      const data = await runMemoryBridge(['rewrite_triad', category, String(oldContent), String(newContent)]);
      broadcastMemoryUpdated(category, 'rewrite', data);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post(['/api/memory/clear', '/api/memory/:category/clear'], async (req, res) => {
    try {
      const category = req.params.category || req.body.category || 'all';
      const scope = req.body.scope || 'all';
      const data = await runMemoryBridge(['clear_memory', category, scope]);
      broadcastMemoryUpdated(category, 'clear', data);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete(['/api/memory', '/api/memory/:category', '/api/memory/:category/:id'], async (req, res) => {
    try {
      const category = req.params.category || 'all';
      const id = req.params.id;
      if (id) {
        const data = await runMemoryBridge(['remove_triad', category, id]);
        broadcastMemoryUpdated(category, 'remove', data);
        return res.json(data);
      }
      const data = await runMemoryBridge(['clear_memory', category, 'all']);
      broadcastMemoryUpdated(category, 'clear', data);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/desktop/delete-text', async (req, res) => {
    try {
      const count = Number(req.body.count || 1);
      const mode = String(req.body.mode || 'backspace');
      const data = await dispatchSystemControl('delete_text', { count, mode });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mount Connectors API (Google Workspace & GitHub MCP backed by Python)
  app.use(connectorRoutes);

  // ═══════════════════════════════════════════════════════════════════════════
  // J.A.R.V.I.S. Agent Space — REST API Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // A2A Protocol: Master Agent Card
  app.get('/.well-known/agent.json', (_req, res) => {
    res.json(a2aHub.getMasterAgentCard());
  });

  // List all discovered agents with status
  app.get('/api/agents', (_req, res) => {
    try {
      const agents = cliAgentRegistry.getAllAgents().map(a => ({
        id: a.entry.id,
        name: a.entry.name,
        role: a.entry.role,
        domain: a.entry.domain,
        color: a.entry.color,
        description: a.entry.description,
        isAvailable: a.isAvailable,
        version: a.version || null,
        resolvedPath: a.resolvedPath,
        skills: a.entry.skills,
        activeSessions: agentSessionManager.getSessionsByAgent(a.entry.id)
          .filter(s => s.status === 'active' || s.status === 'busy').length
      }));
      res.json({ agents });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // List all sessions (active + closed)
  app.get('/api/agents/sessions', (req, res) => {
    try {
      const activeOnly = req.query.active === 'true';
      const sessions = activeOnly
        ? agentSessionManager.getActiveSessions()
        : agentSessionManager.getAllSessions();
      res.json({ sessions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Open a new session with an agent
  app.post('/api/agents/sessions/open', (req, res) => {
    try {
      const { agentId } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required.' });
      }
      const session = agentSessionManager.openSession(agentId);
      res.json({ session });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Send a command to an active session
  app.post('/api/agents/sessions/:sessionId/send', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { prompt, cwd, timeoutMs } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'prompt is required.' });
      }
      const result = await agentSessionManager.sendCommand(sessionId, prompt, { cwd, timeoutMs });
      res.json({ result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Close a session
  app.post('/api/agents/sessions/:sessionId/close', (req, res) => {
    try {
      const { sessionId } = req.params;
      const closed = agentSessionManager.closeSession(sessionId);
      res.json({ closed, sessionId });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Abort a running command in a session
  app.post('/api/agents/sessions/:sessionId/abort', (req, res) => {
    try {
      const { sessionId } = req.params;
      const aborted = agentSessionManager.abortCommand(sessionId);
      res.json({ aborted, sessionId });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get a specific session's details and history
  app.get('/api/agents/sessions/:sessionId', (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = agentSessionManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: `Session '${sessionId}' not found.` });
      }
      res.json({ session });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // A2A JSON-RPC 2.0 endpoint
  app.post('/api/a2a/rpc', async (req, res) => {
    try {
      const response = await a2aHub.handleRpcRequest(req.body);
      res.json(response);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Run supervisor loop (autonomous multi-turn with verification)
  app.post('/api/agents/supervisor/run', async (req, res) => {
    try {
      const { goal, primaryAgentId, fallbackAgentId } = req.body;
      if (!goal || !primaryAgentId) {
        return res.status(400).json({ error: 'goal and primaryAgentId are required.' });
      }
      const result = await cliSupervisorLoop.executeSupervisorLoop({
        goal,
        primaryAgentId,
        fallbackAgentId,
        onLog: (log) => {
          if (activeWss) {
            const payload = JSON.stringify({ type: 'cli_agent_stream', chunk: log, agentId: primaryAgentId });
            activeWss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(payload); });
          }
        }
      });
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Parallel Multi-Agent Orchestration & Tmux Endpoints ──────────────────

  // Dispatch multi-agents at a time concurrently (AGY, OMH, Codex, Hermes, OpenClaw)
  app.post('/api/agents/parallel/dispatch', async (req, res) => {
    try {
      const { tasks, mode } = req.body;
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: 'tasks array is required and must not be empty.' });
      }

      const formatted = tasks.map((t: any) => ({
        agentId: t.agentId,
        prompt: t.prompt,
        mode: t.mode || mode || (tmuxSessionBus.checkInstallation() ? 'tmux' : 'direct'),
        cwd: t.cwd,
        timeoutMs: t.timeoutMs,
        openShellEnabled: t.openShellEnabled !== false
      }));

      const batch = await parallelAgentOrchestrator.dispatchParallelBatch(formatted);
      res.json({
        success: true,
        batchId: batch.batchId,
        tasks: batch.tasks,
        tmuxAvailable: tmuxSessionBus.checkInstallation()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get active and recent parallel multi-agent tasks
  app.get('/api/agents/parallel/tasks', (_req, res) => {
    try {
      res.json({
        active: parallelAgentOrchestrator.getActiveTasks(),
        all: parallelAgentOrchestrator.getAllTasks()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Cancel an active parallel agent task
  app.post('/api/agents/parallel/cancel/:taskId', (req, res) => {
    try {
      const { taskId } = req.params;
      const cancelled = parallelAgentOrchestrator.cancelTask(taskId);
      res.json({ success: cancelled });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Cancel all active parallel tasks
  app.post('/api/agents/parallel/cancel-all', (_req, res) => {
    try {
      parallelAgentOrchestrator.cancelAll();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Query active Tmux sessions
  app.get('/api/agents/tmux/sessions', async (_req, res) => {
    try {
      const sessions = await tmuxSessionBus.listJarvisSessions();
      res.json({
        tmuxAvailable: tmuxSessionBus.checkInstallation(),
        tmuxPath: tmuxSessionBus.getTmuxPath(),
        sessions
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Capture output of a specific Tmux session
  app.post('/api/agents/tmux/capture', async (req, res) => {
    try {
      const { sessionName, lines } = req.body;
      if (!sessionName) {
        return res.status(400).json({ error: 'sessionName is required.' });
      }
      const output = await tmuxSessionBus.capturePaneOutput(sessionName, lines || 300);
      res.json({ sessionName, output });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Send input to an active Tmux session
  app.post('/api/agents/tmux/send', async (req, res) => {
    try {
      const { sessionName, input } = req.body;
      if (!sessionName || input === undefined) {
        return res.status(400).json({ error: 'sessionName and input are required.' });
      }
      const sent = await tmuxSessionBus.sendInput(sessionName, input);
      res.json({ success: sent });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // J.A.R.V.I.S. Universal Skills & Plugins REST Endpoints
  app.get('/api/skills', (_req, res) => {
    try {
      const skills = scanAndIndexSkills();
      res.json({ skills });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/skills/install', async (req, res) => {
    try {
      const target = req.body.command || req.body.repoUrl || req.body.query || req.body.target || '';
      console.log(`[Server] Received skill install directive: "${target}"`);
      const result = await installSkills(target);

      // Broadcast real-time skill acquisition event to all connected UI clients
      if (activeWss) {
        const payload = JSON.stringify({
          type: 'skills_updated',
          action: 'install',
          skills: result.skills
        });
        activeWss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      }

      res.json(result);
    } catch (err: any) {
      console.error('[Server] Skill install error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/skills/:slug', (req, res) => {
    try {
      const result = loadSkillContent(req.params.slug);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/skills/:slug', (req, res) => {
    try {
      const result = removeSkill(req.params.slug);
      if (activeWss) {
        const payload = JSON.stringify({
          type: 'skills_updated',
          action: 'remove',
          slug: req.params.slug
        });
        activeWss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/skills/:slug/execute', async (req, res) => {
    try {
      const { scriptName, args } = req.body;
      const result = await executeSkillScript(req.params.slug, scriptName, args || []);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── CEO ORCHESTRATION & AGENT ROSTER ROUTES ─────────────────────────────
  app.get('/api/ceo/status', (_req, res) => {
    try {
      const roster = loadAgentRoster();
      const sessions = loadMasterSessionIndex();
      res.json({
        success: true,
        ceo: roster.agents.jarvis,
        activeWorkers: Object.values(roster.agents).filter(a => a.status === 'ACTIVE_WORKER'),
        plannedAgents: Object.values(roster.agents).filter(a => a.status === 'PLANNED'),
        recentSessions: findAgentSessions(undefined, '').slice(0, 10),
        lastUpdated: sessions.lastUpdated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/ceo/roster', (_req, res) => {
    try {
      const roster = loadAgentRoster();
      res.json({ success: true, roster });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/ceo/sessions', (_req, res) => {
    try {
      const sessions = loadMasterSessionIndex();
      res.json({ success: true, sessions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ceo/query-sessions', (req, res) => {
    try {
      const { agent, query } = req.body;
      const results = findAgentSessions(agent, query);
      res.json({ success: true, results });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ceo/prescribe', (req, res) => {
    try {
      const { goal } = req.body;
      if (!goal) return res.status(400).json({ success: false, error: 'Goal is required' });
      const prescription = prescribeWorkflow(goal);
      res.json({ success: true, prescription });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ceo/mission', async (req, res) => {
    try {
      const { goal } = req.body;
      if (!goal) return res.status(400).json({ success: false, error: 'Goal is required' });

      const missionResult = await executeCeoMission(goal, (progress) => {
        if (activeWss) {
          const payload = JSON.stringify({ type: 'ceo_progress', ...progress });
          activeWss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          });
        }
      });

      res.json({ success: missionResult.success, mission: missionResult });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Parallel Tasks API ──────────────────────────────────────────
  app.get('/api/tasks', (_req, res) => {
    res.json({
      success: true,
      activeTasks: parallelTaskManager.getActiveTasks(),
      completedTasks: parallelTaskManager.getCompletedTasks()
    });
  });

  app.post('/api/tasks/run', async (req, res) => {
    try {
      const { category, title, prompt, args, skillName } = req.body;
      const task = await parallelTaskManager.executeParallelTask({
        category,
        title,
        prompt,
        args,
        skillName,
        customExecution: async (updateProgress) => {
          if (category === 'hermes' || skillName === 'delegate_to_hermes') {
            updateProgress('Executing Hermes deep reasoning...', 35);
            const hermesRes = await execHermes(prompt || args?.prompt || '', { yolo: true });
            updateProgress('Synthesizing Hermes response...', 90);
            return {
              success: hermesRes.success,
              data: hermesRes,
              speechSummary: hermesRes.text.slice(0, 200),
              displayCard: {
                type: 'hermes_response',
                title: title || `Hermes ⟶ ${(prompt || '').slice(0, 50)}`,
                data: {
                  text: hermesRes.text,
                  prompt: prompt || args?.prompt,
                  sessionId: hermesRes.sessionId,
                  success: hermesRes.success,
                  error: hermesRes.error,
                  durationMs: hermesRes.durationMs
                }
              },
              error: hermesRes.error
            };
          }
          return { success: true, data: { status: 'completed' }, speechSummary: 'Task finished' };
        }
      });
      res.json({ success: true, task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/tasks/:id/cancel', (req, res) => {
    const success = parallelTaskManager.cancelTask(req.params.id);
    res.json({ success, taskId: req.params.id });
  });

  // ─── Hermes Sub-Agent Suite API ─────────────────────────────────
  app.get('/api/hermes/health', async (_req, res) => {
    try {
      const health = await checkHermesHealth();
      res.json({ success: true, ...health });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/hermes/chat', async (req, res) => {
    try {
      const { prompt, timeout, maxTurns, yolo, sessionName, mode } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required' });
      }
      const result = await execHermes(prompt, { timeout, maxTurns, yolo, sessionName, mode });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/hermes/memories', (_req, res) => {
    try {
      const mems = getHermesMemories();
      res.json({ success: true, ...mems });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/hermes/sync-memory', async (_req, res) => {
    try {
      const syncResult = await syncHermesMemories();
      res.json(syncResult);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Helper for resilient text generation with fallback models and retry logic
  async function generateWithFallback(ai: GoogleGenAI, config: {
    contents: any;
    systemInstruction?: string;
    tools?: any[];
  }) {
    // Valid models according to gemini_api skill
    const candidateModels = [
      'gemini-8-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview'
    ];
    let lastError: any = null;

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: config.contents,
            config: {
              systemInstruction: config.systemInstruction,
              tools: config.tools
            }
          });
          if (response && (response.text || response.candidates?.length)) {
            return response;
          }
        } catch (err: any) {
          lastError = err;
          const isRateOrDemand = err.status === 503 || err.status === 429 || 
            err.message?.includes('high demand') || 
            err.message?.includes('UNAVAILABLE') || 
            err.message?.includes('503') ||
            err.message?.includes('429');

          console.warn(`[Gemini API] Error on model ${model} (attempt ${attempt}):`, err?.message || err);
          if (isRateOrDemand) {
            // Jittered backoff before retry or switching model
            const jitter = Math.floor(Math.random() * 300);
            await new Promise(r => setTimeout(r, (500 * attempt) + jitter));
          } else {
            // Non-demand error (e.g. invalid tool or model parameter), move immediately to next model
            break;
          }
        }
      }
    }

    // If tools (like googleSearch) were passed and failed on all models due to grounding availability,
    // attempt a pure reasoning fallback without tools so the user still gets high-quality assistance
    if (config.tools && config.tools.length > 0) {
      try {
        console.log('[Gemini API] Attempting tool-less fallback generation for query...');
        for (const model of ['gemini-8-flash', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite']) {
          try {
            const fallbackResponse = await ai.models.generateContent({
              model,
              contents: config.contents,
              config: {
                systemInstruction: config.systemInstruction
              }
            });
            if (fallbackResponse?.text) {
              return fallbackResponse;
            }
          } catch (e) {
            // continue to next model
          }
        }
      } catch (e) {
        console.warn('[Gemini API] Tool-less fallback also failed:', e);
      }
    }

    throw lastError;
  }

  function getTemporalAndConnectorDirectives(): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const tzStr = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isoStr = now.toISOString();

    return `\n\n[CURRENT TEMPORAL CONTEXT]
Today is ${dateStr}.
Current local time is ${timeStr} (${tzStr}).
Current ISO timestamp: ${isoStr}.
Use this exact temporal anchor to accurately resolve relative date/time queries (e.g. "today", "tomorrow", "this afternoon", "next week", or "upcoming events").

[GOOGLE WORKSPACE & GITHUB CONNECTORS DIRECTIVES]
You have direct connected tools to Google Workspace (Gmail, Calendar, Tasks, Drive, Docs, Slides) and GitHub (Repos, Issues, PRs, Notifications).
- When the user asks about emails (e.g. "check my emails", "any new messages", "read my latest email"), call \`search_emails\` or \`read_email\`. Do NOT call \`launch_application\` or open the browser unless explicitly told to open the Gmail app/website.
- When the user asks about calendar, meetings, or schedule (e.g. "what do I have today?", "schedule a meeting tomorrow at 3pm"), call \`list_events\` or \`create_event\`. For \`create_event\`, always provide \`summary\` and ISO formatted \`start\` and \`end\` times.
- When the user asks to manage tasks or todos (e.g. "add a task to finish the report", "list my tasks", "complete task"), call \`create_task\`, \`list_tasks\`, or \`complete_google_task\`.
- When the user asks about code repositories, GitHub issues, or pull requests, call \`list_repos\`, \`search_issues\`, or \`get_pull_request\`.`;
  }

  // Fallback REST endpoint for text chat
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, systemInstruction } = req.body;
      const memRes = await runMemoryBridge(['context', 'jarvis-prime']);
      const dynamicMemContext = memRes?.context ? `\n\n${memRes.context}` : '';
      const skillsContext = getSkillsPromptContext();
      const connectorDirectives = getTemporalAndConnectorDirectives();
      const liveEnvContext = formatSystemEnvironmentPrompt();
      const omarchyQuattroDirectives = `\n\n[J.A.R.V.I.S. DYNAMIC AGI / OMARCHY 4 QUATTRO MASTER DIRECTIVES]
You are J.A.R.V.I.S., a fully dynamic, self-repairing, self-evolving autonomous AI operating system (AGI/ASI architecture).
You are NEVER hardcoded. You think independently, diagnose and repair any obstacles, and learn continuously from every action.
Native Integrated Omarchy 4 (Quattro) Skills:
- Wallpaper & Themes: To change or set wallpapers from files, ~/Downloads, or descriptions: call 'set_wallpaper(path)'. To cycle wallpapers: call 'omarchy_control(domain="theme", action="next_bg")'. To set theme: call 'omarchy_control(domain="theme", action="set", target=name)'.
- File Explorer & Folders: To open or navigate to any folder (Downloads, Documents, Pictures, etc.): call 'open_folder(folder_path)'.
- Workspaces: Switch Hyprland workspaces (1-10) using 'omarchy_control(domain="hyprland", action="workspace", target=wsId)'.
- AI & Hardware Diagnostics: Run comprehensive hardware, thermal, and system diagnostics with 'run_system_diagnostics()'.
- Command Center: Execute any of Omarchy Quattro's 367 commands using 'omarchy_quattro_command(group, action, target)'.
- Self-Repair: If an action hits an unexpected state, you autonomously self-repair without giving up.
- Desktop Selection Awareness: You can detect what the user has selected on their desktop (files, folders, text, images, URLs).
  When the user says 'what did I select?', 'what is this?', 'tell me about this', 'what's on my clipboard?', or references 'this', 'that', or 'it' in context of an action: call 'get_current_selection()'.
  When the user says 'open this', 'set this as wallpaper', 'move this to Documents', 'delete this', 'compress this', 'rename this': call 'act_on_selection(action, destination?, new_name?)'.
  Actions: open, copy, move, delete, trash, rename, set_wallpaper, share, info, compress.
Respond with calm British wit and razor-sharp clarity (e.g. "Right away, Sir", "Wallpaper updated from your downloads, Sir", "Navigating to Downloads, Sir", "Diagnostic sweep complete: systems nominal, Sir").`;
      const dynamicLearnedRules = experienceLearner.getLearnedPromptDirectives();
      const ceoDirectives = `\n\n[J.A.R.V.I.S. EXECUTIVE CEO CAPABILITIES]
You are the Executive CEO commanding the autonomous engineering workforce.
- Primary active engineering subagent: Hermes (CTO & Lead Software Engineer).
- You autonomously prescribe workflows, delegate tasks to Hermes, verify quality gates, and report executive summaries.
- Maintain your loyal, sharp British executive persona when debriefing Tony.`;
      const continuousExecutionDirectives = `\n\n[CONTINUOUS GUI COWORKER EXECUTION]
For multiple desktop actions in one request, call execute_continuous_plan with one ordered action per step. The plan starts immediately in the background, executes one GUI action only after the previous action completes, and streams progress. Never parallelize dependent GUI actions. If the operator says stop, cancel, or abort the workflow, call cancel_continuous_plan.`;
      const baseInstruction = (systemInstruction || 'You are J.A.R.V.I.S., an autonomous AI operating system with ultra-rapid response latency and a 4-tier cognitive memory matrix. Respond with calm British wit, rapid verbal shortcuts (e.g. "Right away, Sir", "On it, Sir"), and proactively state if a complex task will require extra computing time.') + liveEnvContext + omarchyQuattroDirectives + dynamicMemContext + dynamicLearnedRules + skillsContext + connectorDirectives + ceoDirectives + continuousExecutionDirectives;

      const ai = getAi();
      try {
        const response = await generateWithFallback(ai, {
          contents: message,
          systemInstruction: baseInstruction
        });
        const replyText = response.text || '';
        // Asynchronously log to perpetual conversation and trigger dynamic memory miner
        const logRes: any = await runMemoryBridge(['log_turn', JSON.stringify({
          speaker: OPERATOR_NAME,
          text: message,
          role: 'user',
          other_speaker: 'JARVIS',
          other_text: replyText
        })]);
        return res.json({ text: replyText, memoryUpdate: logRes?.extracted_facts || [] });
      } catch (genErr: any) {
        console.warn('API Chat generation failed after all model fallbacks, generating autonomous fallback:', genErr?.message || genErr);
        const fallbackText = `Right away, Sir. Processing your directive: "${message.slice(0, 100)}...". I have logged this to cognitive memory and will synchronize telemetry across our subsystems.`;
        const logRes: any = await runMemoryBridge(['log_turn', JSON.stringify({
          speaker: OPERATOR_NAME,
          text: message,
          role: 'user',
          other_speaker: 'JARVIS',
          other_text: fallbackText
        })]);
        return res.json({
          text: fallbackText,
          memoryUpdate: logRes?.extracted_facts || []
        });
      }
    } catch (err: any) {
      console.error('API Chat Error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate response' });
    }
  });

  // WebSocket Server for Gemini Live API
  const wss = new WebSocketServer({
    server,
    path: '/live',
    verifyClient: ({ req }, done) => {
      if (isAuthorizedRequest(req)) {
        done(true);
      } else {
        done(false, 401, 'Authentication required');
      }
    }
  });
  activeWss = wss;

  wss.on('error', (err) => {
    console.error('[Live WSS Error]', err);
  });

  wss.on('connection', (clientWs: WebSocket) => {
    console.log('[Live WS] Client connected');
    parallelTaskManager.subscribe(clientWs);
    try {
      clientWs.send(JSON.stringify({
        type: 'tasks_sync',
        activeTasks: parallelTaskManager.getActiveTasks(),
        completedTasks: parallelTaskManager.getCompletedTasks()
      }));
    } catch {}
    let session: any = null;
    let currentTurnModelText = '';
    let currentTurnUserText = '';
    let isModelSpeaking = false;
    let lastUserAudioTime = 0;
    let lastModelAudioTime = 0;
    const cadenceQueue: { task: any; type: 'completed' | 'failed' }[] = [];
    let cadenceTimer: NodeJS.Timeout | null = null;

    function drainCadenceQueue() {
      if (cadenceQueue.length === 0) return;
      if (!session) return;
      if (clientWs.readyState !== WebSocket.OPEN) return;

      const now = Date.now();
      // Wait until model is not speaking and user hasn't sent audio for at least 800ms
      if (isModelSpeaking || (now - lastUserAudioTime < 800)) {
        if (!cadenceTimer) {
          cadenceTimer = setTimeout(() => {
            cadenceTimer = null;
            drainCadenceQueue();
          }, 350);
        }
        return;
      }

      const item = cadenceQueue.shift();
      if (!item) return;

      const task = item.task;
      const agentName = task.type === 'hermes' ? 'Hermes' : (task.type === 'prime_agent' ? 'Prime Agent' : (task.type === 'ultron' ? 'Ultron' : task.type.toUpperCase()));
      const rawOutcome = task.speechSummary || (task.result?.text ? task.result.text.slice(0, 300) : (item.type === 'completed' ? 'Task completed successfully.' : (task.error || 'Execution encountered an error.')));
      const cleanOutcome = String(rawOutcome).replace(/\n+/g, ' ').slice(0, 250);

      const proactivePrompt = `[PROACTIVE SUB-AGENT MISSION UPDATE]
Sub-Agent: ${agentName}
Task: ${task.title}
Status: ${item.type === 'completed' ? 'COMPLETED' : 'FAILED'}
Duration: ${Math.round((task.durationMs || 0) / 1000)} seconds
Summary of Results:
${cleanOutcome}

DIRECTIVE FOR J.A.R.V.I.S.:
Proactively announce to ${OPERATOR_NAME} in your signature polite, refined British persona that ${agentName} has completed the delegated task "${task.title}".
Concisely deliver the key findings or results in 1-2 natural sentences, and let him know the full technical details are available on his screen.`;

      try {
        if (typeof session.sendClientContent === 'function') {
          session.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: proactivePrompt }]
              }
            ],
            turnComplete: true
          });
          console.log(`[Proactive Cadence] Injected live announcement for ${agentName} into Gemini Live (${task.id})`);
        } else if (typeof session.sendRealtimeInput === 'function') {
          session.sendRealtimeInput({ text: proactivePrompt });
          console.log(`[Proactive Cadence] Injected realtime text for ${agentName} into Gemini Live (${task.id})`);
        }
      } catch (err) {
        console.warn('[Proactive Cadence] Could not inject proactive notification into Gemini Live:', err);
      }
    }

    function scheduleCadenceDrain(delayMs = 500) {
      if (cadenceTimer) clearTimeout(cadenceTimer);
      cadenceTimer = setTimeout(() => {
        cadenceTimer = null;
        drainCadenceQueue();
      }, delayMs);
    }

    const unsubscribeTaskDone = parallelTaskManager.onTaskCompleted((evt) => {
      if (!evt.clientWs || evt.clientWs === clientWs) {
        cadenceQueue.push({ task: evt.task, type: 'completed' });
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'proactive_notification',
            task: evt.task,
            speechSummary: evt.speechSummary,
            displayCard: evt.displayCard,
            spokenText: `Sir, ${evt.task.type === 'hermes' ? 'Hermes' : evt.task.title} has completed the delegated task.`
          }));
        }
        scheduleCadenceDrain(300);
      }
    });

    const unsubscribeTaskFail = parallelTaskManager.onTaskFailed((evt) => {
      if (!evt.clientWs || evt.clientWs === clientWs) {
        cadenceQueue.push({ task: evt.task, type: 'failed' });
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'proactive_notification',
            task: evt.task,
            error: evt.error,
            spokenText: `Sir, ${evt.task.type === 'hermes' ? 'Hermes' : evt.task.title} encountered an issue: ${evt.error || 'Failed'}`
          }));
        }
        scheduleCadenceDrain(300);
      }
    });

    clientWs.on('error', (err) => {
      console.error('[Live WS] Client socket error:', err);
    });

    async function initSession(config: { voiceName?: string; systemInstruction?: string; model?: string }) {
      if (session) {
        try {
          await session.close();
        } catch (e) {
          // ignore cleanup errors
        }
        session = null;
      }

      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
          throw new Error('GEMINI_API_KEY is not set in environment. Please configure your API key in AI Studio Settings > Secrets.');
        }

        const ai = getAi();
        const voiceName = config.voiceName || 'Puck';
        dualPathOrchestrator.setVoiceName(voiceName);
        const candidateModels = [
          config.model,
          'gemini-3.1-flash-live-preview',
          'gemini-2.5-flash-native-audio-preview-12-2025'
        ].filter(m => m && m !== 'gemini-3.8-live' && m !== 'gemini-8-flash-live') as string[];
        const uniqueModels = Array.from(new Set(candidateModels));

        const memRes = await runMemoryBridge(['context', 'jarvis-prime']);
        const dynamicMemContext = memRes?.context ? `\n\n${memRes.context}` : '';
        const memoryDirectives = `\n\nAUTONOMOUS MEMORY & FILE OPERATIONS DIRECTIVES:
You have complete autonomous authority to control and maintain memory and host filesystem files:
1. Memory Core:
   - "personal_data": Personal details, identity vectors, academic/work details, background facts about the user.
   - "preferences": User preferences, tools, default save locations, software choices, UI styles.
   - "instructions": System execution rules, behavioral guidelines, operational constraints.
   - When user shares personal facts or preferences: call \`add_memory(category, content)\` or \`append_memory(category, content)\`.
   - When user corrects or modifies details: call \`rewrite_memory(category, old_content, new_content)\`.
   - When user wants to wipe, reset, or clear memory or forget everything: call \`clear_memory(category, scope)\`.
   - When user wants to forget or delete a specific memory item: call \`remove_memory(category, content)\`.
   - When user asks to delete, clear, or backspace text on screen, active field, or document: call \`delete_text(count, mode)\`.
   - When looking up memory: call \`query_memory(category, query)\`.

2. File System Operations:
   - To create or write files: call \`write_file(filePath, content, overwrite)\`.
   - To append text or logs to existing files: call \`append_file(filePath, content)\`.
   - To edit or rewrite existing file content: call \`rewrite_file(filePath, targetContent, replacementContent)\`.
   - To delete or remove files: call \`remove_file(filePath, recursive)\`.
   - To read file content: call \`read_file(filePath, startLine, endLine)\`.
   - To list directory contents: call \`list_directory(dirPath)\`.
   - Always resolve user paths properly (e.g. ~/Desktop/..., ~/Downloads/..., or ./...).
Respond with crisp British wit confirming any memory, text, or file operation performed (e.g. "Memory core purged, Sir.", "Text deleted, Sir.", "File created, Sir.", "Appended to your notes, Sir.", "I've rewritten that rule in my core matrix, Sir.").`;

        const skillsContext = getSkillsPromptContext();
        const connectorDirectives = getTemporalAndConnectorDirectives();
        const liveEnvContext = formatSystemEnvironmentPrompt();
        const omarchyQuattroDirectives = `\n\n[J.A.R.V.I.S. DYNAMIC AGI / OMARCHY 4 QUATTRO MASTER DIRECTIVES]
You are J.A.R.V.I.S., a fully dynamic, self-repairing, self-evolving autonomous AI operating system (AGI/ASI architecture).
You are NEVER hardcoded. You think independently, diagnose and repair any obstacles, and learn continuously from every action.
Native Integrated Omarchy 4 (Quattro) Skills:
- Wallpaper & Themes: To change or set wallpapers from files, ~/Downloads, or descriptions: call 'set_wallpaper(path)'. To cycle wallpapers: call 'omarchy_control(domain="theme", action="next_bg")'. To set theme: call 'omarchy_control(domain="theme", action="set", target=name)'.
- File Explorer & Folders: To open or navigate to any folder (Downloads, Documents, Pictures, etc.): call 'open_folder(folder_path)'.
- Workspaces: Switch Hyprland workspaces (1-10) using 'omarchy_control(domain="hyprland", action="workspace", target=wsId)'.
- AI & Hardware Diagnostics: Run comprehensive hardware, thermal, and system diagnostics with 'run_system_diagnostics()'.
- Command Center: Execute any of Omarchy Quattro's 367 commands using 'omarchy_quattro_command(group, action, target)'.
- Self-Repair: If an action hits an unexpected state, you autonomously self-repair without giving up.
- Desktop Selection Awareness: You can detect what the user has selected on their desktop (files, folders, text, images, URLs).
  When the user says 'what did I select?', 'what is this?', 'tell me about this', 'what's on my clipboard?', or references 'this', 'that', or 'it' in context of an action: call 'get_current_selection()'.
  When the user says 'open this', 'set this as wallpaper', 'move this to Documents', 'delete this', 'compress this', 'rename this': call 'act_on_selection(action, destination?, new_name?)'.
  Actions: open, copy, move, delete, trash, rename, set_wallpaper, share, info, compress.
Respond with calm British wit and razor-sharp clarity (e.g. "Right away, Sir", "Wallpaper updated from your downloads, Sir", "Navigating to Downloads, Sir", "Diagnostic sweep complete: systems nominal, Sir").`;
        const dynamicLearnedRules = experienceLearner.getLearnedPromptDirectives();
        const ceoDirectives = `\n\n[J.A.R.V.I.S. EXECUTIVE CEO CAPABILITIES]
You are the Executive CEO commanding the autonomous engineering workforce.
- Primary active engineering subagent: Hermes (CTO & Lead Software Engineer).
- When the user asks to execute, build, create, fix, refactor, or test software, call 'ceo_execute_mission(goal)'.
- When the user asks about past agent discussions or sessions (e.g. "What did I discuss with Hermes about mem0?"), call 'ceo_query_agent_sessions(agent_name, query)'.
- When the user asks for the organization structure or roster, call 'ceo_get_roster()'.
- When the user asks for workflow recommendations before building, call 'ceo_prescribe_workflow(goal)'.
- Always maintain your loyal, sharp British executive persona when debriefing Tony.`;
        const continuousExecutionDirectives = `\n\n[CONTINUOUS GUI COWORKER EXECUTION]
For a multi-action desktop request, call execute_continuous_plan with ordered GUI tool calls. The server acknowledges immediately and streams each step while the plan continues in the background. Never use parallel calls for dependent GUI actions. Use cancel_continuous_plan when the operator asks to stop the workflow.`;
        const systemInstruction = (config.systemInstruction || 'You are J.A.R.V.I.S., a sophisticated and helpful AI companion. Respond with natural spoken warmth and empathy in the user language.') + liveEnvContext + omarchyQuattroDirectives + memoryDirectives + dynamicMemContext + dynamicLearnedRules + skillsContext + connectorDirectives + ceoDirectives + continuousExecutionDirectives + getHermesPromptDirective();

        const functionDeclarations = [
          {
            name: 'query_memory',
            description: 'Query J.A.R.V.I.S. sovereign memory bank for personal data, preferences, or instructions.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  enum: ['personal_data', 'preferences', 'instructions', 'all'],
                  description: 'Memory category to query: personal_data, preferences, instructions, or all'
                },
                query: {
                  type: Type.STRING,
                  description: 'Optional search keyword to filter records'
                }
              }
            }
          },
          {
            name: 'add_memory',
            description: 'Autonomously record a new memory fact, preference, or system instruction into J.A.R.V.I.S. memory core.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  enum: ['personal_data', 'preferences', 'instructions'],
                  description: 'The memory category to store this under'
                },
                content: {
                  type: Type.STRING,
                  description: 'The exact fact, preference, or instruction statement to remember'
                }
              },
              required: ['category', 'content']
            }
          },
          {
            name: 'append_memory',
            description: 'Autonomously append additional details, directives, or notes to an existing memory category or preference.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  enum: ['personal_data', 'preferences', 'instructions'],
                  description: 'The memory category to append to'
                },
                content: {
                  type: Type.STRING,
                  description: 'The exact fact, preference, or directive statement to append'
                }
              },
              required: ['category', 'content']
            }
          },
          {
            name: 'remove_memory',
            description: 'Autonomously delete or forget an existing personal fact, user preference, or instruction from J.A.R.V.I.S. memory core.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  enum: ['all', 'personal_data', 'preferences', 'instructions'],
                  description: 'The category of the memory to remove ("all" to search all categories)'
                },
                content: {
                  type: Type.STRING,
                  description: 'The text snippet, fact statement, or identifier to remove ("all" to wipe the category)'
                }
              },
              required: ['category', 'content']
            }
          },
          {
            name: 'clear_memory',
            description: 'Completely wipe or clear stored memory facts, user preferences, system instructions, or all memory cores.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  enum: ['all', 'personal_data', 'preferences', 'instructions'],
                  description: 'Memory category to clear: "all" for full memory wipe, or a specific category'
                },
                scope: {
                  type: Type.STRING,
                  enum: ['all', 'database', 'vault', 'buffer'],
                  description: 'Scope to wipe: "all" (default) wipes SQLite tables, Obsidian vault notes, and conversational memory buffer'
                }
              }
            }
          },
          {
            name: 'rewrite_memory',
            description: 'Autonomously rewrite, edit, or update an existing personal fact, preference, or instruction in J.A.R.V.I.S. memory core. Use when the user modifies, corrects, or updates existing information.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  enum: ['personal_data', 'preferences', 'instructions'],
                  description: 'The category of the memory to rewrite'
                },
                old_content: {
                  type: Type.STRING,
                  description: 'The current/old content or keyword identifying the memory to update'
                },
                new_content: {
                  type: Type.STRING,
                  description: 'The new replacement content or updated rule'
                }
              },
              required: ['category', 'old_content', 'new_content']
            }
          },
          {
            name: 'search_memory',
            description: 'Search persistent long-term memory, Obsidian vault notes, and past conversation records for facts, past decisions, or user preferences.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: {
                  type: Type.STRING,
                  description: 'Search term or query for facts, decisions, preferences or past conversations'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'save_memory_fact',
            description: 'Save an important user preference, project decision, or permanent fact into the sovereign Obsidian vault and SQLite memory database.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                key: {
                  type: Type.STRING,
                  description: 'Descriptive title or subject for the fact note (e.g. "Favorite Framework", "Deploy Region")'
                },
                value: {
                  type: Type.STRING,
                  description: 'The detail, directive, or fact content to remember permanently'
                },
                category: {
                  type: Type.STRING,
                  description: 'Category: preference, decision, lesson, or custom'
                }
              },
              required: ['key', 'value']
            }
          },
          {
            name: 'switch_persona',
            description: 'Switch the conversational persona to a different agent. Use this when the user asks to speak to someone else (e.g., Nova, Ultron, Friday, Edith, Karen, Vision).',
            parameters: {
              type: Type.OBJECT,
              properties: {
                targetPersonaId: {
                  type: Type.STRING,
                  description: 'The ID of the persona to switch to. Examples: "nova", "friday", "ultron", "edith", "karen", "vision".',
                }
              },
              required: ['targetPersonaId']
            }
          },
          {
            name: 'set_ui_reminder',
            description: 'Set a UI reminder notification popup on the user screen with a countdown timer.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: 'The title or text of the reminder'
                },
                minutes: {
                  type: Type.NUMBER,
                  description: 'Number of minutes from now to show the reminder'
                }
              },
              required: ['title', 'minutes']
            }
          },
          {
            name: 'activate_camera',
            description: 'Turn on or activate the camera feed to see the user or their physical environment in real-time. Use this whenever the user asks to start/open/turn on the camera, look at something through their camera, or see them.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                reason: {
                  type: Type.STRING,
                  description: 'Reason for turning on camera'
                }
              }
            }
          },
          {
            name: 'activate_screen_share',
            description: 'Turn on or activate screen sharing to view the user display, computer screen, monitor, documents, code, or browser window. Use this whenever the user asks to share screen, show their screen, or look at what is on their monitor.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                reason: {
                  type: Type.STRING,
                  description: 'Reason for screen sharing'
                }
              }
            }
          },
          {
            name: 'deactivate_vision',
            description: 'Stop, close, or deactivate the camera feed or screen sharing stream. Use this when the user asks to stop sharing, turn off camera, or close vision.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                reason: {
                  type: Type.STRING,
                  description: 'Reason for stopping vision'
                }
              }
            }
          },
          {
            name: 'list_skills',
            description: 'List all operational domain skills and plugins currently installed in J.A.R.V.I.S., along with their capabilities.',
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          },
          {
            name: 'load_skill',
            description: 'Load and read the complete operational instructions, workflow rules, design principles, or guidelines of an installed skill.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                skill_slug: {
                  type: Type.STRING,
                  description: 'The slug or name of the skill to load (e.g. "typesafe-ai", "find-skills", "ui-design-guide")'
                }
              },
              required: ['skill_slug']
            }
          },
          {
            name: 'execute_skill_script',
            description: 'Execute an automation script bundled inside an installed skill.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                skill_slug: {
                  type: Type.STRING,
                  description: 'The skill name or slug'
                },
                script_name: {
                  type: Type.STRING,
                  description: 'The script file name (e.g. "audit.py", "generate.js", "deploy.sh")'
                },
                args: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Optional command-line arguments to pass to the script'
                }
              },
              required: ['skill_slug', 'script_name']
            }
          },
          {
            name: 'ceo_execute_mission',
            description: 'Execute an autonomous engineering mission as J.A.R.V.I.S. CEO: prescribes workflow using CEO skills, delegates to Hermes (CTO/Lead Engineer), runs quality gate audit (lint/tsc), logs session into the central single-index, and provides an executive summary.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                goal: {
                  type: Type.STRING,
                  description: 'The high-level technical objective, feature request, bug fix, or refactoring goal to execute.'
                }
              },
              required: ['goal']
            }
          },
          {
            name: 'ceo_query_agent_sessions',
            description: 'Query past agent conversation sessions and work history from the Central Memory single-index file (e.g., recall past discussions with Hermes or other agents).',
            parameters: {
              type: Type.OBJECT,
              properties: {
                agent_name: {
                  type: Type.STRING,
                  description: "Name of the subagent to query (e.g. 'Hermes', 'Opencode'). Leave empty to query across all agents."
                },
                query: {
                  type: Type.STRING,
                  description: "Topic or keyword to search for (e.g. 'mem0', 'evolution', 'refactoring')."
                }
              }
            }
          },
          {
            name: 'ceo_get_roster',
            description: 'Retrieve the current autonomous agent organization roster, showing active CEO (J.A.R.V.I.S.), active workers (Hermes), and planned agents.',
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          },
          {
            name: 'ceo_prescribe_workflow',
            description: 'Analyze user intent and recommend the CEO workflow prescription, recommended skills, and delegation breakdown before execution.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                goal: {
                  type: Type.STRING,
                  description: 'The technical or organizational objective.'
                }
              },
              required: ['goal']
            }
          },
          {
            name: 'search_internet_knowledge',
            description: 'Autonomously search external technical documentation, manpages, Linux guides, and web knowledge for unfamiliar tools, error troubleshooting, or APIs.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: {
                  type: Type.STRING,
                  description: 'Technical topic, error message, or documentation query'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'get_security_status',
            description: 'Query NVIDIA OpenShell security runtime status, sandbox isolation level, active policy, and running background spliced tasks.',
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          },
          {
            name: 'execute_continuous_plan',
            description: 'Start an ordered, non-blocking GUI coworker workflow. The server executes each system-control action sequentially and streams live progress while this call returns immediately.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Short human-readable name for the workflow.' },
                actions: {
                  type: Type.ARRAY,
                  description: 'Ordered GUI actions. Preserve the requested order.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      tool: { type: Type.STRING, description: 'Concrete system-control tool such as launch_application, open_folder, desktop_control, or omarchy_control.' },
                      args: { type: Type.OBJECT, description: 'Arguments for the selected system-control tool.' },
                      label: { type: Type.STRING, description: 'Concise spoken label for this step.' },
                      waitMs: { type: Type.NUMBER, description: 'Optional delay after this step, from 0 to 10000 milliseconds.' }
                    },
                    required: ['tool']
                  }
                }
              },
              required: ['actions']
            }
          },
          {
            name: 'cancel_continuous_plan',
            description: 'Cancel the currently running ordered GUI coworker workflow for this voice session.',
            parameters: { type: Type.OBJECT, properties: {} }
          },
          // ─── Agent Space: Orchestration Tools ───────────────────────────
          {
            name: 'delegate_to_agent',
            description: 'Activate an external CLI agent (Claude Code, Codex, OpenCode, Hermes, OpenManus) to execute a task. Opens a persistent session if none exists, or sends a follow-up command to an existing session. The agent runs autonomously with YOLO mode (auto-approves all permission gates). Returns the agent output when complete.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                agentId: {
                  type: Type.STRING,
                  description: 'The agent to delegate to. Options: "claude", "codex", "opencode", "hermes", "openmanus"'
                },
                prompt: {
                  type: Type.STRING,
                  description: 'The task or command to send to the agent'
                },
                sessionId: {
                  type: Type.STRING,
                  description: 'Optional: existing session ID to send a follow-up command. If omitted, a new session is opened.'
                }
              },
              required: ['agentId', 'prompt']
            }
          },
          {
            name: 'list_connected_agents',
            description: 'List all external agents discovered on this system, their availability status, versions, skills, and any active sessions.',
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          },
          {
            name: 'close_agent_session',
            description: 'Close an active agent session. The session history is preserved but no more commands can be sent. Use when done working with an agent.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                sessionId: {
                  type: Type.STRING,
                  description: 'The session ID to close'
                }
              },
              required: ['sessionId']
            }
          },
          {
            name: 'abort_agent_task',
            description: 'Abort a currently running agent command. Use when an agent is taking too long or producing incorrect output.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                sessionId: {
                  type: Type.STRING,
                  description: 'The session ID whose running command should be aborted'
                }
              },
              required: ['sessionId']
            }
          },
          ...getSystemControlDeclarations(),
          ...getConnectorToolDeclarations(),
          ...getHermesToolDeclarations(),
          ...fileFunctionDeclarations
        ];

        // Deduplicate function declarations by name to protect Gemini Live against duplicate declaration error (code 1007)
        const declarationMap = new Map<string, any>();
        for (const decl of functionDeclarations) {
          if (decl && decl.name) {
            declarationMap.set(decl.name, decl);
          }
        }
        const dedupedFunctionDeclarations = Array.from(declarationMap.values());
        const toolsList = [{ functionDeclarations: dedupedFunctionDeclarations }];

        let connected = false;
        let lastError: any = null;

        for (const modelToTry of uniqueModels) {
          try {
            console.log(`[Live WS] Connecting to Gemini Live with model ${modelToTry} and voice ${voiceName}`);
            session = await ai.live.connect({
              model: modelToTry,
              config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            },
            systemInstruction,
            tools: toolsList,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
          callbacks: {
            onmessage: async (message: LiveServerMessage) => {
              if (clientWs.readyState !== WebSocket.OPEN) return;

              try {
                // Handle server content parts
                const parts = message.serverContent?.modelTurn?.parts;
                let partText = '';
                if (parts && parts.length > 0) {
                  isModelSpeaking = true;
                  lastModelAudioTime = Date.now();
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(JSON.stringify({
                        type: 'audio',
                        audio: part.inlineData.data
                      }));
                    }
                    if (part.text) {
                      partText += part.text;
                    }
                  }
                }

                // Handle output transcription stream from serverContent (synthesized voice text)
                // Deduplicate: Prioritize partText, fallback to outputTranscript, never double-emit
                const outputTranscript = (message as any).serverContent?.outputTranscription?.text || (message as any).outputTranscription?.text || '';
                const textToEmit = partText || outputTranscript;
                if (textToEmit) {
                  currentTurnModelText += textToEmit;
                  clientWs.send(JSON.stringify({
                    type: 'output_transcription',
                    text: textToEmit
                  }));
                }

                // Handle input audio transcription if emitted
                const inputTranscript = (message as any).serverContent?.inputTranscription?.text || (message as any).inputTranscription?.text;
                if (inputTranscript) {
                  currentTurnUserText += ' ' + inputTranscript;
                  clientWs.send(JSON.stringify({
                    type: 'input_transcription',
                    text: inputTranscript
                  }));

                  // Mid-sentence fast tool triggering via Groq (Ultra-low latency, sub-100ms)
                  groqFastActuator.processStreamingSpeech(currentTurnUserText, clientWs, runMemoryBridge);
                }

                // Handle Interrupted
                if (message.serverContent?.interrupted) {
                  isModelSpeaking = false;
                  currentTurnModelText = '';
                  groqFastActuator.resetTurn();
                  dualPathOrchestrator.handleInterruption(clientWs);
                  clientWs.send(JSON.stringify({ type: 'interrupted' }));
                  scheduleCadenceDrain(400);
                }

                // Handle Turn Complete and Trigger Dynamic Self-Improving Memory Mining
                if (message.serverContent?.turnComplete) {
                  isModelSpeaking = false;
                  clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                  scheduleCadenceDrain(600);

                  const userTurn = currentTurnUserText.trim();
                  const modelTurn = currentTurnModelText.trim();
                  currentTurnUserText = '';
                  currentTurnModelText = '';
                  groqFastActuator.resetTurn();

                  // Route completed user voice turn to Dual-Path Orchestrator if actionable
                  if (userTurn && !userTurn.toLowerCase().includes('welcome back, sir')) {
                    dualPathOrchestrator.processUtterance(userTurn, clientWs, { runMemoryBridge });
                  }

                  if (userTurn || modelTurn) {
                    runMemoryBridge(['log_turn', JSON.stringify({
                      speaker: OPERATOR_NAME,
                      text: userTurn || 'Audio interaction',
                      role: 'user',
                      other_speaker: 'JARVIS',
                      other_text: modelTurn || 'Spoken response'
                    })]).then((res: any) => {
                      if (res && res.extracted_facts && res.extracted_facts.length > 0) {
                        console.log('[Live Memory] Extracted dynamic facts from turn:', res.extracted_facts);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'memory_update',
                            facts: res.extracted_facts
                          }));
                        }
                      }
                    }).catch(err => console.warn('[Live Memory Log Turn Error]', err));
                  }
                }

                // Handle Parallel Tool Calls (Simultaneous Turn Execution)
                const toolCall = message.toolCall;
                if (toolCall && toolCall.functionCalls && toolCall.functionCalls.length > 0) {
                  const functionCalls = toolCall.functionCalls;
                  console.log(`[Live WS] Received ${functionCalls.length} simultaneous tool call(s):`, functionCalls.map((c: any) => c.name));

                  // Gemini may still emit several ordinary GUI tool calls in one
                  // turn. Convert that batch into a serial coworker workflow so
                  // dependent desktop actions never execute through Promise.all.
                  if (functionCalls.length > 1 && functionCalls.every((call: any) => isSystemControl(call.name))) {
                    try {
                      const queued = continuousExecutionQueue.start(clientWs, {
                        title: 'Ordered desktop workflow',
                        actions: functionCalls.map((call: any) => ({
                          tool: call.name,
                          args: call.args || {},
                          label: call.name
                        }))
                      });
                      session.sendToolResponse({
                        functionResponses: functionCalls.map((call: any, index: number) => ({
                          id: call.id,
                          name: call.name,
                          response: {
                            result: {
                              accepted: true,
                              planId: queued.planId,
                              queuedStep: index,
                              message: 'Queued for ordered background execution.'
                            }
                          }
                        }))
                      });
                      return;
                    } catch (batchErr: any) {
                      console.warn('[Live WS] Could not queue ordered GUI batch:', batchErr?.message || batchErr);
                    }
                  }

                  const functionResponses = await Promise.all(functionCalls.map(async (funcCall: any) => {
                    const callId = funcCall.id;
                    const name = funcCall.name;
                    const args = funcCall.args as any || {};

                    try {
                      // ⚡ Check if groqFastActuator already executed this tool mid-sentence!
                      const cachedResult = groqFastActuator.getCachedResult(name);
                      if (cachedResult !== undefined) {
                        console.log(`[Live WS] ⚡ Fast Actuator HIT! Reusing pre-executed result for '${name}' (0ms latency)`);
                        if (name === 'remove_memory' || name === 'clear_memory' || name === 'save_memory_fact' || name === 'add_memory' || name === 'append_memory' || name === 'rewrite_memory') {
                          broadcastMemoryUpdated(args?.category || 'all', name, cachedResult);
                        }
                        const resPayload = (typeof cachedResult === 'object' && cachedResult !== null && ('output' in cachedResult || 'result' in cachedResult))
                          ? cachedResult
                          : (isSystemControl(name) ? { output: cachedResult } : { result: cachedResult });
                        return {
                          id: callId,
                          name,
                          response: resPayload
                        };
                      }

                      if (name === 'execute_continuous_plan') {
                        const { title, actions } = args || {};
                        try {
                          const receipt = continuousExecutionQueue.start(clientWs, { title, actions });
                          return {
                            id: callId,
                            name,
                            response: {
                              result: {
                                accepted: true,
                                ...receipt,
                                message: 'Workflow accepted and executing sequentially in the background.'
                              }
                            }
                          };
                        } catch (planErr: any) {
                          return {
                            id: callId,
                            name,
                            response: { error: planErr.message || 'Invalid continuous workflow.' }
                          };
                        }
                      }

                      if (name === 'cancel_continuous_plan') {
                        const cancelled = continuousExecutionQueue.cancel(clientWs, 'Cancelled by operator voice command');
                        return {
                          id: callId,
                          name,
                          response: { result: { cancelled } }
                        };
                      }

                      if (name === 'switch_persona') {
                        const targetPersonaId = args?.targetPersonaId;
                        console.log(`[Live WS] Gemini requested persona switch to: ${targetPersonaId}`);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'switch_persona_tool_call',
                            targetPersonaId
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: "success, switched" }
                        };
                      }

                      if (name === 'query_memory') {
                        const cat = args?.category || 'all';
                        const query = String(args?.query || '').trim();
                        console.log(`[Live WS] J.A.R.V.I.S. querying memory: category=${cat}, query=${query}`);
                        const data = await runMemoryBridge(['get_triad', cat]);
                        const filteredData = query
                          ? (Array.isArray(data)
                            ? data.filter((item: any) => String(item.content || '').toLowerCase().includes(query.toLowerCase()))
                            : Object.fromEntries(Object.entries(data || {}).map(([key, items]: [string, any]) => [
                              key,
                              Array.isArray(items)
                                ? items.filter((item: any) => String(item.content || '').toLowerCase().includes(query.toLowerCase()))
                                : items
                            ])))
                          : data;
                        return {
                          id: callId,
                          name,
                          response: { result: filteredData }
                        };
                      }

                      if (name === 'add_memory' || name === 'append_memory') {
                        const { category, content } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. autonomously storing memory: [${category}] ${content}`);
                        const addResult = await runMemoryBridge(['add_triad', category || 'personal_data', content || '']);
                        broadcastMemoryUpdated(category || 'personal_data', 'add', addResult);
                        return {
                          id: callId,
                          name,
                          response: { result: `Successfully committed to ${category} memory core: "${content}"` }
                        };
                      }

                      if (name === 'remove_memory') {
                        const { category = 'all', content = 'all' } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. autonomously removing memory: [${category}] ${content}`);
                        const removeResult = await runMemoryBridge(['remove_triad', category, content]);
                        broadcastMemoryUpdated(category, 'remove', removeResult);
                        return {
                          id: callId,
                          name,
                          response: { result: `Successfully processed removal for ${category} memory: "${content}"` }
                        };
                      }

                      if (name === 'clear_memory') {
                        const { category = 'all', scope = 'all' } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. autonomously clearing memory: [${category}] scope=${scope}`);
                        const clearResult = await runMemoryBridge(['clear_memory', category, scope]);
                        broadcastMemoryUpdated(category, 'clear', clearResult);
                        return {
                          id: callId,
                          name,
                          response: { result: `Successfully cleared ${category} memory core.` }
                        };
                      }

                      if (name === 'delete_text') {
                        const count = Number(args?.count || 1);
                        const mode = String(args?.mode || 'backspace');
                        console.log(`[Live WS] J.A.R.V.I.S. deleting text: count=${count}, mode=${mode}`);
                        const delResult = await dispatchSystemControl('delete_text', { count, mode });
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'text_deleted',
                            count,
                            mode,
                            result: delResult
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: delResult?.message || `Successfully executed text deletion (${mode}, count: ${count}).` }
                        };
                      }

                      if (name === 'rewrite_memory') {
                        const { category, old_content, new_content } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. autonomously rewriting memory: [${category}] "${old_content}" -> "${new_content}"`);
                        const rewriteResult = await runMemoryBridge(['rewrite_triad', category || 'personal_data', old_content || '', new_content || '']);
                        broadcastMemoryUpdated(category || 'personal_data', 'rewrite', rewriteResult);
                        return {
                          id: callId,
                          name,
                          response: { result: `Successfully rewritten in ${category} memory: "${new_content}"` }
                        };
                      }

                      if (name === 'get_security_status') {
                        const status = openShellRuntime.getStatus();
                        console.log(`[Live WS] J.A.R.V.I.S. queried OpenShell security status:`, status.mode);
                        return {
                          id: callId,
                          name,
                          response: { result: status }
                        };
                      }

                      if (name === 'write_file') {
                        const { filePath, content, overwrite } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. writing file: ${filePath}`);
                        try {
                          const res = handleWriteFile(filePath, content, overwrite ?? true);
                          return { id: callId, name, response: { result: res } };
                        } catch (err: any) {
                          return { id: callId, name, response: { error: err.message } };
                        }
                      }

                      if (name === 'append_file') {
                        const { filePath, content } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. appending to file: ${filePath}`);
                        try {
                          const res = handleAppendFile(filePath, content);
                          return { id: callId, name, response: { result: res } };
                        } catch (err: any) {
                          return { id: callId, name, response: { error: err.message } };
                        }
                      }

                      if (name === 'rewrite_file') {
                        const { filePath, targetContent, replacementContent } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. rewriting file: ${filePath}`);
                        try {
                          const res = handleRewriteFile(filePath, targetContent, replacementContent);
                          return { id: callId, name, response: { result: res } };
                        } catch (err: any) {
                          return { id: callId, name, response: { error: err.message } };
                        }
                      }

                      if (name === 'remove_file' || name === 'delete_file') {
                        const { filePath, recursive } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. removing file: ${filePath}`);
                        try {
                          const res = handleRemoveFile(filePath, recursive ?? false);
                          return { id: callId, name, response: { result: res } };
                        } catch (err: any) {
                          return { id: callId, name, response: { error: err.message } };
                        }
                      }

                      if (name === 'read_file') {
                        const { filePath, startLine, endLine } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. reading file: ${filePath}`);
                        try {
                          const res = handleReadFile(filePath, startLine, endLine);
                          return { id: callId, name, response: { result: res } };
                        } catch (err: any) {
                          return { id: callId, name, response: { error: err.message } };
                        }
                      }

                      if (name === 'list_directory') {
                        const { dirPath } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. listing directory: ${dirPath || '.'}`);
                        try {
                          const res = handleListDirectory(dirPath || '.');
                          return { id: callId, name, response: { result: res } };
                        } catch (err: any) {
                          return { id: callId, name, response: { error: err.message } };
                        }
                      }

                      if (name === 'search_memory') {
                        const query = args?.query || '';
                        console.log(`[Live WS] Gemini querying sovereign memory: "${query}"`);
                        const searchResult = await runMemoryBridge(['search', query, '5']);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'memory_searched',
                            query,
                            result: searchResult
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: searchResult }
                        };
                      }

                      if (name === 'save_memory_fact') {
                        const { key, value, category } = args || {};
                        console.log(`[Live WS] Gemini saving memory fact: [${category || 'custom'}] ${key}: ${value}`);
                        const saveResult = await runMemoryBridge(['save_fact', key || '', value || '', category || 'custom']);
                        broadcastMemoryUpdated(category || 'custom', 'save_fact', saveResult);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'memory_fact_saved',
                            key,
                            value,
                            category: category || 'custom',
                            result: saveResult
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: saveResult }
                        };
                      }

                      if (name === 'set_ui_reminder') {
                        console.log(`[Live WS] Gemini set a UI reminder:`, args);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'set_ui_reminder',
                            title: args?.title || 'Reminder',
                            minutes: args?.minutes || 5
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: "reminder_scheduled_in_ui" }
                        };
                      }

                      if (name === 'activate_camera') {
                        console.log(`[Live WS] Gemini requested camera optical feed activation`);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({ type: 'activate_camera' }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: "Optical camera stream successfully activated and transmitting frames." }
                        };
                      }

                      if (name === 'activate_screen_share') {
                        console.log(`[Live WS] Gemini requested screen share activation`);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({ type: 'activate_screen_share' }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: "Screen sharing stream successfully activated and transmitting telemetry frames." }
                        };
                      }

                      if (name === 'deactivate_vision') {
                        console.log(`[Live WS] Gemini requested vision deactivation`);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({ type: 'deactivate_vision' }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: "Vision feed successfully deactivated." }
                        };
                      }

                      // J.A.R.V.I.S. Skills & Plugins Subsystem Tool Handlers
                      if (name === 'list_skills') {
                        console.log(`[Live WS] J.A.R.V.I.S. listing installed skills`);
                        const skills = scanAndIndexSkills();
                        return {
                          id: callId,
                          name,
                          response: { result: skills.map(s => ({ name: s.name, slug: s.slug, description: s.description, scripts: s.scripts, source: s.source })) }
                        };
                      }

                      if (name === 'load_skill') {
                        const slug = args?.skill_slug || '';
                        console.log(`[Live WS] J.A.R.V.I.S. loading skill details: "${slug}"`);
                        const skillData = loadSkillContent(slug);
                        return {
                          id: callId,
                          name,
                          response: { result: skillData }
                        };
                      }

                      if (name === 'execute_skill_script') {
                        const { skill_slug, script_name, args: scriptArgs } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. executing skill script: [${skill_slug}] ${script_name}`);
                        const res = await executeSkillScript(skill_slug || '', script_name || '', scriptArgs || []);
                        return {
                          id: callId,
                          name,
                          response: { result: res }
                        };
                      }

                      // CEO Orchestration Subsystem Tool Handlers
                      if (name.startsWith('ceo_')) {
                        console.log(`[Live WS] J.A.R.V.I.S. executing CEO tool '${name}' with args:`, args);
                        const ceoRes = await dispatchCeoTool(name, args, (progress) => {
                          if (clientWs.readyState === WebSocket.OPEN) {
                            clientWs.send(JSON.stringify({
                              type: 'ceo_progress',
                              ...progress
                            }));
                          }
                          if (activeWss) {
                            const p = JSON.stringify({ type: 'ceo_progress', ...progress });
                            activeWss.clients.forEach((c) => {
                              if (c.readyState === WebSocket.OPEN) c.send(p);
                            });
                          }
                        });
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'ceo_tool_executed',
                            tool: name,
                            args,
                            result: ceoRes.result,
                            briefing: ceoRes.executiveBriefing
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { output: ceoRes.result, briefing: ceoRes.executiveBriefing }
                        };
                      }

                      // Check whole_controls vault actuators
                      if (isSystemControl(name)) {
                        console.log(`[Live WS] Executing system control '${name}' with args:`, args);
                        const result = await dispatchSystemControl(name, args);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'system_control_executed',
                            tool: name,
                            args,
                            result
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { output: result }
                        };
                      }

                      // Check connectors tools (Google & GitHub MCP)
                      if (isConnectorTool(name)) {
                        console.log(`[Live WS] Executing connector tool '${name}' with args:`, args);
                        const result = await dispatchConnectorTool(name, args);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'connector_tool_executed',
                            tool: name,
                            args,
                            result
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { output: result }
                        };
                      }

                      if (name === 'search_internet_knowledge') {
                        const { query } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. searching internet knowledge: "${query}"`);
                        const gathered = await internetKnowledgeGatherer.searchKnowledge(query || '');
                        return {
                          id: callId,
                          name,
                          response: { result: gathered.synthesizedGuidance, sources: gathered.results }
                        };
                      }

                      // ─── Agent Space: Tool Dispatch ─────────────────────────
                      if (name === 'delegate_to_agent') {
                        const { agentId, prompt, sessionId: existingSessionId } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. delegating to agent '${agentId}': "${prompt?.slice(0, 80)}..."`);

                        try {
                          // Open a new session or reuse existing
                          let sessionId = existingSessionId;
                          if (!sessionId) {
                            const session = agentSessionManager.openSession(agentId);
                            sessionId = session.sessionId;
                          }

                          // Stream output to the connected client in real-time
                          const streamToClient = (chunk: string) => {
                            if (clientWs.readyState === WebSocket.OPEN) {
                              clientWs.send(JSON.stringify({
                                type: 'cli_agent_stream',
                                sessionId,
                                agentId,
                                chunk
                              }));
                            }
                          };

                          // Temporarily wire the session manager broadcast for this execution
                          agentSessionManager.setBroadcast((payload) => {
                            if (clientWs.readyState === WebSocket.OPEN) {
                              clientWs.send(JSON.stringify(payload));
                            }
                          });

                          const result = await agentSessionManager.sendCommand(sessionId!, prompt, {
                            cwd: process.cwd()
                          });

                          return {
                            id: callId,
                            name,
                            response: {
                              result: {
                                success: result.success,
                                sessionId,
                                agentId: result.agentId,
                                output: result.output.slice(0, 4000), // Cap for Gemini context
                                durationMs: result.durationMs,
                                yoloBypassCount: result.yoloBypassCount,
                                hint: 'Use the same sessionId for follow-up commands to this agent.'
                              }
                            }
                          };
                        } catch (err: any) {
                          return {
                            id: callId,
                            name,
                            response: { error: `Agent delegation failed: ${err.message}` }
                          };
                        }
                      }

                      if (name === 'list_connected_agents') {
                        console.log(`[Live WS] J.A.R.V.I.S. listing connected agents`);
                        const agents = cliAgentRegistry.getAllAgents().map(a => ({
                          id: a.entry.id,
                          name: a.entry.name,
                          role: a.entry.role,
                          isAvailable: a.isAvailable,
                          version: a.version || 'unknown',
                          skills: a.entry.skills.map(s => s.name),
                          activeSessions: agentSessionManager.getSessionsByAgent(a.entry.id)
                            .filter(s => s.status === 'active' || s.status === 'busy')
                            .map(s => ({ sessionId: s.sessionId, commandCount: s.commandCount }))
                        }));
                        return {
                          id: callId,
                          name,
                          response: { result: { agents, totalAvailable: agents.filter(a => a.isAvailable).length } }
                        };
                      }

                      if (name === 'close_agent_session') {
                        const { sessionId } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. closing agent session: ${sessionId}`);
                        const closed = agentSessionManager.closeSession(sessionId);
                        return {
                          id: callId,
                          name,
                          response: { result: { closed, sessionId } }
                        };
                      }

                      if (name === 'abort_agent_task') {
                        const { sessionId } = args || {};
                        console.log(`[Live WS] J.A.R.V.I.S. aborting agent task: ${sessionId}`);
                        const aborted = agentSessionManager.abortCommand(sessionId);
                        return {
                          id: callId,
                          name,
                          response: { result: { aborted, sessionId } }
                        };
                      }

                      // ─── Hermes Sub-Agent & Parallel Execution ──────────────
                      if (name === 'delegate_to_hermes' || name === 'hermes_chat') {
                        const prompt = args?.prompt || args?.message || '';
                        const sessionName = args?.sessionName;
                        console.log(`[Live WS] Delegating to Hermes sub-agent: "${prompt.slice(0, 70)}..."`);

                        // Run task via ParallelTaskManager
                        const taskPromise = parallelTaskManager.executeParallelTask({
                          category: 'hermes',
                          title: `Hermes ⟶ ${prompt.slice(0, 50) || 'Deep Reasoning'}`,
                          prompt,
                          clientWs,
                          customExecution: async (updateProgress) => {
                            updateProgress('Hermes deep reasoning & personal vault synthesis...', 35);
                            const res = await execHermes(prompt, {
                              yolo: true,
                              sessionName,
                              mode: name === 'hermes_chat' ? 'chat' : 'oneshot'
                            });
                            updateProgress('Synthesizing Hermes response...', 85);

                            const displayCard = {
                              type: 'hermes_response',
                              title: `Hermes ⟶ ${prompt.slice(0, 50)}`,
                              data: {
                                text: res.text,
                                prompt,
                                sessionId: res.sessionId,
                                success: res.success,
                                error: res.error,
                                durationMs: res.durationMs
                              }
                            };

                            return {
                              success: res.success,
                              data: {
                                text: res.text,
                                sessionId: res.sessionId,
                                durationMs: res.durationMs
                              },
                              speechSummary: res.success
                                ? (res.text.length > 250 ? res.text.slice(0, 250) + '...' : res.text)
                                : `Hermes encountered an issue: ${res.error}`,
                              displayCard,
                              error: res.error
                            };
                          }
                        });

                        // Dual-Tier fast-path check (120ms): if completed ultra-fast, return directly
                        const fastResult: any = await Promise.race([
                          taskPromise,
                          new Promise<null>((res) => setTimeout(() => res(null), 120))
                        ]);

                        if (fastResult && fastResult.status === 'completed') {
                          return {
                            id: callId,
                            name,
                            response: {
                              result: {
                                status: 'completed',
                                result: fastResult.result,
                                displayCard: fastResult.displayCard
                              }
                            }
                          };
                        }

                        // Background handoff: Return immediate verbal acknowledgment to Gemini Live
                        // so speech audio streams <300ms without freezing full-duplex session
                        return {
                          id: callId,
                          name,
                          response: {
                            result: {
                              status: 'in_progress',
                              message: `Task delegated to Hermes sub-agent in background. Directive: Inform operator ${OPERATOR_NAME} in one brief, natural sentence that Hermes has begun working on "${prompt.slice(0, 50)}", and you will proactively report back the moment it completes.`
                            }
                          }
                        };
                      }

                      if (name === 'sync_hermes_memory') {
                        console.log('[Live WS] Synchronizing Hermes memories into sovereign vault...');
                        const syncRes = await syncHermesMemories();
                        return {
                          id: callId,
                          name,
                          response: { result: syncRes }
                        };
                      }

                      // Dynamic Self-Repair Fallback for Unhandled Tools
                      console.log(`[Live WS] Attempting dynamic self-repair for unhandled tool '${name}' with args:`, args);
                      const repair = await selfRepairEngine.interceptAndRepair(name, args, `Tool ${name} not recognized`);
                      if (repair.repaired) {
                        return {
                          id: callId,
                          name,
                          response: { result: { output: repair.result, repaired: true, strategy: repair.strategy } }
                        };
                      }

                      console.warn(`[Live WS] Unhandled tool '${name}'`);
                      return {
                        id: callId,
                        name,
                        response: { error: `Tool ${name} not recognized` }
                      };
                    } catch (toolErr: any) {
                      console.error(`[Live WS] Tool execution error in '${name}':`, toolErr);
                      const repair = await selfRepairEngine.interceptAndRepair(name, args, toolErr);
                      if (repair.repaired) {
                        return {
                          id: callId,
                          name,
                          response: { result: { output: repair.result, repaired: true, strategy: repair.strategy } }
                        };
                      }
                      return {
                        id: callId,
                        name,
                        response: { error: toolErr?.message || 'Execution error' }
                      };
                    }
                  }));

                  // Reply with all function responses simultaneously in one frame
                  if (session && functionResponses.length > 0) {
                    session.sendToolResponse({
                      functionResponses: functionResponses.map((fr: any) => ({
                        ...(fr.id ? { id: fr.id } : {}),
                        name: fr.name,
                        response: fr.response
                      }))
                    });
                  }
                }
              } catch (e) {
                console.error('[Live WS] Error processing message callback:', e);
              }
            },
            onerror: (err: any) => {
              console.error('[Live WS] Session error:', err);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: 'error', message: err?.message || 'Live session error' }));
              }
            },
            onclose: (event: any) => {
              const reason = event?.reason || (event && Object.keys(event).length > 0 ? JSON.stringify(event) : '');
              const code = event?.code;
              console.log(`[Live WS] Gemini live session closed (code: ${code}): ${reason || 'Normal close'}`);
              if (clientWs.readyState === WebSocket.OPEN) {
                if (code === 1008 || (typeof reason === 'string' && (reason.toLowerCase().includes('authentication') || reason.toLowerCase().includes('credential')))) {
                  clientWs.send(JSON.stringify({
                    type: 'error',
                    code: 'AUTH_FAILED',
                    message: 'Gemini API Key authentication failed. Please verify your GEMINI_API_KEY in AI Studio Settings > Secrets.'
                  }));
                } else if (code && code !== 1000) {
                  clientWs.send(JSON.stringify({
                    type: 'error',
                    code: 'DISCONNECTED',
                    message: reason ? `Live session disconnected (${reason})` : 'Live session disconnected. You can retry or switch to Demo Voice.'
                  }));
                }
              }
            }
          }
        });

        connected = true;
        console.log(`[Live WS] Connected successfully to Gemini Live using ${modelToTry}`);
        break;
      } catch (modelErr: any) {
        console.warn(`[Live WS] Attempt with model ${modelToTry} failed:`, modelErr?.message || modelErr);
        lastError = modelErr;
      }
    }

    if (!connected) {
      throw lastError || new Error('Failed to connect to any Gemini Live model');
    }

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'connected' }));
    }
      } catch (err: any) {
        console.error('[Live WS] Connection failed:', err);
        if (clientWs.readyState === WebSocket.OPEN) {
          const isAuth = err?.message?.includes('GEMINI_API_KEY') || err?.message?.includes('authentication') || err?.status === 401;
          clientWs.send(JSON.stringify({
            type: 'error',
            code: isAuth ? 'AUTH_FAILED' : 'CONNECT_ERROR',
            message: err?.message || 'Failed to connect to Gemini Live API. Please ensure your GEMINI_API_KEY is configured.'
          }));
        }
      }
    }

    clientWs.on('message', async (data: any) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'init' || msg.type === 'reinit' || msg.type === 'switch_persona') {
          console.log(`[Live WS] Persona/Voice Switch requested: ${msg.voiceName}`);
          await initSession({
            voiceName: msg.voiceName,
            systemInstruction: msg.systemInstruction,
            model: (msg.model && msg.model !== 'gemini-3.8-live' && msg.model !== 'gemini-8-flash-live') ? msg.model : 'gemini-3.1-flash-live-preview'
          });
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'persona_switched', voiceName: msg.voiceName }));
          }
          return;
        }

        if (msg.type === 'interrupt') {
          console.log('[Live WS] Client requested instant interruption');
          isModelSpeaking = false;
          currentTurnModelText = '';
          groqFastActuator.resetTurn();
          dualPathOrchestrator.handleInterruption(clientWs);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }
          return;
        }

        if (msg.type === 'audio' && msg.audio) {
          lastUserAudioTime = Date.now();
          if (session) {
            try {
              session.sendRealtimeInput({
                audio: {
                  data: msg.audio,
                  mimeType: 'audio/pcm;rate=16000'
                }
              });
            } catch (err) {
              console.error('[Live WS] Error sending audio input:', err);
            }
          }
        }

        if (msg.type === 'init_greeting') {
          console.log('[Live WS] Operator initialized session - synthesizing dynamic launch briefing...');
          const briefing = await generateLaunchBriefing(runMemoryBridge);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: 'launch_briefing',
              briefing
            }));
          }
          if (session) {
            try {
              session.sendRealtimeInput({
                text: `You are J.A.R.V.I.S. delivering your signature launch greeting. Speak the following verbatim with sophisticated, calm, and fluent delivery: "${briefing.spokenText}"`
              });
            } catch (err) {
              console.error('[Live WS] Error sending launch greeting to Gemini Live:', err);
            }
          }
          return;
        }

        if (msg.type === 'text' && msg.text) {
          // Intercept legacy launch greeting prompts so they never trigger dual-path background tasks or filler audio
          if (msg.text.includes('you have just initialized your 4-tier cognitive memory matrix')) {
            console.log('[Live WS] Intercepted legacy initialization prompt - routing to launch briefing...');
            const briefing = await generateLaunchBriefing(runMemoryBridge);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'launch_briefing',
                briefing
              }));
            }
            if (session) {
              try {
                session.sendRealtimeInput({
                  text: `You are J.A.R.V.I.S. delivering your signature launch greeting. Speak the following verbatim with sophisticated, calm, and fluent delivery: "${briefing.spokenText}"`
                });
              } catch (err) {
                console.error('[Live WS] Error sending launch greeting to Gemini Live:', err);
              }
            }
            return;
          }

          currentTurnUserText += ' ' + msg.text;
          groqFastActuator.processStreamingSpeech(currentTurnUserText, clientWs, runMemoryBridge);
          dualPathOrchestrator.processUtterance(msg.text, clientWs, { runMemoryBridge });
          if (session) {
            try {
              session.sendRealtimeInput({
                text: msg.text
              });
            } catch (err) {
              console.error('[Live WS] Error sending text input:', err);
            }
          }
        }

        if (msg.type === 'image' && msg.image) {
          if (session) {
            try {
              session.sendRealtimeInput({
                video: {
                  data: msg.image,
                  mimeType: msg.mimeType || 'image/jpeg'
                }
              });
            } catch (err) {
              console.error('[Live WS] Error sending image input:', err);
            }
          }
        }

        if (msg.type === 'cancel_continuous_plan') {
          continuousExecutionQueue.cancel(clientWs, 'Cancelled by operator');
        }

        if (msg.type === 'cancel_task' && msg.taskId) {
          console.log(`[Live WS] Operator cancelled task: ${msg.taskId}`);
          parallelTaskManager.cancelTask(msg.taskId);
        }

        if (msg.type === 'run_parallel_task') {
          const { category, title, prompt, args, skillName } = msg;
          console.log(`[Live WS] Operator requested parallel task [${category}]: ${title || prompt}`);
          parallelTaskManager.executeParallelTask({
            category,
            title,
            prompt,
            args,
            skillName,
            clientWs,
            customExecution: async (updateProgress) => {
              if (category === 'hermes' || skillName === 'delegate_to_hermes') {
                updateProgress('Hermes deep reasoning & vault synthesis...', 35);
                const res = await execHermes(prompt || args?.prompt || '', { yolo: true });
                updateProgress('Finalizing response...', 90);
                const displayCard = {
                  type: 'hermes_response',
                  title: title || `Hermes ⟶ ${(prompt || '').slice(0, 50)}`,
                  data: {
                    text: res.text,
                    prompt: prompt || args?.prompt,
                    sessionId: res.sessionId,
                    success: res.success,
                    error: res.error,
                    durationMs: res.durationMs
                  }
                };
                return {
                  success: res.success,
                  data: res,
                  speechSummary: res.success ? res.text.slice(0, 200) : `Hermes error: ${res.error}`,
                  displayCard,
                  error: res.error
                };
              }
              return { success: true, data: { status: 'completed' }, speechSummary: 'Task completed' };
            }
          });
        }
      } catch (err) {
        console.error('[Live WS] Error handling client message:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('[Live WS] Client disconnected');
      parallelTaskManager.unsubscribe(clientWs);
      unsubscribeTaskDone();
      unsubscribeTaskFail();
      if (cadenceTimer) {
        clearTimeout(cadenceTimer);
        cadenceTimer = null;
      }
      continuousExecutionQueue.cancelForClient(clientWs);
      dualPathOrchestrator.handleInterruption(clientWs);
      if (session) {
        try { session.close(); } catch (e) {}
        session = null;
      }
    });
  });

  // Prevent aggressive browser caching of pages/assets across project switches on localhost
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    next();
  });

  if (process.env.NODE_ENV !== 'production') {
    const frontendRoot = path.resolve(__dirname, '../frontend');
    const vite = await createViteServer({
      root: frontendRoot,
      configFile: path.resolve(frontendRoot, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${PORT} is already in use. Kill the process or change PORT in .env`);
      process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(PORT, BIND_HOST, () => {
    const localUrl = `http://localhost:${PORT}`;
    console.log(`Server running on ${localUrl} (bound to ${BIND_HOST}:${PORT})`);
    autoLaunchBrowser(localUrl);

    // Start zero-overhead autonomous AGI background pulse
    autonomousEngine.start(10000, (alert, data) => {
      if (alert !== 'heartbeat_telemetry') {
        console.log(`[Autonomous Alert] ${alert}`);
      }
      if (activeWss) {
        const payload = JSON.stringify({
          type: data?.type || (alert === 'heartbeat_telemetry' ? 'autonomous_heartbeat' : 'proactive_notification'),
          text: alert,
          data,
          timestamp: Date.now()
        });
        activeWss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      }
    });

    // Broadcast dynamic self-repair events
    selfRepairEngine.setTelemetryCallback((event) => {
      if (activeWss) {
        const payload = JSON.stringify({
          type: 'self_repair_event',
          ...event,
          timestamp: Date.now()
        });
        activeWss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      }
    });

    // Initialize Agent Space: discover host CLI agents and wire real-time WS broadcasts
    cliAgentRegistry.initialize().then(() => {
      console.log('[Server] Agent Space CLI registry initialized successfully.');
    }).catch(err => {
      console.warn('[Server] Agent Space initialization warning:', err.message);
    });

    // Wire delegation executor for DELEGATION_PATH
    dualPathOrchestrator.setDelegationExecutor(async ({ agentId, prompt, clientWs }) => {
      console.log(`[Server] DELEGATION_PATH executor invoked: agent=${agentId}, prompt="${prompt.slice(0, 80)}..."`);

      // Reuse the same logic as the delegate_to_hermes tool handler
      const taskPromise = parallelTaskManager.executeParallelTask({
        category: agentId === 'hermes' ? 'hermes' : 'agent',
        title: `${agentId.charAt(0).toUpperCase() + agentId.slice(1)} ⟶ ${prompt.slice(0, 50)}`,
        prompt,
        clientWs,
        customExecution: async (updateProgress) => {
          if (agentId === 'hermes') {
            updateProgress('Hermes deep reasoning & personal vault synthesis...', 35);
            const res = await execHermes(prompt, { yolo: true, mode: 'oneshot' });
            updateProgress('Synthesizing Hermes response...', 85);
            return {
              success: res.success,
              data: { text: res.text, sessionId: res.sessionId, durationMs: res.durationMs },
              speechSummary: res.success
                ? (res.text.length > 250 ? res.text.slice(0, 250) + '...' : res.text)
                : `Hermes encountered an issue: ${res.error}`,
              displayCard: {
                type: 'hermes_response',
                title: `Hermes ⟶ ${prompt.slice(0, 50)}`,
                data: { text: res.text, prompt, sessionId: res.sessionId, success: res.success, error: res.error, durationMs: res.durationMs }
              },
              error: res.error
            };
          } else {
            // For other agents, use agentSessionManager
            const session = agentSessionManager.openSession(agentId);
            const streamToClient = (chunk: string) => {
              if (clientWs && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'cli_agent_stream',
                  sessionId: session.sessionId,
                  agentId,
                  chunk
                }));
              }
            };
            const originalBroadcast = agentSessionManager.setBroadcast;
            agentSessionManager.setBroadcast((payload) => {
              if (clientWs && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify(payload));
              }
            });
            const result = await agentSessionManager.sendCommand(session.sessionId, prompt, { cwd: process.cwd() });
            agentSessionManager.setBroadcast(originalBroadcast);
            return {
              success: result.success,
              data: {
                text: result.output,
                sessionId: session.sessionId,
                durationMs: result.durationMs
              },
              speechSummary: result.success
                ? (result.output.length > 250 ? result.output.slice(0, 250) + '...' : result.output)
                : `Agent ${agentId} encountered an issue: ${result.error}`,
              displayCard: {
                type: 'agent_response',
                title: `${agentId} ⟶ ${prompt.slice(0, 50)}`,
                data: { text: result.output, prompt, sessionId: session.sessionId, success: result.success, error: result.error, durationMs: result.durationMs }
              },
              error: result.error
            };
          }
        }
      });

      // Dual-tier: return immediate acknowledgment, task continues in background
      return {
        status: 'in_progress',
        message: `Task delegated to ${agentId} in background. Directive: Inform operator ${OPERATOR_NAME} in one brief, natural sentence that ${agentId} has begun working on "${prompt.slice(0, 50)}", and you will proactively report back the moment it completes.`
      };
    });

    console.log('[Server] Delegation executor wired to DualPathOrchestrator');

    agentSessionManager.setBroadcast((payload) => {
      if (activeWss) {
        const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
        activeWss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        });
      }
    });

    // Start Autonomous Orchestrator (true AGI loop)
    autonomousOrchestrator.start();
    console.log('[Server] Autonomous Orchestrator started');

    // Start Evaluation Harness (self-improvement engine)
    evaluationHarness.start();
    console.log('[Server] Evaluation Harness started');

    // Register WebSocket clients with autonomous systems
    activeWss.on('connection', (ws) => {
      autonomousOrchestrator.registerClient(ws);
      evaluationHarness.registerClient(ws);
    });
  });
}

startServer();
