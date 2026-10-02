/**
 * J.A.R.V.I.S. Central Agent2Agent (A2A) Protocol Hub & Router
 * 
 * Standard-compliant implementation of the A2A Protocol (protocols/a2a):
 * 1. Hosts the J.A.R.V.I.S. Master Agent Card at /.well-known/agent.json
 * 2. Aggregates and discovers CLI, IDE, and Web agents into an active Directory
 * 3. Handles standard JSON-RPC 2.0 requests (tasks.send, tasks.get, tasks.cancel, agents.list)
 * 4. Broadcasts SSE/WebSocket telemetry events across connected clients
 */

import { Response } from 'express';
import {
  AgentCard,
  AgentDomain,
  A2ARequest,
  A2AResponse,
  A2ATask,
  A2ATaskStatus,
  A2AEvent,
  TaskSendParams
} from './a2a_types';
import { cliAgentRegistry } from './cli_agent_registry';
import { cliAgentBridge } from './cli_agent_bridge';
import { ideAgentBridge } from './ide_agent_bridge';
import { webAgentBridge } from './web_agent_bridge';

export class A2AHub {
  private tasks: Map<string, A2ATask> = new Map();
  private sseClients: Map<string, Set<Response>> = new Map(); // taskId -> Responses
  private globalSseClients: Set<Response> = new Set();
  private hostUrl: string;

  constructor(hostUrl: string = 'http://127.0.0.1:3000') {
    this.hostUrl = hostUrl;
  }

  /**
   * Generates the Master Agent Card for J.A.R.V.I.S. (served at /.well-known/agent.json)
   */
  public getMasterAgentCard(): AgentCard {
    const allAgents = this.listAllAgentCards();
    return {
      name: 'J.A.R.V.I.S. OS',
      description: 'Autonomous AI Operating System and Master Orchestration Hub for CLI, IDE, and Web agent squads.',
      url: `${this.hostUrl}/`,
      version: '2.0.0',
      domain: 'core',
      defaultInputModes: ['text', 'text/plain', 'application/json', 'audio/pcm;rate=16000'],
      defaultOutputModes: ['text', 'text/plain', 'application/json', 'audio/pcm;rate=24000'],
      capabilities: {
        streaming: true,
        pushNotifications: true,
        statePersistence: true,
        multiTurn: true
      },
      skills: [
        {
          id: 'orchestration',
          name: 'Multi-Agent Squad Orchestration',
          description: 'Coordinates specialized CLI, IDE, and Web agents to solve compound software engineering tasks.'
        },
        {
          id: 'voice_telemetry',
          name: 'Sub-Second Multimodal Voice Telemetry',
          description: 'Provides real-time conversational audio processing paired with an interactive React 19 HUD.'
        },
        ...allAgents.flatMap(a => a.skills.slice(0, 1))
      ],
      provider: {
        organization: 'J.A.R.V.I.S. Autonomous OS',
        url: this.hostUrl
      },
      status: 'active',
      lastSeen: Date.now()
    };
  }

  /**
   * Lists all connected Agent Cards across CLI, IDE, and Web domains.
   */
  public listAllAgentCards(): AgentCard[] {
    const cliCards = cliAgentRegistry.getAgentCards();
    const ideCards = ideAgentBridge.getAgentCards();
    const webCards = webAgentBridge.getAgentCards();
    return [...cliCards, ...ideCards, ...webCards];
  }

  /**
   * Retrieves an Agent Card by agent ID or name.
   */
  public getAgentCard(id: string): AgentCard | undefined {
    const cards = this.listAllAgentCards();
    const lower = id.toLowerCase();
    return cards.find(c => c.name.toLowerCase().includes(lower) || c.url.toLowerCase().includes(lower));
  }

  /**
   * Handles incoming standard JSON-RPC 2.0 A2A requests.
   */
  public async handleRpcRequest(body: A2ARequest): Promise<A2AResponse> {
    if (!body || body.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: body?.id ?? null,
        error: { code: -32600, message: 'Invalid Request: Must be JSON-RPC 2.0' }
      };
    }

