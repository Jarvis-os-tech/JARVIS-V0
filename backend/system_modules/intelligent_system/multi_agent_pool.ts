/**
 * J.A.R.V.I.S. Background Multi-Agent Pool
 * 
 * Mandates:
 * 1. Jarvis is the Orchestrator; Multi-Agents execute all heavy reasoning, coding, and shell tasks.
 * 2. Background agents run SILENTLY (no distinct voices). They return structured technical data.
 * 3. Provider Support: Google Gemini (gemini-2.5-pro), NVIDIA NIM, OmniRoute, and shell_and_tasks.py.
 * 4. Multi-Account Key Pooling & Auto-Failover on HTTP 429.
 */

import { GoogleGenAI } from '@google/genai';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { AgentRole, AgentTask, AgentTaskResult, TaskStatus } from './dual_path_types';
import { KeyPoolRotator } from './key_pool_rotator';
import { executeSkillScript, loadSkillContent } from '../../skills_manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MultiAgentPool {
  private tasks: Map<string, AgentTask> = new Map();
  private runningCount: number = 0;
  private maxConcurrent: number;
  private taskWaiters: Map<string, Array<(result: AgentTaskResult) => void>> = new Map();

  // Provider Key Rotators
  private geminiKeyRotator: KeyPoolRotator;
  private nvidiaKeyRotator: KeyPoolRotator;

  constructor(options?: { maxConcurrent?: number }) {
    this.maxConcurrent = options?.maxConcurrent || 2;
    this.geminiKeyRotator = new KeyPoolRotator('GEMINI_API_KEY');
    this.nvidiaKeyRotator = new KeyPoolRotator('NVIDIA_API_KEY');
  }

  /**
   * Submits a complex task to the background multi-agent pool.
   */
  public async submitTask(task: Omit<AgentTask, 'status' | 'createdAt'>): Promise<AgentTask> {
    const fullTask: AgentTask = {
      ...task,
      status: TaskStatus.QUEUED,
      createdAt: Date.now(),
      logs: []
    };

    fullTask.abortController = new AbortController();
    this.tasks.set(fullTask.id, fullTask);

    // Trigger non-blocking asynchronous processing
    setImmediate(() => this.processQueue());

    return fullTask;
  }

  /**
   * Awaits task completion with timeout guard.
   */
  public waitForTask(taskId: string, timeoutMs: number = 25000): Promise<AgentTaskResult> {
    return new Promise((resolve, reject) => {
      const task = this.tasks.get(taskId);
      if (!task) {
        return reject(new Error(`Task '${taskId}' not found in MultiAgentPool`));
      }

      if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED || task.status === TaskStatus.CANCELLED) {
        return resolve(this.buildTaskResult(task));
      }

      const timeoutId = setTimeout(() => {
        this.abortTask(taskId, `Task timed out after ${timeoutMs}ms`);
        reject(new Error(`Task '${taskId}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      if (!this.taskWaiters.has(taskId)) {
        this.taskWaiters.set(taskId, []);
      }

      this.taskWaiters.get(taskId)!.push((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      });
    });
  }

  /**
   * Aborts an active or queued background task cleanly.
   */
  public abortTask(taskId: string, reason: string = 'Aborted by user'): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.abortController) {
      task.abortController.abort();
    }

    task.status = TaskStatus.CANCELLED;
    task.error = reason;
    task.completedAt = Date.now();
    task.logs?.push(`[Cancellation] ${reason}`);

    this.notifyWaiters(task);
    return true;
  }

  /**
   * Processes the task queue respecting concurrency limits.
   */
  private async processQueue(): Promise<void> {
    if (this.runningCount >= this.maxConcurrent) return;

    for (const task of this.tasks.values()) {
      if (task.status === TaskStatus.QUEUED && this.runningCount < this.maxConcurrent) {
        this.executeTask(task);
      }
    }
  }

  /**
   * Dispatches task to the specialized agent worker.
   */
  private async executeTask(task: AgentTask): Promise<void> {
    task.status = TaskStatus.RUNNING;
    task.startedAt = Date.now();
    this.runningCount++;

    task.logs?.push(`[Agent Dispatch] Dispatched to role: ${task.role}`);

    try {
      let output: string = '';

      switch (task.role) {
        case AgentRole.ENGINEER:
          output = await this.executeEngineeringAgent(task);
          break;
        case AgentRole.REASONING:
          output = await this.executeReasoningAgent(task);
          break;
        case AgentRole.SHELL_RUNNER:
          output = await this.executeShellAgent(task);
          break;
        case AgentRole.RESEARCHER:
          output = await this.executeResearcherAgent(task);
          break;
        default:
          output = await this.executeEngineeringAgent(task);
          break;
      }

      task.result = output;
      task.status = TaskStatus.COMPLETED;
    } catch (err: any) {
      if (task.abortController?.signal.aborted) {
        task.status = TaskStatus.CANCELLED;
        task.error = 'Task aborted during execution';
      } else {
        task.status = TaskStatus.FAILED;
        task.error = err?.message || String(err);
      }
    } finally {
      task.completedAt = Date.now();
      this.runningCount = Math.max(0, this.runningCount - 1);
      this.notifyWaiters(task);
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Engineering Agent: Uses Gemini 2.5 Pro or OmniRoute for complex coding and refactoring.
   */
  private async executeEngineeringAgent(task: AgentTask): Promise<string> {
    const prompt = task.payload.prompt || task.title;

    if (process.env.NODE_ENV === 'test') {
      task.logs?.push('[Test Harness] Simulated engineering synthesis completed.');
      return `Engineering analysis completed for task: ${prompt}`;
    }

    // 1. Try OmniRoute if active on host
    const omniBase = process.env.OMNIROUTE_BASE_URL || 'http://127.0.0.1:20128/v1';
    const omniKey = process.env.OMNIROUTE_API_KEY || 'omniroute-key';
    const omniModel = process.env.OMNIROUTE_MODEL || 'auto/best-coding';

    try {
      const omniRes = await fetch(`${omniBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${omniKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: omniModel,
          messages: [
            { role: 'system', content: 'You are J.A.R.V.I.S. Senior Software Engineering Agent. Produce clean, complete, high-quality code and analysis.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000
        }),
        signal: task.abortController?.signal
      });

      if (omniRes.ok) {
        const data: any = await omniRes.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          task.logs?.push(`[OmniRoute] Executed successfully via ${omniModel}`);
          return text;
        }
      }
    } catch (e) {
      // OmniRoute not active; fall back smoothly to Gemini 2.5 Pro
    }

    // 2. Gemini 2.5 Pro Native
    const key = this.geminiKeyRotator.getActiveKey();
    if (!key) throw new Error('No GEMINI_API_KEY available for Engineering Agent');

    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: 'You are J.A.R.V.I.S. Senior Software Engineering Agent. Solve the requested complex engineering task with complete code and architectural precision.'
      }
    });

    this.geminiKeyRotator.reportSuccess(key);
    task.logs?.push('[Gemini 2.5 Pro] Engineering synthesis completed.');
    return response.text || 'Engineering analysis complete.';
  }

  /**
   * Reasoning Agent: Uses NVIDIA NIM or Gemini 2.5 Pro for deep multi-step logic.
   */
  private async executeReasoningAgent(task: AgentTask): Promise<string> {
    const prompt = task.payload.prompt || task.title;

    if (process.env.NODE_ENV === 'test') {
      task.logs?.push('[Test Harness] Simulated reasoning synthesis completed.');
      return `Reasoning analysis completed for task: ${prompt}`;
    }

    const nvidiaKey = this.nvidiaKeyRotator.getActiveKey();

    if (nvidiaKey) {
      try {
        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nvidiaKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta/llama-3.3-70b-instruct',
            messages: [
              { role: 'system', content: 'You are J.A.R.V.I.S. Deep Reasoning Agent. Provide exhaustive, step-by-step logical reasoning.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 1500,
            temperature: 0.2
          }),
          signal: task.abortController?.signal
        });

        if (res.ok) {
          const data: any = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            this.nvidiaKeyRotator.reportSuccess(nvidiaKey);
            task.logs?.push('[NVIDIA NIM] Reasoning synthesis completed.');
            return text;
          }
        } else if (res.status === 429) {
          this.nvidiaKeyRotator.reportRateLimit(nvidiaKey);
        }
      } catch (err: any) {
        this.nvidiaKeyRotator.reportFailure(nvidiaKey);
      }
    }

    // Failover to Gemini 2.5 Pro
    return this.executeEngineeringAgent(task);
  }

  /**
   * Shell Agent: Executes shell scripts via Python shell_and_tasks.py or child_process.
   */
  private async executeShellAgent(task: AgentTask): Promise<string> {
    const command = task.payload.command || task.payload.script || task.title;

    return new Promise((resolve, reject) => {
      const pythonScript = path.resolve(__dirname, '../../../whole_controls/python_actuators/shell_and_tasks.py');
      const proc = execFile(
        'python3',
        [
          '-c',
          `import asyncio, shell_and_tasks; out = asyncio.run(shell_and_tasks.execute_linux_command(${JSON.stringify(command)}, timeout=30.0)); print(out.get('stdout', '') or out.get('error', ''))`
        ],
        {
          cwd: path.resolve(__dirname, '../../../whole_controls/python_actuators'),
          signal: task.abortController?.signal,
          timeout: 35000,
          env: process.env
        },
        (err, stdout, stderr) => {
          if (err) {
            if (task.abortController?.signal.aborted) {
              return resolve('[Shell Agent] Process cancelled by user.');
            }
            return reject(new Error(`Shell execution failed: ${stderr || err.message}`));
          }
          task.logs?.push(`[Shell Agent] Command executed: ${command.slice(0, 50)}...`);
          resolve(stdout.trim() || 'Command completed with no output.');
        }
      );
    });
  }

  /**
   * Researcher Agent: Uses installed skills and documentation.
   */
  private async executeResearcherAgent(task: AgentTask): Promise<string> {
    const skillSlug = task.payload.args?.skill_slug;
    if (skillSlug) {
      const content = loadSkillContent(skillSlug);
      task.logs?.push(`[Skills Agent] Loaded skill: ${skillSlug}`);
      return JSON.stringify(content, null, 2);
    }
    return this.executeEngineeringAgent(task);
  }

  private buildTaskResult(task: AgentTask): AgentTaskResult {
    return {
      taskId: task.id,
      status: task.status,
      output: task.result || task.error || '',
      rawPayload: task.result,
      durationMs: (task.completedAt || Date.now()) - task.createdAt,
      agentRole: task.role,
      logs: task.logs || []
    };
  }

  private notifyWaiters(task: AgentTask): void {
    const waiters = this.taskWaiters.get(task.id);
    if (waiters) {
      const res = this.buildTaskResult(task);
      for (const w of waiters) w(res);
      this.taskWaiters.delete(task.id);
    }
  }

  public getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }
}
