/**
 * J.A.R.V.I.S. True Autonomous Orchestrator
 * 
 * Continuous AGI loop: Perceive → Plan → Delegate → Verify → Learn
 * 
 * Architecture:
 * - Persistent Hermes session (CTO / Lead Engineer)
 * - Mission queue with priority, dependencies, auto-resumption
 * - War Room: JARVIS → Hermes → E.D.I.T.H. → K.A.R.E.N. → F.R.I.D.A.Y. → V.I.S.I.O.N. → U.L.T.R.O.N.
 * - Quality gates: lint → test → security → build
 * - Self-repair integration on failures
 * - 4-tier memory drives task discovery and resumption
 */

import { WebSocket } from 'ws';
import { execFile } from 'child_process';
import { runMemoryBridge } from './memory_bridge';
import { execHermes, HermesResult } from '../../hermes_bridge';
import { parallelTaskManager } from '../../parallel_task_manager';
import { dualPathOrchestrator } from './dual_path_orchestrator';
import { selfRepairEngine } from './self_repair';
import { autonomousEngine } from './autonomous_engine';
import { experienceLearner } from './experience_learner';
import { omarchyQuattro } from './omarchy_quattro_core';
import { agentSessionManager } from './agent_session_manager';
export enum MissionStatus {
  PENDING = 'PENDING',
  PLANNING = 'PLANNING',
  DELEGATING = 'DELEGATING',
  EXECUTING = 'EXECUTING',
  VERIFYING = 'VERIFYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  PAUSED = 'PAUSED'
}

export enum MissionPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BACKGROUND = 4
}

export interface Mission {
  id: string;
  title: string;
  goal: string;
  status: MissionStatus;
  priority: MissionPriority;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  dependsOn: string[];
  assignedAgent?: string;
  hermesSessionId?: string;
  plan?: MissionPlan;
  verificationResults?: VerificationResult[];
  error?: string;
  logs: string[];
  progress: number;
  metadata: Record<string, unknown>;
}

export interface MissionPlan {
  steps: PlanStep[];
  estimatedDurationMs: number;
  requiredAgents: string[];
  qualityGates: QualityGate[];
}

export interface PlanStep {
  id: string;
  description: string;
  agent: string;
  prompt: string;
  dependsOn: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

export interface QualityGate {
  name: string;
  command: string;
  args: string[];
  critical: boolean;
  timeoutMs: number;
}

export interface VerificationResult {
  gate: string;
  passed: boolean;
  output: string;
  timestamp: number;
}

export interface WarRoomReport {
  missionId: string;
  participants: WarRoomParticipant[];
  decisions: WarRoomDecision[];
  actionItems: ActionItem[];
  timestamp: number;
}

export interface WarRoomParticipant {
  persona: string;
  role: string;
  input: string;
  concerns: string[];
}

export interface WarRoomDecision {
  topic: string;
  decision: string;
  rationale: string;
  agreedBy: string[];
}

export interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  priority: MissionPriority;
  dueBy?: number;
}

export interface AutonomousOrchestratorConfig {
  loopIntervalMs: number;
  maxConcurrentMissions: number;
  hermesAutoSession: boolean;
  warRoomEnabled: boolean;
  qualityGatesEnabled: boolean;
  autoResumeOnRestart: boolean;
  proactiveDiscovery: boolean;
}

const DEFAULT_CONFIG: AutonomousOrchestratorConfig = {
  loopIntervalMs: 30000,
  maxConcurrentMissions: 3,
  hermesAutoSession: true,
  warRoomEnabled: true,
  qualityGatesEnabled: true,
  autoResumeOnRestart: true,
  proactiveDiscovery: true
};

export class AutonomousOrchestrator {
  private config: AutonomousOrchestratorConfig;
  private missions: Map<string, Mission> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private hermesSessionId: string | null = null;
  private isRunning = false;
  private wsClients: Set<WebSocket> = new Set();
  private lastMemoryScan = 0;
  private missionCounter = 0;