    try {
      switch (body.method) {
        case 'agent.getCard': {
          const target = body.params?.agentId;
          const card = target ? this.getAgentCard(target) : this.getMasterAgentCard();
          if (!card) {
            return {
              jsonrpc: '2.0',
              id: body.id,
              error: { code: -32602, message: `Agent '${target}' not found` }
            };
          }
          return { jsonrpc: '2.0', id: body.id, result: card };
        }

        case 'agents.list': {
          return {
            jsonrpc: '2.0',
            id: body.id,
            result: {
              master: this.getMasterAgentCard(),
              agents: this.listAllAgentCards()
            }
          };
        }

        case 'tasks.send': {
          const params: TaskSendParams = body.params;
          if (!params || !params.targetAgent || !params.prompt) {
            return {
              jsonrpc: '2.0',
              id: body.id,
              error: { code: -32602, message: 'Invalid params: targetAgent and prompt are required' }
            };
          }

          const task = await this.createAndDispatchTask(params);
          return {
            jsonrpc: '2.0',
            id: body.id,
            result: {
              taskId: task.id,
              sessionId: task.sessionId,
              status: task.status,
              createdAt: task.createdAt
            }
          };
        }

        case 'tasks.get': {
          const taskId = body.params?.taskId;
          const task = this.tasks.get(taskId);
          if (!task) {
            return {
              jsonrpc: '2.0',
              id: body.id,
              error: { code: -32602, message: `Task '${taskId}' not found` }
            };
          }
          return { jsonrpc: '2.0', id: body.id, result: task };
        }

        case 'tasks.cancel': {
          const taskId = body.params?.taskId;
          const success = this.cancelTask(taskId);
          return { jsonrpc: '2.0', id: body.id, result: { taskId, cancelled: success } };
        }

        case 'tasks.list': {
          return {
            jsonrpc: '2.0',
            id: body.id,
            result: Array.from(this.tasks.values())
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id: body.id,
            error: { code: -32601, message: `Method '${body.method}' not implemented` }
          };
      }
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id: body.id,
        error: { code: -32603, message: 'Internal error', data: err?.message || String(err) }
      };
    }
  }

  /**
   * Creates an A2A task and dispatches it to the designated domain handler.
   */
  public async createAndDispatchTask(params: TaskSendParams): Promise<A2ATask> {
    const taskId = `a2a-task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const sessionId = params.sessionId || `session-${Date.now()}`;
    const target = params.targetAgent.toLowerCase();

    // Determine domain
    let domain: AgentDomain = 'cli';
    if (target.includes('orca') || target.includes('antigravity') || target.includes('cursor')) {
      domain = 'ide';
    } else if (target.includes('manus') || target.includes('web') || target.includes('browser')) {
      domain = 'web';
    }

    const task: A2ATask = {
      id: taskId,
      sessionId,
      sourceAgent: 'jarvis-core',
      targetAgent: params.targetAgent,
      domain,
      prompt: params.prompt,
      status: 'queued',
      createdAt: Date.now(),
      messages: [{ role: 'user', content: params.prompt, timestamp: Date.now() }],
      logs: []
    };

    this.tasks.set(taskId, task);
    this.broadcastEvent({
      taskId,
      type: 'status_changed',
      agent: params.targetAgent,
      domain,
      payload: { status: 'queued' },
      timestamp: Date.now()
    });

    // Asynchronously dispatch
    setImmediate(() => this.executeTask(task));

    return task;
  }

  private async executeTask(task: A2ATask): Promise<void> {
    task.status = 'running';
    task.startedAt = Date.now();

    this.broadcastEvent({
      taskId: task.id,
      type: 'status_changed',
      agent: task.targetAgent,
      domain: task.domain,
      payload: { status: 'running' },
      timestamp: Date.now()
    });

    try {
      if (task.domain === 'cli') {
        const result = await cliAgentBridge.executeTask({
          agentId: task.targetAgent,
          prompt: task.prompt,
          sessionId: task.sessionId,
          onChunk: (chunk) => {
            task.logs.push(chunk);
            this.broadcastEvent({
              taskId: task.id,
              type: 'token_stream',
              agent: task.targetAgent,
              domain: 'cli',
              payload: chunk,
              timestamp: Date.now()
            });
          },
          onStep: (step) => {
            this.broadcastEvent({
              taskId: task.id,
              type: 'step_progress',
              agent: task.targetAgent,
              domain: 'cli',
              payload: step,
              timestamp: Date.now()
            });
          }
        });

        task.status = result.success ? 'completed' : 'failed';
        task.output = result.output;
        task.error = result.error;
        task.completedAt = Date.now();

      } else if (task.domain === 'web') {
        const res = await webAgentBridge.dispatchA2ATask(task.prompt, task.sessionId);
        task.status = res.success ? 'completed' : 'failed';
        task.output = res.result;
        task.error = res.error;
        task.completedAt = Date.now();

      } else {
        // IDE Domain: Echo task with active IDE context
        const ctx = await ideAgentBridge.getIDEContext();
        task.status = 'completed';
        task.output = `Task routed to ${ctx.activeIDE || 'Local IDE'}. Context inspected.`;
        task.completedAt = Date.now();
      }

      this.broadcastEvent({
        taskId: task.id,
        type: task.status === 'completed' ? 'completed' : 'error',
        agent: task.targetAgent,
        domain: task.domain,
        payload: { output: task.output, error: task.error },
        timestamp: Date.now()
      });

    } catch (err: any) {
      task.status = 'failed';
      task.error = err?.message || String(err);
      task.completedAt = Date.now();

      this.broadcastEvent({
        taskId: task.id,
        type: 'error',
        agent: task.targetAgent,
        domain: task.domain,
        payload: { error: task.error },
        timestamp: Date.now()
      });
    }
  }

  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = 'cancelled';
    task.completedAt = Date.now();
    cliAgentBridge.abortSession(task.sessionId);

    this.broadcastEvent({
      taskId,
      type: 'status_changed',
      agent: task.targetAgent,
      domain: task.domain,
      payload: { status: 'cancelled' },
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Registers an SSE client for real-time task progress.
   */
  public registerSseClient(res: Response, taskId?: string): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    if (taskId) {
      if (!this.sseClients.has(taskId)) {
        this.sseClients.set(taskId, new Set());
      }
      this.sseClients.get(taskId)!.add(res);

      res.on('close', () => {
        this.sseClients.get(taskId)?.delete(res);
      });
    } else {
      this.globalSseClients.add(res);
      res.on('close', () => {
        this.globalSseClients.delete(res);
      });
    }
  }

  private broadcastEvent(event: A2AEvent): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;

    // Send to task-specific SSE clients
    const clients = this.sseClients.get(event.taskId);
    if (clients) {
      for (const client of clients) {
        try { client.write(data); } catch (_) {}
      }
    }

    // Send to global SSE clients
    for (const client of this.globalSseClients) {
      try { client.write(data); } catch (_) {}
    }
  }
}

export const a2aHub = new A2AHub();
