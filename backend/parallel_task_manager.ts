import { WebSocket } from 'ws';

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type TaskCategory =
  | 'hermes'
  | 'prime_agent'
  | 'ultron'
  | 'system'
  | 'weather'
  | 'news'
  | 'productivity'
  | 'obsidian'
  | 'research'
  | 'calculation'
  | 'data_fetch';

export interface BackgroundTask {
  id: string;
  type: TaskCategory;
  title: string;
  prompt?: string;
  status: TaskStatus;
  startTime: number;
  completedTime?: number;
  durationMs?: number;
  progressPercent?: number;
  progressMessage?: string;
  verbalAcknowledgment?: string;
  speechSummary?: string;
  result?: any;
  displayCard?: {
    type: string;
    title: string;
    data: any;
  };
  sources?: any[];
  error?: string;
}

export function generateVerbalAcknowledgment(category: TaskCategory, target?: string): string {
  switch (category) {
    case 'hermes':
      return target
        ? `Routing complex task to Hermes: ${target.slice(0, 45)}.`
        : 'Routing complex request to Hermes personal intelligence.';
    case 'prime_agent':
      return target
        ? `Dispatching coding task to Prime Agent: ${target.slice(0, 45)}.`
        : 'Dispatching coding and software engineering task to Prime Agent.';
    case 'ultron':
      return target
        ? `Engaging Ultron for system diagnostics: ${target.slice(0, 40)}.`
        : 'Engaging Ultron for deep system monitoring, diagnostics, and performance optimization.';
    case 'system':
      return target
        ? `Executing system control: ${target.slice(0, 40)}.`
        : 'Executing system command directly.';
    case 'weather':
      return target
        ? `Checking live weather conditions and forecast for ${target}.`
        : 'Scanning real-time weather and forecast data now.';
    case 'news':
      return target
        ? `Fetching top ${target} headlines from live feeds.`
        : 'Pulling the latest breaking news and headlines now.';
    case 'productivity':
      return 'Updating your scheduled reminders in the background.';
    case 'obsidian':
      return target
        ? `Searching your Obsidian memory vault for "${target.slice(0, 30)}".`
        : 'Looking up notes in your Obsidian memory vault.';
    case 'research':
      return target
        ? `Investigating web intelligence for "${target.slice(0, 30)}".`
        : 'Grounding research with live web sources.';
    case 'calculation':
      return 'Evaluating calculation in parallel.';
    default:
      return 'Processing your request in the background.';
  }
}

export function inferCategoryFromSkill(skillName: string): TaskCategory {
  const s = skillName.toLowerCase();
  if (s.includes('hermes')) return 'hermes';
  if (s.includes('prime') || s.includes('coding') || s.includes('agy')) return 'prime_agent';
  if (s.includes('ultron') || s.includes('security') || s.includes('guard')) return 'ultron';
  if (s.includes('weather')) return 'weather';
  if (s.includes('news')) return 'news';
  if (s.includes('reminder') || s.includes('productivity')) return 'productivity';
  if (s.includes('obsidian') || s.includes('vault') || s.includes('memory')) return 'obsidian';
  if (s.includes('research') || s.includes('search_internet')) return 'research';
  if (s.includes('calc') || s.includes('math')) return 'calculation';
  if (s.includes('system') || s.includes('launch') || s.includes('process') || s.includes('volume') || s.includes('brightness')) return 'system';
  return 'data_fetch';
}

class ParallelTaskManager {
  private activeTasks: Map<string, BackgroundTask> = new Map();
  private completedTasks: BackgroundTask[] = [];
  private maxHistory: number = 50;
  private subscribers: Set<WebSocket> = new Set();

  public subscribe(ws: WebSocket) {
    this.subscribers.add(ws);
    ws.on('close', () => {
      this.subscribers.delete(ws);
    });
  }

  public unsubscribe(ws: WebSocket) {
    this.subscribers.delete(ws);
  }