  constructor(config?: Partial<AutonomousOrchestratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[AutonomousOrchestrator] Starting true autonomous AGI loop...');
    
    this.initializeHermesSession();
    this.resumePersistedMissions();
    this.startMainLoop();
    this.startProactiveDiscovery();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    console.log('[AutonomousOrchestrator] Stopped');
  }

  public registerClient(ws: WebSocket): void {
    this.wsClients.add(ws);
    ws.on('close', () => this.wsClients.delete(ws));
  }

  public createMission(
    goal: string,
    options?: { title?: string; priority?: MissionPriority; dependsOn?: string[]; metadata?: Record<string, unknown> }
  ): Mission {
    const id = `mission_${Date.now()}_${++this.missionCounter}`;
    const mission: Mission = {
      id,
      title: options?.title || goal.slice(0, 60),
      goal,
      status: MissionStatus.PENDING,
      priority: options?.priority ?? MissionPriority.NORMAL,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dependsOn: options?.dependsOn || [],
      logs: [`Mission created: ${goal}`],
      progress: 0,
      metadata: options?.metadata || {}
    };

    this.missions.set(id, mission);
    this.persistMission(mission);
    this.broadcast({ type: 'mission_created', mission: this.serializeMission(mission) });
    
    console.log(`[AutonomousOrchestrator] Mission created: ${id} - ${mission.title}`);
    return mission;
  }

  public getMission(id: string): Mission | undefined {
    return this.missions.get(id);
  }

  public getAllMissions(): Mission[] {
    return Array.from(this.missions.values()).sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
  }

  public getActiveMissions(): Mission[] {
    return this.getAllMissions().filter(m => 
      m.status !== MissionStatus.COMPLETED && 
      m.status !== MissionStatus.FAILED &&
      m.status !== MissionStatus.PAUSED
    );
  }

  private async initializeHermesSession(): Promise<void> {
    if (!this.config.hermesAutoSession) return;
    
    try {
      const session = agentSessionManager.openSession('hermes');
      this.hermesSessionId = session.sessionId;
      console.log(`[AutonomousOrchestrator] Hermes persistent session: ${this.hermesSessionId}`);
      
      // Warm up Hermes with context
      await execHermes(
        'You are J.A.R.V.I.S. CTO / Lead Engineer (Hermes). Maintain persistent context across tasks. Acknowledge with "Ready, Sir."',
        { yolo: true, sessionName: 'autonomous-cto', mode: 'oneshot' }
      );
    } catch (err) {
      console.warn('[AutonomousOrchestrator] Failed to initialize Hermes session:', err);
    }
  }

  private async resumePersistedMissions(): Promise<void> {
    if (!this.config.autoResumeOnRestart) return;

    try {
      const context = await runMemoryBridge(['context', 'jarvis-autonomous']);
      const activeMissions = (context?.activeMissions as unknown[]) || [];
      if (activeMissions.length) {
        for (const m of activeMissions) {
          const mission = this.deserializeMission(m);
          if (mission && mission.status !== MissionStatus.COMPLETED && mission.status !== MissionStatus.FAILED) {
            mission.status = MissionStatus.PENDING;
            mission.logs.push(`Resumed after restart at ${new Date().toISOString()}`);
            this.missions.set(mission.id, mission);
            console.log(`[AutonomousOrchestrator] Resumed mission: ${mission.id}`);
          }
        }
      }
    } catch (err) {
      console.warn('[AutonomousOrchestrator] Failed to resume missions:', err);
    }
  }

  private startMainLoop(): void {
    this.timer = setInterval(async () => {
      if (!this.isRunning) return;
      await this.tick();
    }, this.config.loopIntervalMs);
  }

  private startProactiveDiscovery(): void {
    if (!this.config.proactiveDiscovery) return;
    
    setInterval(async () => {
      if (!this.isRunning) return;
      await this.discoverTasksFromMemory();
      await this.discoverTasksFromEnvironment();
    }, 60000);
  }

