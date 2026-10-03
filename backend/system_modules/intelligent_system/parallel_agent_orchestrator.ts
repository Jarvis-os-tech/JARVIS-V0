/**
 * J.A.R.V.I.S. Parallel Multi-Agent Orchestrator
 * 
 * Orchestrates concurrent, parallel execution across multiple CLI agents
 * (AGY, OMH, Codex, Hermes, OpenClaw) under OpenShell security governance.
 * 
 * Capabilities:
 * 1. True Parallel Execution: Dispatches N agents simultaneously via Promise.allSettled.
 * 2. Execution Modes:
 *    - 'tmux': Runs each agent in a detached, named tmux pane (persistent, inspectable from CLI).
 *    - 'direct': Runs each agent via direct process spawn with YOLO auto-approval and piping.
 * 3. OpenShell Integration: Evaluates OpenShell policy and sanitizes environment credentials.
 * 4. Real-Time Streaming: Broadcasts streaming output chunks per agent to connected UI clients.
 * 5. Lifecycle Management: Abort individual agents, abort entire batch, query task status.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { cliAgentRegistry } from './cli_agent_registry';
import { cliAgentBridge, CLITaskResult } from './cli_agent_bridge';
import { tmuxSessionBus } from './tmux_session_bus';
import { openShellPolicyEngine } from './openshell_policy';
import { openShellRuntime } from './openshell_runtime';
import { assertAuthorizedWorkspace } from './workspace_policy';

export type AgentExecutionMode = 'tmux' | 'direct';

export interface ParallelAgentRequest {
  agentId: string;
  prompt: string;
  mode?: AgentExecutionMode;
  cwd?: string;
  timeoutMs?: number;
  openShellEnabled?: boolean;
}

export interface ParallelAgentTask {
  taskId: string;
  batchId: string;
  agentId: string;
  agentName: string;
  prompt: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  mode: AgentExecutionMode;
  sessionName?: string;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  output: string;
  error?: string;
  exitCode?: number | null;
  openShellSecured: boolean;
  policyApplied: string;
}

export interface ParallelBatchResult {
  batchId: string;
  totalAgents: number;
  completed: number;
  failed: number;
  cancelled: number;
  tasks: ParallelAgentTask[];
}

export class ParallelAgentOrchestrator {
  private tasks: Map<string, ParallelAgentTask> = new Map();
  private batchMap: Map<string, string[]> = new Map(); // batchId -> taskIds[]
  private activeAbortControllers: Map<string, AbortController> = new Map();
  private broadcaster: ((payload: any) => void) | null = null;
  private maxHistory: number = 50;

  public setBroadcaster(broadcaster: (payload: any) => void): void {
    this.broadcaster = broadcaster;
  }

  private broadcast(payload: any): void {
    if (this.broadcaster) {
      try {
        this.broadcaster(payload);
      } catch (err) {
        console.warn('[ParallelOrchestrator] Broadcast error:', err);
      }
    }
  }

  /**
   * Dispatches multiple agent tasks in true parallel concurrency.
   * Returns immediately with the batch and tasks metadata while execution runs in the background.
   */
  public async dispatchParallelBatch(requests: ParallelAgentRequest[]): Promise<{ batchId: string; tasks: ParallelAgentTask[] }> {
    if (!requests || requests.length === 0) {
      throw new Error('No agent tasks provided for parallel dispatch.');
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const taskRecords: ParallelAgentTask[] = [];
    const taskIds: string[] = [];

    // Initialize all task states
    for (const req of requests) {
      const agent = cliAgentRegistry.getAgent(req.agentId);
      const agentName = agent?.entry.name || req.agentId;
      const taskId = `ptask_${req.agentId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const preferredMode: AgentExecutionMode = req.mode || (tmuxSessionBus.checkInstallation() ? 'tmux' : 'direct');

      // OpenShell Policy Check
      const openShellEvaluation = openShellPolicyEngine.evaluateToolExecution(`agent_execute_${req.agentId}`, {
        agentId: req.agentId,
        cwd: req.cwd
      });

      const task: ParallelAgentTask = {
        taskId,
        batchId,
        agentId: req.agentId,
        agentName,
        prompt: req.prompt,
        status: 'queued',
        mode: preferredMode,
        sessionName: preferredMode === 'tmux' ? `jarvis_${req.agentId}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_') : undefined,
        startedAt: Date.now(),
        output: '',
        openShellSecured: req.openShellEnabled !== false && openShellEvaluation.allowed,
        policyApplied: openShellEvaluation.reason
      };

      this.tasks.set(taskId, task);
      taskRecords.push(task);
      taskIds.push(taskId);
    }

    this.batchMap.set(batchId, taskIds);

    // Broadcast batch started event
    this.broadcast({
      type: 'parallel_batch_started',
      batchId,
      tasks: taskRecords,
      timestamp: Date.now()
    });

    // Launch ALL agent tasks simultaneously in background without blocking
    setImmediate(() => {
      this.executeBatchConcurrent(batchId, requests, taskRecords);
    });

    return { batchId, tasks: taskRecords };
  }

  /**
   * Internal runner that executes all agent tasks in true parallel using Promise.allSettled.
   */
  private async executeBatchConcurrent(
    batchId: string,
    requests: ParallelAgentRequest[],
    tasks: ParallelAgentTask[]
  ): Promise<void> {
    const promises = tasks.map((task, idx) => {
      const req = requests[idx];
      return this.executeSingleTask(task, req);
    });

    await Promise.allSettled(promises);

    // Compute batch totals
    const completedTasks = tasks.map(t => this.tasks.get(t.taskId) || t);
    const summary: ParallelBatchResult = {
      batchId,
      totalAgents: completedTasks.length,
      completed: completedTasks.filter(t => t.status === 'completed').length,
      failed: completedTasks.filter(t => t.status === 'failed').length,
      cancelled: completedTasks.filter(t => t.status === 'cancelled').length,
      tasks: completedTasks
    };

    console.log(`[ParallelOrchestrator] Batch ${batchId} finished: ${summary.completed} succeeded, ${summary.failed} failed, ${summary.cancelled} cancelled`);

    this.broadcast({
      type: 'parallel_batch_completed',
      batchId,
      summary,
      timestamp: Date.now()
    });
  }

  /**
   * Executes a single agent task using either tmux pane or direct OpenShell process.
   */
  private async executeSingleTask(task: ParallelAgentTask, req: ParallelAgentRequest): Promise<void> {
    const agent = cliAgentRegistry.getAgent(task.agentId);
    if (!agent || !agent.isAvailable || !agent.resolvedPath) {
      task.status = 'failed';
      task.error = `Agent '${task.agentId}' is not installed or unavailable on this system.`;
      task.completedAt = Date.now();
      task.durationMs = task.completedAt - task.startedAt;
      this.broadcastTaskStatus(task);
      return;
    }

    task.status = 'running';
    this.broadcastTaskStatus(task);

    const abortController = new AbortController();
    this.activeAbortControllers.set(task.taskId, abortController);

    const cwd = assertAuthorizedWorkspace(req.cwd || process.cwd());
    const timeoutMs = req.timeoutMs || 300000;

    // Apply OpenShell Environment Sanitization
    const sanitizedEnv = openShellPolicyEngine.createSanitizedEnvironment({
      JARVIS_PARALLEL_TASK_ID: task.taskId,
      JARVIS_AGENT_ID: task.agentId,
      CI: '1',
      FORCE_COLOR: '0',
      PAGER: 'cat'
    });

    try {
      if (task.mode === 'tmux') {
        await this.runViaTmux(task, agent, cwd, sanitizedEnv, timeoutMs, abortController.signal);
      } else {
        await this.runViaDirectProcess(task, agent, cwd, sanitizedEnv, timeoutMs, abortController.signal);
      }
    } catch (err: any) {
      task.status = 'failed';
      task.error = err?.message || String(err);
      task.completedAt = Date.now();
      task.durationMs = task.completedAt - task.startedAt;
      this.broadcastTaskStatus(task);
    } finally {
      this.activeAbortControllers.delete(task.taskId);
    }
  }

  /**
   * Executes an agent task inside an isolated tmux session.
   */
  private async runViaTmux(
    task: ParallelAgentTask,
    agent: any,
    cwd: string,
    env: Record<string, string>,
    timeoutMs: number,
    abortSignal: AbortSignal
  ): Promise<void> {
    const sessionName = task.sessionName || `jarvis_${task.agentId}_${Date.now()}`;
    task.sessionName = sessionName;

    // Build the command line using the agent's commandTemplate
    const tmpQueryFile = path.join(
      os.tmpdir(),
      `jarvis_ptask_${task.agentId}_${Date.now()}.tmp`
    );
    fs.writeFileSync(tmpQueryFile, task.prompt.trim(), 'utf-8');

    const template = agent.entry.commandTemplate?.initial || ['{prompt}'];
    const args = template.map((arg: string) => {
      return arg
        .replace('{prompt}', task.prompt.trim().replace(/"/g, '\\"'))
        .replace('{sessionId}', sessionName)
        .replace('{queryFile}', tmpQueryFile);
    });

    const fullCommand = `"${agent.resolvedPath}" ${args.map((a: string) => `"${a}"`).join(' ')}`;

    console.log(`[ParallelOrchestrator] Spawning ${task.agentId} in tmux session: ${sessionName}`);

    const sessionRes = await tmuxSessionBus.createAgentSession({
      sessionName,
      command: fullCommand,
      cwd,
      env
    });

    if (!sessionRes.success) {
      throw new Error(sessionRes.error || 'Failed to create tmux session');
    }

    return new Promise((resolve) => {
      let isCompleted = false;

      // Handle abort
      abortSignal.addEventListener('abort', async () => {
        if (!isCompleted) {
          isCompleted = true;
          await tmuxSessionBus.killSession(sessionName);
          task.status = 'cancelled';
          task.completedAt = Date.now();
          task.durationMs = task.completedAt - task.startedAt;
          task.error = 'Task cancelled by operator';
          try { if (fs.existsSync(tmpQueryFile)) fs.unlinkSync(tmpQueryFile); } catch {}
          this.broadcastTaskStatus(task);
          resolve();
        }
      });

      // Stream output from tmux pane
      tmuxSessionBus.streamSessionOutput(
        sessionName,
        (chunk) => {
          task.output += chunk;
          this.broadcast({
            type: 'parallel_agent_stream',
            batchId: task.batchId,
            taskId: task.taskId,
            agentId: task.agentId,
            agentName: task.agentName,
            chunk,
            timestamp: Date.now()
          });
        },
        (exitCode, finalOutput) => {
          if (isCompleted) return;
          isCompleted = true;

          task.exitCode = exitCode;
          task.output = finalOutput || task.output;
          task.status = exitCode === 0 ? 'completed' : 'failed';
          if (exitCode !== 0 && !task.error) {
            task.error = `Agent process exited with code ${exitCode}`;
          }
          task.completedAt = Date.now();
          task.durationMs = task.completedAt - task.startedAt;

          try { if (fs.existsSync(tmpQueryFile)) fs.unlinkSync(tmpQueryFile); } catch {}
          this.broadcastTaskStatus(task);
          resolve();
        },
        { timeoutMs }
      );
    });
  }

  /**
   * Executes an agent task via direct process spawn with streaming and OpenShell protection.
   */
  private async runViaDirectProcess(
    task: ParallelAgentTask,
    agent: any,
    cwd: string,
    env: Record<string, string>,
    timeoutMs: number,
    abortSignal: AbortSignal
  ): Promise<void> {
    console.log(`[ParallelOrchestrator] Spawning ${task.agentId} in direct process mode`);

    const result: CLITaskResult = await cliAgentBridge.executeTask({
      agentId: task.agentId,
      prompt: task.prompt,
      cwd,
      timeoutMs,
      yoloMode: true,
      abortSignal,
      onChunk: (chunk) => {
        task.output += chunk;
        this.broadcast({
          type: 'parallel_agent_stream',
          batchId: task.batchId,
          taskId: task.taskId,
          agentId: task.agentId,
          agentName: task.agentName,
          chunk,
          timestamp: Date.now()
        });
      }
    });

    task.exitCode = result.exitCode;
    task.output = result.output;
    task.status = result.success ? 'completed' : 'failed';
    task.error = result.error;
    task.completedAt = Date.now();
    task.durationMs = result.durationMs;

    this.broadcastTaskStatus(task);
  }

  private broadcastTaskStatus(task: ParallelAgentTask): void {
    this.broadcast({
      type: 'parallel_agent_status',
      batchId: task.batchId,
      taskId: task.taskId,
      agentId: task.agentId,
      task,
      timestamp: Date.now()
    });
  }

  // ─── Query & Control ────────────────────────────────────────────────────────

  public getTask(taskId: string): ParallelAgentTask | undefined {
    return this.tasks.get(taskId);
  }

  public getBatchTasks(batchId: string): ParallelAgentTask[] {
    const taskIds = this.batchMap.get(batchId) || [];
    return taskIds.map(id => this.tasks.get(id)).filter(Boolean) as ParallelAgentTask[];
  }

  public getActiveTasks(): ParallelAgentTask[] {
    return Array.from(this.tasks.values()).filter(
      t => t.status === 'queued' || t.status === 'running'
    );
  }

  public getAllTasks(): ParallelAgentTask[] {
    return Array.from(this.tasks.values());
  }

  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const controller = this.activeAbortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.activeAbortControllers.delete(taskId);
    }

    if (task.sessionName && task.mode === 'tmux') {
      tmuxSessionBus.killSession(task.sessionName);
    }

    task.status = 'cancelled';
    task.completedAt = Date.now();
    task.durationMs = task.completedAt - task.startedAt;
    task.error = 'Task cancelled by operator';
    this.broadcastTaskStatus(task);
    return true;
  }

  public cancelBatch(batchId: string): boolean {
    const taskIds = this.batchMap.get(batchId) || [];
    let anyCancelled = false;
    for (const id of taskIds) {
      if (this.cancelTask(id)) {
        anyCancelled = true;
      }
    }
    return anyCancelled;
  }

  public cancelAll(): void {
    for (const taskId of this.activeAbortControllers.keys()) {
      this.cancelTask(taskId);
    }
  }
}

export const parallelAgentOrchestrator = new ParallelAgentOrchestrator();