  public hasActiveClients(): boolean {
    for (const ws of this.subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        return true;
      }
    }
    return false;
  }

  public getSubscriberCount(): number {
    let count = 0;
    for (const ws of this.subscribers) {
      if (ws.readyState === WebSocket.OPEN) count++;
    }
    return count;
  }

  public broadcast(payload: any, targetWs?: WebSocket) {
    const raw = JSON.stringify(payload);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      try {
        targetWs.send(raw);
      } catch {}
    }
    for (const ws of this.subscribers) {
      if (ws !== targetWs && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(raw);
        } catch {}
      }
    }
  }

  public getActiveTasks(): BackgroundTask[] {
    return Array.from(this.activeTasks.values());
  }

  public getCompletedTasks(): BackgroundTask[] {
    return [...this.completedTasks];
  }

  public getTask(id: string): BackgroundTask | undefined {
    return this.activeTasks.get(id) || this.completedTasks.find((t) => t.id === id);
  }

  public cancelTask(id: string): boolean {
    const task = this.activeTasks.get(id);
    if (!task) return false;
    task.status = 'cancelled';
    task.completedTime = Date.now();
    task.durationMs = task.completedTime - task.startTime;
    task.progressMessage = 'Task cancelled by operator.';
    this.activeTasks.delete(id);
    this.completedTasks.unshift(task);
    this.broadcast({
      type: 'task_cancelled',
      taskId: id,
      task,
      timestamp: Date.now(),
    });
    return true;
  }

  /**
   * Run a background task with parallel execution and immediate verbal + UI notifications
   */
  public async executeParallelTask(options: {
    skillName?: string;
    args?: any;
    category?: TaskCategory;
    title?: string;
    prompt?: string;
    clientWs?: WebSocket;
    customExecution?: (updateProgress: (msg: string, pct?: number) => void) => Promise<{
      success: boolean;
      data: any;
      speechSummary?: string;
      displayCard?: any;
      sources?: any[];
      error?: string;
    }>;
  }): Promise<BackgroundTask> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const category: TaskCategory =
      options.category || (options.skillName ? inferCategoryFromSkill(options.skillName) : 'data_fetch');

    let title = options.title;
    if (!title) {
      if (category === 'hermes') {
        const hp = options.args?.prompt || options.prompt || '';
        title = hp ? `Hermes ⟶ ${hp.slice(0, 50)}` : 'Hermes Complex Delegation';
      } else if (category === 'prime_agent') {
        const pp = options.args?.prompt || options.prompt || '';
        title = pp ? `Prime Agent ⟶ ${pp.slice(0, 50)}` : 'Prime Coding Delegation';
      } else if (category === 'ultron') {
        title = `Ultron ⟶ ${options.args?.action || 'System Audit'}`;
      } else if (category === 'weather') {
        title = `Live Weather: ${options.args?.location || 'Current Location'}`;
      } else if (category === 'news') {
        title = `News Headlines: ${options.args?.category || options.args?.topic || 'Top Stories'}`;
      } else if (category === 'productivity') {
        title = `Reminders: ${options.args?.title || 'manage'}`;
      } else if (category === 'obsidian') {
        title = `Obsidian: ${options.args?.query || 'Vault Query'}`;
      } else if (category === 'system') {
        title = `System Control: ${options.skillName || 'Action'}`;
      } else {
        title = options.prompt ? options.prompt.slice(0, 40) : 'Parallel Task Execution';
      }
    }

    const verbalAcknowledgment = generateVerbalAcknowledgment(
      category,
      options.args?.location || options.args?.topic || options.args?.query || options.args?.prompt || options.prompt
    );

    const task: BackgroundTask = {
      id: taskId,
      type: category,
      title,
      prompt: options.prompt || options.args?.prompt,
      status: 'running',
      startTime: Date.now(),
      progressPercent: 15,
      progressMessage: `Initiating ${category.toUpperCase()} parallel delegation...`,
      verbalAcknowledgment,
    };

    this.activeTasks.set(taskId, task);

    // 1. Immediately emit task_started event with immediate verbal acknowledgment to client UI
    this.broadcast(
      {
        type: 'task_started',
        taskId,
        task,
        verbalAcknowledgment,
        timestamp: Date.now(),
      },
      options.clientWs
    );

    const updateProgress = (msg: string, pct?: number) => {
      if (task.status !== 'running') return;
      task.progressMessage = msg;
      if (pct !== undefined) task.progressPercent = pct;
      this.broadcast(
        {
          type: 'task_progress',
          taskId,
          progressMessage: msg,
          progressPercent: task.progressPercent,
          timestamp: Date.now(),
        },
        options.clientWs
      );
    };

    // 2. Execute concurrently in background without blocking the caller
    (async () => {
      try {
        let executionResult: {
          success: boolean;
          data: any;
          speechSummary?: string;
          displayCard?: any;
          sources?: any[];
          error?: string;
        };

        if (options.customExecution) {
          executionResult = await options.customExecution(updateProgress);
        } else {
          throw new Error('No customExecution runner provided for parallel task');
        }

        task.status = executionResult.success ? 'completed' : 'failed';
        task.completedTime = Date.now();
        task.durationMs = task.completedTime - task.startTime;
        task.progressPercent = 100;
        task.progressMessage = executionResult.success
          ? 'Completed successfully'
          : (executionResult.error || 'Execution failed');
        task.result = executionResult.data;
        task.speechSummary = executionResult.speechSummary;
        task.displayCard = executionResult.displayCard;
        task.sources = executionResult.sources;
        task.error = executionResult.error;

        this.activeTasks.delete(taskId);
        this.completedTasks.unshift(task);
        if (this.completedTasks.length > this.maxHistory) {
          this.completedTasks.pop();
        }

        // 3. Emit task_completed or task_failed
        if (executionResult.success) {
          this.broadcast(
            {
              type: 'task_completed',
              taskId,
              task,
              displayCard: task.displayCard,
              result: task.result,
              speechSummary: task.speechSummary,
              sources: task.sources,
              durationMs: task.durationMs,
              timestamp: Date.now(),
            },
            options.clientWs
          );
        } else {
          this.broadcast(
            {
              type: 'task_failed',
              taskId,
              task,
              error: task.error,
              durationMs: task.durationMs,
              timestamp: Date.now(),
            },
            options.clientWs
          );
        }
      } catch (err: any) {
        console.error(`[ParallelTaskManager] Task ${taskId} error:`, err);
        task.status = 'failed';
        task.completedTime = Date.now();
        task.durationMs = task.completedTime - task.startTime;
        task.error = err?.message || String(err);
        task.progressMessage = `Failed: ${task.error}`;

        this.activeTasks.delete(taskId);
        this.completedTasks.unshift(task);
        if (this.completedTasks.length > this.maxHistory) {
          this.completedTasks.pop();
        }

        this.broadcast(
          {
            type: 'task_failed',
            taskId,
            task,
            error: task.error,
            durationMs: task.durationMs,
            timestamp: Date.now(),
          },
          options.clientWs
        );
      }
    })();

    return task;
  }
}

export const parallelTaskManager = new ParallelTaskManager();