  private async tick(): Promise<void> {
    try {
      // 1. Check for unblocked pending missions
      await this.scheduleMissions();
      
      // 2. Execute delegated tasks
      await this.executeDelegations();
      
      // 3. Run verification on executing missions
      await this.runVerifications();
      
      // 4. Run War Room for complex missions
      if (this.config.warRoomEnabled) {
        await this.runWarRooms();
      }
      
      // 5. Persist state
      await this.persistState();
      
      // 6. Clean up completed missions
      this.cleanupOldMissions();
      
    } catch (err) {
      console.error('[AutonomousOrchestrator] Tick error:', err);
    }
  }

  private async scheduleMissions(): Promise<void> {
    const pending = this.getAllMissions().filter(m => m.status === MissionStatus.PENDING);
    let activeCount = this.getActiveMissions().length;

    for (const mission of pending) {
      if (activeCount >= this.config.maxConcurrentMissions) break;
      
      // Check dependencies
      const blocked = mission.dependsOn.some(depId => {
        const dep = this.missions.get(depId);
        return dep && dep.status !== MissionStatus.COMPLETED;
      });
      
      if (blocked) {
        mission.status = MissionStatus.BLOCKED;
        mission.logs.push(`Blocked on dependencies: ${mission.dependsOn.join(', ')}`);
        continue;
      }

      // Plan the mission
      mission.status = MissionStatus.PLANNING;
      mission.logs.push('Planning mission...');
      this.broadcast({ type: 'mission_status', mission: this.serializeMission(mission) });

      const plan = await this.planMission(mission);
      mission.plan = plan;
      mission.assignedAgent = 'hermes';
      mission.status = MissionStatus.DELEGATING;
      mission.updatedAt = Date.now();
      mission.startedAt = Date.now();
      
      this.broadcast({ type: 'mission_status', mission: this.serializeMission(mission) });
      activeCount++;
    }
  }

  private async planMission(mission: Mission): Promise<MissionPlan> {
    // Use Hermes to create a detailed execution plan
    const planningPrompt = `Mission: ${mission.goal}

Create a detailed execution plan with:
1. Numbered steps with clear deliverables
2. Which agent for each step (hermes, ultron, edith, karen, friday, vision)
3. Dependencies between steps
4. Quality gates for each step
5. Estimated duration

Output JSON only:
{
  "steps": [{"id": "1", "description": "...", "agent": "hermes", "prompt": "...", "dependsOn": []}],
  "estimatedDurationMs": 120000,
  "requiredAgents": ["hermes"],
  "qualityGates": [{"name": "lint", "command": "npm", "args": ["run", "lint"], "critical": true, "timeoutMs": 60000}]
}`;

    let plan: MissionPlan;
    try {
      const res = await execHermes(planningPrompt, { 
        yolo: true, 
        sessionName: 'autonomous-planner',
        mode: 'oneshot'
      });
      
      const parsed = JSON.parse(res.text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      plan = {
        steps: parsed.steps || [],
        estimatedDurationMs: parsed.estimatedDurationMs || 60000,
        requiredAgents: parsed.requiredAgents || ['hermes'],
        qualityGates: parsed.qualityGates || this.getDefaultQualityGates()
      };
    } catch (err) {
      // Fallback plan
      plan = this.createFallbackPlan(mission);
    }

    mission.logs.push(`Plan created with ${plan.steps.length} steps`);
    return plan;
  }

  private createFallbackPlan(mission: Mission): MissionPlan {
    return {
      steps: [
        {
          id: '1',
          description: `Execute: ${mission.goal}`,
          agent: 'hermes',
          prompt: mission.goal,
          dependsOn: [],
          status: 'pending'
        }
      ],
      estimatedDurationMs: 60000,
      requiredAgents: ['hermes'],
      qualityGates: this.getDefaultQualityGates()
    };
  }

  private getDefaultQualityGates(): QualityGate[] {
    return [
      { name: 'lint', command: 'npm', args: ['run', 'lint'], critical: true, timeoutMs: 60000 },
      { name: 'security', command: 'npm', args: ['run', 'test:security'], critical: true, timeoutMs: 30000 },
      { name: 'continuous', command: 'npm', args: ['run', 'test:continuous'], critical: false, timeoutMs: 30000 }
    ];
  }

  private async executeDelegations(): Promise<void> {
    const delegating = this.getAllMissions().filter(m => m.status === MissionStatus.DELEGATING);
    
    for (const mission of delegating) {
      if (!mission.plan || !mission.plan.steps.length) continue;

      // Find next runnable step
      const nextStep = mission.plan.steps.find(s => 
        s.status === 'pending' && 
        s.dependsOn.every(d => mission.plan!.steps.find(step => step.id === d)?.status === 'completed')
      );

      if (!nextStep) {
        // All steps done, move to verification
        mission.status = MissionStatus.VERIFYING;
        mission.updatedAt = Date.now();
        mission.logs.push('All steps completed, entering verification');
        continue;
      }

      nextStep.status = 'running';
      mission.status = MissionStatus.EXECUTING;
      mission.updatedAt = Date.now();
      mission.logs.push(`Executing step ${nextStep.id}: ${nextStep.description}`);
      this.broadcast({ type: 'mission_status', mission: this.serializeMission(mission) });

      try {
        let result: unknown;
        
        if (nextStep.agent === 'hermes') {
          const hermesRes = await execHermes(nextStep.prompt, {
            yolo: true,
            sessionName: `mission-${mission.id}-step-${nextStep.id}`,
            mode: 'oneshot'
          });
          result = { text: hermesRes.text, sessionId: hermesRes.sessionId, success: hermesRes.success };
        } else if (nextStep.agent === 'ultron') {
          // Use parallel task manager for Ultron
          const task = await parallelTaskManager.executeParallelTask({
            category: 'ultron',
            title: nextStep.description,
            prompt: nextStep.prompt,
            skillName: 'ultron_intelligence'
          });
          result = task;
        } else {
          // Other agents via agentSessionManager
          const session = agentSessionManager.openSession(nextStep.agent);
          const res = await agentSessionManager.sendCommand(session.sessionId, nextStep.prompt, {
            cwd: process.cwd()
          });
          result = res;
        }

        nextStep.status = 'completed';
        nextStep.result = result;
        mission.progress = (mission.plan.steps.filter(s => s.status === 'completed').length / mission.plan.steps.length) * 100;
        mission.logs.push(`Step ${nextStep.id} completed`);
        
      } catch (err: any) {
        nextStep.status = 'failed';
        nextStep.error = err.message;
        mission.error = `Step ${nextStep.id} failed: ${err.message}`;
        mission.status = MissionStatus.FAILED;
        mission.logs.push(`Step ${nextStep.id} failed: ${err.message}`);
        
        // Trigger self-repair
        await this.triggerSelfRepair(mission, nextStep, err);
      }

      this.broadcast({ type: 'mission_status', mission: this.serializeMission(mission) });
    }
  }

  private async runVerifications(): Promise<void> {
    if (!this.config.qualityGatesEnabled) return;
    
    const verifying = this.getAllMissions().filter(m => m.status === MissionStatus.VERIFYING);
    
    for (const mission of verifying) {
      mission.logs.push('Running quality gates...');
      this.broadcast({ type: 'mission_status', mission: this.serializeMission(mission) });

      const gates = mission.plan?.qualityGates || this.getDefaultQualityGates();
      const results: VerificationResult[] = [];
      let allPassed = true;

      for (const gate of gates) {
        try {
          const output = await this.runCommand(gate.command, gate.args, gate.timeoutMs);
          const passed = output.success;
          results.push({ gate: gate.name, passed, output: output.stdout, timestamp: Date.now() });
          
          if (!passed && gate.critical) allPassed = false;
          mission.logs.push(`Quality gate ${gate.name}: ${passed ? 'PASSED' : 'FAILED'}`);
        } catch (err: any) {
          results.push({ gate: gate.name, passed: false, output: err.message, timestamp: Date.now() });
          if (gate.critical) allPassed = false;
        }
      }

      mission.verificationResults = results;
      
      if (allPassed) {
        mission.status = MissionStatus.COMPLETED;
        mission.completedAt = Date.now();
        mission.progress = 100;
        mission.logs.push('All quality gates passed - mission completed');
        
        // Log to memory
        await runMemoryBridge(['log_turn', JSON.stringify({
          speaker: 'AUTONOMOUS',
          text: `Mission completed: ${mission.goal}`,
          role: 'system',
          other_speaker: 'JARVIS',
          other_text: `Mission ${mission.id} completed successfully with all quality gates passing.`
        })]);
      } else {
        mission.status = MissionStatus.FAILED;
        mission.error = 'Quality gates failed';
        mission.logs.push('Quality gates failed - mission failed');
        
        await this.triggerSelfRepair(mission, undefined, new Error('Quality gates failed'));
      }

      this.broadcast({ type: 'mission_status', mission: this.serializeMission(mission) });
    }
  }

  private async runWarRooms(): Promise<void> {
    const complexMissions = this.getActiveMissions().filter(m => 
      m.plan && m.plan.steps.length > 2 && m.plan.requiredAgents.length > 1
    );

    for (const mission of complexMissions) {
      // Check if war room already run for this mission
      if (mission.metadata.warRoomCompleted) continue;
      
      const report = await this.conductWarRoom(mission);
      mission.metadata.warRoomCompleted = true;
      mission.metadata.warRoomReport = report;
      mission.logs.push('War Room completed');
      
      await this.persistMission(mission);
    }
  }

  private async conductWarRoom(mission: Mission): Promise<WarRoomReport> {
    const participants: WarRoomParticipant[] = [
      { persona: 'J.A.R.V.I.S.', role: 'Architect', input: '', concerns: [] },
      { persona: 'Hermes', role: 'CTO / Lead Engineer', input: '', concerns: [] },
      { persona: 'E.D.I.T.H.', role: 'Security', input: '', concerns: [] },
      { persona: 'K.A.R.E.N.', role: 'Frontend / UX', input: '', concerns: [] },
      { persona: 'F.R.I.D.A.Y.', role: 'DevOps', input: '', concerns: [] },
      { persona: 'V.I.S.I.O.N.', role: 'Data / ML', input: '', concerns: [] },
      { persona: 'U.L.T.R.O.N.', role: 'Intelligence', input: '', concerns: [] }
    ];

    // Gather inputs from each persona
    for (const p of participants) {
      const prompt = `War Room Standup for Mission: ${mission.goal}\n\nCurrent Plan: ${JSON.stringify(mission.plan?.steps.slice(0, 3), null, 2)}\n\nAs ${p.persona} (${p.role}), provide your assessment, concerns, and recommendations in 2-3 sentences.`;
      
      try {
        const res = await execHermes(prompt, { yolo: true, sessionName: `warroom-${p.persona.toLowerCase()}`, mode: 'oneshot' });
        p.input = res.text.slice(0, 500);
        
        // Extract concerns
        const concerns = p.input.match(/concern[s]?[:\s]+([^.]+)/gi) || [];
        p.concerns = concerns.map(c => c.replace(/concern[s]?[:\s]+/i, '').trim());
      } catch {
        p.input = 'Unable to provide input';
      }
    }

    // Synthesize decisions
    const decisions: WarRoomDecision[] = [];
    const actionItems: ActionItem[] = [];
    
    // Simple synthesis: any concern raised by 2+ personas becomes a decision
    const allConcerns = participants.flatMap(p => p.concerns.map(c => ({ concern: c, by: p.persona })));
    const concernCounts = new Map<string, string[]>();
    
    for (const { concern, by } of allConcerns) {
      const key = concern.toLowerCase().slice(0, 50);
      if (!concernCounts.has(key)) concernCounts.set(key, []);
      concernCounts.get(key)!.push(by);
    }

    for (const [concern, by] of concernCounts) {
      if (by.length >= 2) {
        decisions.push({
          topic: concern,
          decision: `Address ${concern} before proceeding`,
          rationale: `Raised by ${by.join(', ')}`,
          agreedBy: by
        });
        actionItems.push({
          id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          description: `Resolve: ${concern}`,
          assignee: 'hermes',
          priority: MissionPriority.HIGH
        });
      }
    }

    return {
      missionId: mission.id,
      participants,
      decisions,
      actionItems,
      timestamp: Date.now()
    };
  }

  private async triggerSelfRepair(mission: Mission, step: PlanStep | undefined, err: Error): Promise<void> {
    mission.logs.push('Triggering self-repair...');
    this.broadcast({ type: 'mission_self_repair', missionId: mission.id, error: err.message });

    const repairResult = await selfRepairEngine.interceptAndRepair(
      step?.agent || 'hermes',
      { prompt: step?.prompt, missionId: mission.id },
      err
    );

    if (repairResult.repaired) {
      mission.logs.push(`Self-repair succeeded: ${repairResult.strategy}`);
      // Retry the step
      if (step) step.status = 'pending';
      mission.status = MissionStatus.DELEGATING;
      mission.error = undefined;
    } else {
      mission.logs.push(`Self-repair failed: ${repairResult.strategy}`);
    }
  }

  private async runCommand(cmd: string, args: string[], timeoutMs: number): Promise<{ success: boolean; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const proc = execFile(cmd, args, { timeout: timeoutMs, cwd: process.cwd() }, (err, stdout, stderr) => {
        resolve({ success: !err, stdout, stderr: stderr || err?.message || '' });
      });
      
      proc.on('error', (err) => resolve({ success: false, stdout: '', stderr: err.message }));
    });
  }

  private async discoverTasksFromMemory(): Promise<void> {
    if (Date.now() - this.lastMemoryScan < 300000) return;
    this.lastMemoryScan = Date.now();

    try {
      const context = await runMemoryBridge(['context', 'jarvis-autonomous']);
      const facts = context?.facts || [];
      
      // Look for actionable items in memory
      const actionableKeywords = ['todo', 'fix', 'implement', 'add', 'create', 'refactor', 'optimize', 'debug', 'investigate'];
      
      for (const fact of facts) {
        const content = (fact.content || '').toLowerCase();
        if (actionableKeywords.some(k => content.includes(k)) && !this.missionExistsForFact(fact)) {
          // Create a low-priority background mission
          this.createMission(
            `From memory: ${fact.content}`,
            { 
              priority: MissionPriority.BACKGROUND,
              metadata: { source: 'memory', factId: fact.id }
            }
          );
        }
      }
    } catch (err) {
      console.warn('[AutonomousOrchestrator] Memory discovery failed:', err);
    }
  }

  private missionExistsForFact(fact: any): boolean {
    for (const m of this.missions.values()) {
      if (m.metadata.factId === fact.id) return true;
    }
    return false;
  }

  private async discoverTasksFromEnvironment(): Promise<void> {
    // Check for system alerts, build failures, etc.
    try {
      const diag = await omarchyQuattro.runSystemDiagnostics?.();
      if (diag) {
        const issues: Array<{ component: string; message: string; severity: 'critical' | 'high' | 'medium' | 'low' }> = [];
        
        // Check health score
        if (diag.healthScore < 50) {
          issues.push({ component: 'system', message: `Health score critical: ${diag.healthScore}/100`, severity: 'critical' });
        } else if (diag.healthScore < 70) {
          issues.push({ component: 'system', message: `Health score degraded: ${diag.healthScore}/100`, severity: 'high' });
        }
        
        // Check RAM
        if (diag.ramUsagePct > 90) {
          issues.push({ component: 'memory', message: `RAM usage critical: ${diag.ramUsagePct}%`, severity: 'critical' });
        } else if (diag.ramUsagePct > 80) {
          issues.push({ component: 'memory', message: `RAM usage high: ${diag.ramUsagePct}%`, severity: 'high' });
        }
        
        // Check CPU
        if (diag.cpuUsagePct > 90) {
          issues.push({ component: 'cpu', message: `CPU usage critical: ${diag.cpuUsagePct}%`, severity: 'critical' });
        } else if (diag.cpuUsagePct > 80) {
          issues.push({ component: 'cpu', message: `CPU usage high: ${diag.cpuUsagePct}%`, severity: 'high' });
        }
        
        // Check thermals
        for (const t of diag.thermals) {
          if (t.tempC > 90) {
            issues.push({ component: `thermal-${t.zone}`, message: `Temperature critical: ${t.tempC}°C`, severity: 'critical' });
          } else if (t.tempC > 80) {
            issues.push({ component: `thermal-${t.zone}`, message: `Temperature high: ${t.tempC}°C`, severity: 'high' });
          }
        }
        
        // Check disk
        if (diag.diskFreeGb < 5) {
          issues.push({ component: 'disk', message: `Disk space critical: ${diag.diskFreeGb}GB free`, severity: 'critical' });
        } else if (diag.diskFreeGb < 10) {
          issues.push({ component: 'disk', message: `Disk space low: ${diag.diskFreeGb}GB free`, severity: 'high' });
        }
        
        for (const issue of issues) {
          if (issue.severity === 'critical' || issue.severity === 'high') {
            const title = `System issue: ${issue.component} - ${issue.message}`;
            if (!this.missionExistsForTitle(title)) {
              this.createMission(
                `Autonomous remediation: ${issue.message} (component: ${issue.component})`,
                { priority: issue.severity === 'critical' ? MissionPriority.CRITICAL : MissionPriority.HIGH, metadata: { source: 'diagnostics', issue } }
              );
            }
          }
        }
      }
    } catch (err) {
      // Diagnostics not available
    }
  }

  private missionExistsForTitle(title: string): boolean {
    for (const m of this.missions.values()) {
      if (m.title === title && m.status !== MissionStatus.COMPLETED) return true;
    }
    return false;
  }

  private async persistMission(mission: Mission): Promise<void> {
    try {
      await runMemoryBridge(['add_triad', 'instructions', JSON.stringify({
        type: 'mission',
        ...this.serializeMission(mission)
      })]);
    } catch (err) {
      console.warn('[AutonomousOrchestrator] Failed to persist mission:', err);
    }
  }

  private async persistState(): Promise<void> {
    const activeMissions = this.getActiveMissions().map(m => this.serializeMission(m));
    try {
      await runMemoryBridge(['add_triad', 'instructions', JSON.stringify({
        type: 'autonomous_state',
        activeMissions,
        timestamp: Date.now()
      })]);
    } catch (err) {
      console.warn('[AutonomousOrchestrator] Failed to persist state:', err);
    }
  }

  private cleanupOldMissions(): void {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const [id, mission] of this.missions) {
      if (mission.status === MissionStatus.COMPLETED && mission.completedAt && (now - mission.completedAt) > maxAge) {
        this.missions.delete(id);
      }
    }
  }

  private serializeMission(mission: Mission): any {
    return {
      id: mission.id,
      title: mission.title,
      goal: mission.goal,
      status: mission.status,
      priority: mission.priority,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
      startedAt: mission.startedAt,
      completedAt: mission.completedAt,
      dependsOn: mission.dependsOn,
      assignedAgent: mission.assignedAgent,
      hermesSessionId: mission.hermesSessionId,
      plan: mission.plan,
      verificationResults: mission.verificationResults,
      error: mission.error,
      logs: mission.logs.slice(-20), // Keep last 20 logs
      progress: mission.progress,
      metadata: mission.metadata
    };
  }

  private deserializeMission(data: any): Mission | null {
    try {
      return {
        id: data.id,
        title: data.title,
        goal: data.goal,
        status: data.status,
        priority: data.priority,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        dependsOn: data.dependsOn || [],
        assignedAgent: data.assignedAgent,
        hermesSessionId: data.hermesSessionId,
        plan: data.plan,
        verificationResults: data.verificationResults,
        error: data.error,
        logs: data.logs || [],
        progress: data.progress || 0,
        metadata: data.metadata || {}
      };
    } catch {
      return null;
    }
  }

  private broadcast(message: any): void {
    const payload = JSON.stringify(message);
    for (const ws of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      missionsTotal: this.missions.size,
      activeMissions: this.getActiveMissions().length,
      hermesSessionId: this.hermesSessionId,
      config: this.config
    };
  }
}

export const autonomousOrchestrator = new AutonomousOrchestrator();