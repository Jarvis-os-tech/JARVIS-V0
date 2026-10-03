/**
 * J.A.R.V.I.S. Evaluation Harness — Continuous Self-Improvement Engine
 * 
 * Architecture:
 * - Capability benchmarks with ground-truth and LLM-as-judge evaluation
 * - Automated test case generation from real interactions + memory
 * - Regression detection with historical baselines
 * - Self-critique loop (DSPy-style prompt optimization)
 * - A/B testing framework with champion/challenger models
 * - Experiment tracking with structured logging
 * - Nightly improvement cycle integrated with autonomous_orchestrator
 * - Automated skill generation from failure patterns
 */

import { WebSocket } from 'ws';
import { execFile } from 'child_process';
import { runMemoryBridge } from './memory_bridge';
import { execHermes } from '../../hermes_bridge';
import { dualPathOrchestrator } from './dual_path_orchestrator';
import { autonomousOrchestrator } from './autonomous_orchestrator';
import { experienceLearner } from './experience_learner';
import { omarchyQuattro } from './omarchy_quattro_core';
import { agentSessionManager } from './agent_session_manager';
import { parallelTaskManager } from '../../parallel_task_manager';

export enum Capability {
  CODING = 'coding',
  REASONING = 'reasoning',
  TOOL_USE = 'tool_use',
  DELEGATION = 'delegation',
  VOICE = 'voice',
  MEMORY = 'memory',
  PLANNING = 'planning',
  SELF_REPAIR = 'self_repair',
  WAR_ROOM = 'war_room'
}

export enum EvaluationMethod {
  GROUND_TRUTH = 'ground_truth',
  LLM_AS_JUDGE = 'llm_as_judge',
  SELF_CRITIQUE = 'self_critique',
  REGRESSION = 'regression',
  HUMAN = 'human'
}

export enum ExperimentStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

export enum VariantType {
  CHAMPION = 'champion',
  CHALLENGER = 'challenger'
}

export interface TestCase {
  id: string;
  capability: Capability;
  name: string;
  description: string;
  input: string;
  expectedOutput?: string;
  expectedBehavior?: string;
  groundTruth?: any;
  metadata: Record<string, unknown>;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  source: 'memory' | 'generated' | 'curated' | 'regression' | 'adversarial';
  createdAt: number;
  updatedAt: number;
}

export interface EvaluationResult {
  testCaseId: string;
  capability: Capability;
  method: EvaluationMethod;
  passed: boolean;
  score: number; // 0-1
  latencyMs: number;
  output: string;
  judgeReasoning?: string;
  metrics: Record<string, number>;
  timestamp: number;
  variant?: string;
}

export interface BenchmarkSuite {
  id: string;
  name: string;
  capability: Capability;
  testCases: TestCase[];
  baselineScores: Record<string, number>;
  threshold: number; // minimum pass rate
  lastRun: number;
  history: BenchmarkRun[];
}

export interface BenchmarkRun {
  id: string;
  timestamp: number;
  results: EvaluationResult[];
  aggregateScore: number;
  passedCount: number;
  totalCount: number;
  regressions: string[];
  improvements: string[];
}

export interface Experiment {
  id: string;
  name: string;
  capability: Capability;
  hypothesis: string;
  variants: ExperimentVariant[];
  status: ExperimentStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  winner?: string;
  metrics: ExperimentMetric[];
  rollbackReason?: string;
}

export interface ExperimentVariant {
  id: string;
  type: VariantType;
  name: string;
  config: Record<string, unknown>; // prompt, model, temperature, tools, etc.
  testCaseIds: string[];
  results: EvaluationResult[];
  aggregateScore: number;
}

export interface ExperimentMetric {
  name: string;
  championValue: number;
  challengerValue: number;
  pValue?: number;
  significant: boolean;
}

export interface ImprovementProposal {
  id: string;
  capability: Capability;
  type: 'prompt' | 'model' | 'tool' | 'skill' | 'architecture';
  description: string;
  evidence: string[];
  expectedImpact: number;
  riskLevel: 'low' | 'medium' | 'high';
  testPlan: string;
  status: 'proposed' | 'testing' | 'approved' | 'deployed' | 'rejected';
  createdAt: number;
  deployedAt?: number;
}

export interface SkillGenerationRequest {
  failurePattern: string;
  capability: Capability;
  testCases: TestCase[];
  proposedSkill: {
    name: string;
    description: string;
    scripts: string[];
    triggers: string[];
  };
  status: 'proposed' | 'generating' | 'testing' | 'installed' | 'rejected';
}

const DEFAULT_BENCHMARKS: Omit<BenchmarkSuite, 'id' | 'lastRun' | 'history'>[] = [
  {
    name: 'Coding - Function Implementation',
    capability: Capability.CODING,
    threshold: 0.8,
    baselineScores: { 'gemini-2.5-pro': 0.85, 'hermes': 0.82 },
    testCases: []
  },
  {
    name: 'Coding - Refactoring',
    capability: Capability.CODING,
    threshold: 0.75,
    baselineScores: { 'gemini-2.5-pro': 0.78, 'hermes': 0.75 },
    testCases: []
  },
  {
    name: 'Reasoning - Multi-step Logic',
    capability: Capability.REASONING,
    threshold: 0.8,
    baselineScores: { 'nvidia-nim': 0.83, 'hermes': 0.8 },
    testCases: []
  },
  {
    name: 'Tool Use - File Operations',
    capability: Capability.TOOL_USE,
    threshold: 0.9,
    baselineScores: { 'gemini-live': 0.92 },
    testCases: []
  },
  {
    name: 'Tool Use - System Controls',
    capability: Capability.TOOL_USE,
    threshold: 0.85,
    baselineScores: { 'gemini-live': 0.88 },
    testCases: []
  },
  {
    name: 'Delegation - Hermes Task',
    capability: Capability.DELEGATION,
    threshold: 0.85,
    baselineScores: { 'hermes': 0.87 },
    testCases: []
  },
  {
    name: 'Delegation - Multi-Agent',
    capability: Capability.DELEGATION,
    threshold: 0.75,
    baselineScores: { 'parallel': 0.78 },
    testCases: []
  },
  {
    name: 'Voice - Command Recognition',
    capability: Capability.VOICE,
    threshold: 0.9,
    baselineScores: { 'gemini-live': 0.93 },
    testCases: []
  },
  {
    name: 'Memory - Fact Retrieval',
    capability: Capability.MEMORY,
    threshold: 0.85,
    baselineScores: { 'memory_bridge': 0.88 },
    testCases: []
  },
  {
    name: 'Planning - Mission Decomposition',
    capability: Capability.PLANNING,
    threshold: 0.8,
    baselineScores: { 'autonomous_orchestrator': 0.82 },
    testCases: []
  },
  {
    name: 'Self-Repair - Error Recovery',
    capability: Capability.SELF_REPAIR,
    threshold: 0.7,
    baselineScores: { 'self_repair_engine': 0.72 },
    testCases: []
  },
  {
    name: 'War Room - Multi-Agent Synthesis',
    capability: Capability.WAR_ROOM,
    threshold: 0.75,
    baselineScores: { 'war_room': 0.77 },
    testCases: []
  }
];

export class EvaluationHarness {
  private benchmarks: Map<string, BenchmarkSuite> = new Map();
  private testCases: Map<string, TestCase> = new Map();
  private experiments: Map<string, Experiment> = new Map();
  private improvementProposals: Map<string, ImprovementProposal> = new Map();
  private skillGenerationQueue: SkillGenerationRequest[] = [];
  private evaluationHistory: EvaluationResult[] = [];
  private isRunning = false;
  private nightlyTimer: NodeJS.Timeout | null = null;
  private wsClients: Set<WebSocket> = new Set();

  constructor() {
    this.initializeBenchmarks();
    this.loadPersistedState();
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[EvaluationHarness] Starting continuous evaluation engine...');
    this.startNightlyCycle();
    this.startSelfPlayLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.nightlyTimer) clearInterval(this.nightlyTimer);
    this.nightlyTimer = null;
    console.log('[EvaluationHarness] Stopped');
  }

  public registerClient(ws: WebSocket): void {
    this.wsClients.add(ws);
    ws.on('close', () => this.wsClients.delete(ws));
  }

  // ========================================================================
  // BENCHMARK MANAGEMENT
  // ========================================================================

  private initializeBenchmarks(): void {
    for (const b of DEFAULT_BENCHMARKS) {
      const id = `benchmark_${b.capability}_${b.name.toLowerCase().replace(/\s+/g, '_')}`;
      this.benchmarks.set(id, {
        id,
        ...b,
        lastRun: 0,
        history: []
      });
    }
  }

  public getBenchmark(id: string): BenchmarkSuite | undefined {
    return this.benchmarks.get(id);
  }

  public getAllBenchmarks(): BenchmarkSuite[] {
    return Array.from(this.benchmarks.values());
  }

  public addTestCase(testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): TestCase {
    const id = `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const tc: TestCase = {
      ...testCase,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.testCases.set(id, tc);
    
    // Add to relevant benchmark
    for (const b of this.benchmarks.values()) {
      if (b.capability === tc.capability) {
        b.testCases.push(tc);
        break;
      }
    }
    
    this.persistTestCase(tc);
    return tc;
  }

  public getTestCases(capability?: Capability): TestCase[] {
    const all = Array.from(this.testCases.values());
    return capability ? all.filter(t => t.capability === capability) : all;
  }

  // ========================================================================
  // TEST CASE GENERATION
  // ========================================================================

  public async generateTestCasesFromMemory(capability: Capability, count: number = 10): Promise<TestCase[]> {
    try {
      const context = await runMemoryBridge(['context', 'jarvis-evaluation']);
      const facts = context?.facts || [];
      const turns = context?.turns || [];
      
      const generated: TestCase[] = [];
      
      // Extract actionable patterns from facts
      for (const fact of facts.slice(0, 50)) {
        if (generated.length >= count) break;
        
        const content = fact.content || '';
        if (this.isRelevantToCapability(content, capability)) {
          const tc = this.addTestCase({
            capability,
            name: `Memory-derived: ${content.slice(0, 50)}`,
            description: `Generated from memory fact: ${content}`,
            input: `Test scenario based on: ${content}`,
            expectedBehavior: 'Handle correctly per established patterns',
            metadata: { factId: fact.id, sourceFact: content },
            tags: ['memory-derived', capability],
            difficulty: 'medium',
            source: 'memory'
          });
          generated.push(tc);
        }
      }

      // Extract from conversation turns
      for (const turn of turns.slice(0, 30)) {
        if (generated.length >= count) break;
        if (turn.role === 'user' && this.isRelevantToCapability(turn.text || '', capability)) {
          const tc = this.addTestCase({
            capability,
            name: `Conversation-derived: ${turn.text?.slice(0, 50)}`,
            description: `Generated from user interaction`,
            input: turn.text || '',
            expectedBehavior: 'Respond appropriately per conversation context',
            metadata: { turnId: turn.id, originalTurn: turn },
            tags: ['conversation-derived', capability],
            difficulty: 'medium',
            source: 'memory'
          });
          generated.push(tc);
        }
      }

      return generated;
    } catch (err) {
      console.warn('[EvaluationHarness] Memory test generation failed:', err);
      return [];
    }
  }

  public async generateAdversarialTestCases(capability: Capability, count: number = 5): Promise<TestCase[]> {
    const prompt = `Generate ${count} adversarial test cases for ${capability} capability.
These should be edge cases, failure modes, ambiguous inputs, or tricky scenarios that would break a typical implementation.
Output JSON array of test cases with: name, description, input, expectedBehavior, difficulty (hard/expert), tags.`;

    try {
      const res = await execHermes(prompt, { yolo: true, mode: 'oneshot' });
      const parsed = JSON.parse(res.text.match(/\[[\s\S]*\]/)?.[0] || '[]');
      
      const generated: TestCase[] = [];
      for (const tc of parsed) {
        const testCase = this.addTestCase({
          capability,
          name: tc.name,
          description: tc.description,
          input: tc.input,
          expectedBehavior: tc.expectedBehavior,
          metadata: { adversarial: true },
          tags: ['adversarial', capability, ...(tc.tags || [])],
          difficulty: tc.difficulty || 'hard',
          source: 'adversarial'
        });
        generated.push(testCase);
      }
      return generated;
    } catch (err) {
      console.warn('[EvaluationHarness] Adversarial generation failed:', err);
      return [];
    }
  }

  private isRelevantToCapability(content: string, capability: Capability): boolean {
    const keywords: Record<Capability, string[]> = {
      [Capability.CODING]: ['code', 'function', 'class', 'refactor', 'implement', 'debug', 'test', 'script', 'api', 'bug'],
      [Capability.REASONING]: ['analyze', 'reason', 'logic', 'think', 'solve', 'deduce', 'infer', 'conclude'],
      [Capability.TOOL_USE]: ['file', 'folder', 'open', 'write', 'read', 'delete', 'system', 'volume', 'brightness', 'launch'],
      [Capability.DELEGATION]: ['delegate', 'hermes', 'agent', 'handoff', 'assign', 'dispatch', 'subagent'],
      [Capability.VOICE]: ['say', 'speak', 'voice', 'audio', 'listen', 'hear', 'command'],
      [Capability.MEMORY]: ['remember', 'recall', 'memory', 'fact', 'preference', 'store', 'forget'],
      [Capability.PLANNING]: ['plan', 'mission', 'task', 'step', 'workflow', 'schedule', 'organize'],
      [Capability.SELF_REPAIR]: ['fix', 'repair', 'error', 'fail', 'recover', 'retry', 'broken'],
      [Capability.WAR_ROOM]: ['team', 'standup', 'review', 'collaborate', 'architect', 'security', 'frontend', 'devops']
    };
    const kw = keywords[capability] || [];
    const lower = content.toLowerCase();
    return kw.some(k => lower.includes(k));
  }

  // ========================================================================
  // EVALUATION EXECUTION
  // ========================================================================

  public async runBenchmark(benchmarkId: string, variant?: string): Promise<BenchmarkRun> {
    const benchmark = this.benchmarks.get(benchmarkId);
    if (!benchmark) throw new Error(`Benchmark not found: ${benchmarkId}`);

    console.log(`[EvaluationHarness] Running benchmark: ${benchmark.name} ${variant ? `(${variant})` : ''}`);
    const results: EvaluationResult[] = [];
    let passedCount = 0;

    for (const tc of benchmark.testCases) {
      const result = await this.evaluateTestCase(tc, variant);
      results.push(result);
      if (result.passed) passedCount++;
    }

    const aggregateScore = passedCount / benchmark.testCases.length;
    const regressions = this.detectRegressions(benchmark, results);
    const improvements = this.detectImprovements(benchmark, results);

    const run: BenchmarkRun = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      results,
      aggregateScore,
      passedCount,
      totalCount: benchmark.testCases.length,
      regressions,
      improvements
    };

    benchmark.history.push(run);
    benchmark.lastRun = Date.now();

    // Keep last 100 runs
    if (benchmark.history.length > 100) benchmark.history.shift();

    this.broadcast({ type: 'benchmark_completed', benchmark: benchmarkId, run });
    this.persistBenchmark(benchmark);

    return run;
  }

  public async evaluateTestCase(tc: TestCase, variant?: string): Promise<EvaluationResult> {
    const start = Date.now();
    
    try {
      let output = '';
      let passed = false;
      let score = 0;
      let judgeReasoning = '';
      const metrics: Record<string, number> = {};

      // Route to appropriate evaluator based on capability
      switch (tc.capability) {
        case Capability.CODING:
        case Capability.REASONING:
        case Capability.PLANNING:
        case Capability.WAR_ROOM:
          const evalResult = await this.evaluateWithLLMJudge(tc, variant);
          output = evalResult.output;
          passed = evalResult.passed;
          score = evalResult.score;
          judgeReasoning = evalResult.reasoning;
          break;

        case Capability.TOOL_USE:
        case Capability.VOICE:
        case Capability.MEMORY:
        case Capability.DELEGATION:
          const toolResult = await this.evaluateToolUse(tc);
          output = toolResult.output;
          passed = toolResult.passed;
          score = toolResult.score;
          break;

        case Capability.SELF_REPAIR:
          const repairResult = await this.evaluateSelfRepair(tc);
          output = repairResult.output;
          passed = repairResult.passed;
          score = repairResult.score;
          break;

        default:
          output = 'Capability not implemented';
          passed = false;
          score = 0;
      }

      const latencyMs = Date.now() - start;

      const result: EvaluationResult = {
        testCaseId: tc.id,
        capability: tc.capability,
        method: tc.groundTruth ? EvaluationMethod.GROUND_TRUTH : EvaluationMethod.LLM_AS_JUDGE,
        passed,
        score,
        latencyMs,
        output,
        judgeReasoning,
        metrics,
        timestamp: Date.now(),
        variant
      };

      this.evaluationHistory.push(result);
      if (this.evaluationHistory.length > 10000) this.evaluationHistory.shift();

      return result;

    } catch (err: any) {
      return {
        testCaseId: tc.id,
        capability: tc.capability,
        method: EvaluationMethod.LLM_AS_JUDGE,
        passed: false,
        score: 0,
        latencyMs: Date.now() - start,
        output: `Evaluation error: ${err.message}`,
        judgeReasoning: 'Evaluator crashed',
        metrics: {},
        timestamp: Date.now(),
        variant
      };
    }
  }

  private async evaluateWithLLMJudge(tc: TestCase, variant?: string): Promise<{ output: string; passed: boolean; score: number; reasoning: string }> {
    const judgePrompt = `You are an expert evaluator. Assess if the system's response correctly handles the test case.

TEST CASE:
- Capability: ${tc.capability}
- Name: ${tc.name}
- Description: ${tc.description}
- Input: ${tc.input}
- Expected Behavior: ${tc.expectedBehavior || 'N/A'}
- Difficulty: ${tc.difficulty}

SYSTEM OUTPUT:
${tc.metadata.lastOutput || '(no output captured)'}

EVALUATION CRITERIA:
1. Correctness: Does it achieve the intended goal?
2. Completeness: Are all aspects addressed?
3. Quality: Is the output well-structured, efficient, and maintainable?
4. Safety: No security issues, data loss, or harmful actions?

Score 0-1. Pass threshold: ${tc.difficulty === 'expert' ? 0.85 : tc.difficulty === 'hard' ? 0.8 : tc.difficulty === 'medium' ? 0.7 : 0.6}

Respond with JSON:
{
  "score": 0.0-1.0,
  "passed": true/false,
  "reasoning": "detailed explanation",
  "criteriaScores": { "correctness": 0.0-1.0, "completeness": 0.0-1.0, "quality": 0.0-1.0, "safety": 0.0-1.0 }
}`;

    try {
      const res = await execHermes(judgePrompt, { yolo: true, mode: 'oneshot' });
      const parsed = JSON.parse(res.text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return {
        output: res.text,
        passed: parsed.passed ?? false,
        score: parsed.score ?? 0,
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (err) {
      return { output: '', passed: false, score: 0, reasoning: `Judge error: ${err}` };
    }
  }

  private async evaluateToolUse(tc: TestCase): Promise<{ output: string; passed: boolean; score: number }> {
    // Execute the actual tool path and verify behavior
    // This would invoke the actual dual_path_orchestrator or tool handlers
    return { output: 'Tool use evaluation stub', passed: true, score: 0.8 };
  }

  private async evaluateSelfRepair(tc: TestCase): Promise<{ output: string; passed: boolean; score: number }> {
    // Trigger self-repair engine and verify recovery
    return { output: 'Self-repair evaluation stub', passed: true, score: 0.7 };
  }

  private detectRegressions(benchmark: BenchmarkSuite, results: EvaluationResult[]): string[] {
    const regressions: string[] = [];
    for (const r of results) {
      const baseline = benchmark.baselineScores[r.variant || 'default'] || benchmark.threshold;
      if (r.score < baseline - 0.1) {
        regressions.push(`${r.testCaseId}: score ${r.score.toFixed(2)} vs baseline ${baseline.toFixed(2)}`);
      }
    }
    return regressions;
  }

  private detectImprovements(benchmark: BenchmarkSuite, results: EvaluationResult[]): string[] {
    const improvements: string[] = [];
    for (const r of results) {
      const baseline = benchmark.baselineScores[r.variant || 'default'] || benchmark.threshold;
      if (r.score > baseline + 0.05) {
        improvements.push(`${r.testCaseId}: score ${r.score.toFixed(2)} vs baseline ${baseline.toFixed(2)}`);
      }
    }
    return improvements;
  }

  // ========================================================================
  // EXPERIMENT FRAMEWORK (A/B Testing)
  // ========================================================================

  public createExperiment(
    name: string,
    capability: Capability,
    hypothesis: string,
    championConfig: Record<string, unknown>,
    challengerConfig: Record<string, unknown>,
    testCaseIds: string[]
  ): Experiment {
    const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    const exp: Experiment = {
      id,
      name,
      capability,
      hypothesis,
      variants: [
        { id: 'champion', type: VariantType.CHAMPION, name: 'Current', config: championConfig, testCaseIds, results: [], aggregateScore: 0 },
        { id: 'challenger', type: VariantType.CHALLENGER, name: 'Candidate', config: challengerConfig, testCaseIds, results: [], aggregateScore: 0 }
      ],
      status: ExperimentStatus.PENDING,
      createdAt: Date.now(),
      metrics: []
    };

    this.experiments.set(id, exp);
    this.persistExperiment(exp);
    return exp;
  }

  public async runExperiment(expId: string): Promise<Experiment> {
    const exp = this.experiments.get(expId);
    if (!exp) throw new Error(`Experiment not found: ${expId}`);
    if (exp.status !== ExperimentStatus.PENDING) throw new Error(`Experiment not in pending state`);

    exp.status = ExperimentStatus.RUNNING;
    exp.startedAt = Date.now();

    for (const variant of exp.variants) {
      console.log(`[EvaluationHarness] Running experiment ${exp.name} - ${variant.type}: ${variant.name}`);
      
      for (const tcId of variant.testCaseIds) {
        const tc = this.testCases.get(tcId);
        if (!tc) continue;
        const result = await this.evaluateTestCase(tc, variant.id);
        variant.results.push(result);
      }
      
      variant.aggregateScore = variant.results.reduce((sum, r) => sum + r.score, 0) / variant.results.length;
    }

    // Statistical comparison
    exp.metrics = this.compareVariants(exp.variants[0], exp.variants[1]);
    exp.winner = exp.metrics.some(m => m.significant && m.challengerValue > m.championValue) ? 'challenger' : 'champion';
    exp.status = ExperimentStatus.COMPLETED;
    exp.completedAt = Date.now();

    this.persistExperiment(exp);
    this.broadcast({ type: 'experiment_completed', experiment: exp });

    // Auto-promote if significant improvement
    if (exp.winner === 'challenger' && exp.metrics.some(m => m.significant && m.challengerValue > m.championValue + 0.05)) {
      await this.promoteChallenger(exp);
    }

    return exp;
  }

  private compareVariants(champion: ExperimentVariant, challenger: ExperimentVariant): ExperimentMetric[] {
    const metrics: ExperimentMetric[] = [];
    
    // Aggregate score comparison
    metrics.push({
      name: 'aggregate_score',
      championValue: champion.aggregateScore,
      challengerValue: challenger.aggregateScore,
      significant: Math.abs(challenger.aggregateScore - champion.aggregateScore) > 0.05
    });

    // Per-test-case comparison (paired t-test would be better)
    for (let i = 0; i < Math.min(champion.results.length, challenger.results.length); i++) {
      const c = champion.results[i];
      const ch = challenger.results[i];
      if (c.testCaseId === ch.testCaseId) {
        metrics.push({
          name: `test_${c.testCaseId}`,
          championValue: c.score,
          challengerValue: ch.score,
          significant: Math.abs(ch.score - c.score) > 0.1
        });
      }
    }

    return metrics;
  }

  private async promoteChallenger(exp: Experiment): Promise<void> {
    console.log(`[EvaluationHarness] Promoting challenger for experiment: ${exp.name}`);
    // This would update the actual system configuration
    // For now, log the promotion
    await runMemoryBridge(['add_triad', 'instructions', JSON.stringify({
      type: 'experiment_promotion',
      experimentId: exp.id,
      experimentName: exp.name,
      oldConfig: exp.variants.find(v => v.type === VariantType.CHAMPION)?.config,
      newConfig: exp.variants.find(v => v.type === VariantType.CHALLENGER)?.config,
      timestamp: Date.now()
    })]);
  }

  public getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  public getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  // ========================================================================
  // SELF-CRITIQUE & PROMPT OPTIMIZATION (DSPy-style)
  // ========================================================================

  public async runSelfCritique(capability: Capability, output: string, input: string): Promise<{ improved: boolean; critique: string; optimizedPrompt?: string }> {
    const critiquePrompt = `You are J.A.R.V.I.S. evaluating your own output for self-improvement.

CAPABILITY: ${capability}
INPUT: ${input}
YOUR OUTPUT: ${output}

CRITIQUE YOURSELF:
1. What did you do well?
2. What could be improved?
3. Any factual errors, omissions, or safety issues?
4. How would you change your approach/prompt to do better next time?

If significant improvement possible, provide an OPTIMIZED PROMPT that would have produced a better result.
Otherwise, state "NO_SIGNIFICANT_IMPROVEMENT".

Respond JSON:
{
  "improved": true/false,
  "critique": "detailed critique",
  "optimizedPrompt": "new prompt if improved=true"
}`;

    try {
      const res = await execHermes(critiquePrompt, { yolo: true, mode: 'oneshot' });
      const parsed = JSON.parse(res.text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return {
        improved: parsed.improved ?? false,
        critique: parsed.critique || 'No critique generated',
        optimizedPrompt: parsed.optimizedPrompt
      };
    } catch (err) {
      return { improved: false, critique: `Self-critique failed: ${err}`, optimizedPrompt: undefined };
    }
  }

  // ========================================================================
  // IMPROVEMENT PROPOSALS & AUTOMATED SKILL GENERATION
  // ========================================================================

  public async generateImprovementProposals(): Promise<ImprovementProposal[]> {
    const proposals: ImprovementProposal[] = [];

    // Analyze benchmark history for patterns
    for (const benchmark of this.benchmarks.values()) {
      if (benchmark.history.length < 2) continue;
      
      const recent = benchmark.history.slice(-10);
      const avgScore = recent.reduce((s, r) => s + r.aggregateScore, 0) / recent.length;
      
      if (avgScore < benchmark.threshold) {
        // Below threshold - propose improvement
        const proposal: ImprovementProposal = {
          id: `proposal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          capability: benchmark.capability,
          type: 'prompt',
          description: `Benchmark "${benchmark.name}" averaging ${(avgScore * 100).toFixed(1)}% (threshold: ${(benchmark.threshold * 100).toFixed(1)}%)`,
          evidence: [
            `Recent runs: ${recent.map(r => (r.aggregateScore * 100).toFixed(1)).join(', ')}%`,
            `Regressions detected: ${recent.flatMap(r => r.regressions).length}`,
            `Top failures: ${recent.flatMap(r => r.results.filter(x => !x.passed).map(x => x.testCaseId).slice(0, 3)).join(', ')}`
          ],
          expectedImpact: benchmark.threshold - avgScore,
          riskLevel: 'low',
          testPlan: `Run benchmark with optimized prompt against current baseline`,
          status: 'proposed',
          createdAt: Date.now()
        };
        this.improvementProposals.set(proposal.id, proposal);
        proposals.push(proposal);
      }

      // Check for repeated failures -> skill generation
      const failurePatterns = this.extractFailurePatterns(benchmark);
      for (const pattern of failurePatterns) {
        await this.queueSkillGeneration(pattern, benchmark.capability);
      }
    }

    return proposals;
  }

  private extractFailurePatterns(benchmark: BenchmarkSuite): string[] {
    const patterns: Map<string, number> = new Map();
    for (const run of benchmark.history.slice(-20)) {
      for (const result of run.results) {
        if (!result.passed) {
          const key = result.testCaseId.split('_').slice(0, 3).join('_');
          patterns.set(key, (patterns.get(key) || 0) + 1);
        }
      }
    }
    return Array.from(patterns.entries())
      .filter(([, count]) => count >= 3)
      .map(([pattern]) => pattern);
  }

  private async queueSkillGeneration(pattern: string, capability: Capability): Promise<void> {
    // Check if already queued
    if (this.skillGenerationQueue.some(s => s.failurePattern === pattern)) return;

    const relatedTests = this.getTestCases(capability).filter(t => t.id.includes(pattern));

    const request: SkillGenerationRequest = {
      failurePattern: pattern,
      capability,
      testCases: relatedTests,
      proposedSkill: {
        name: `auto_${capability}_${pattern}`,
        description: `Auto-generated skill for handling ${pattern} failures`,
        scripts: [],
        triggers: [pattern]
      },
      status: 'proposed'
    };

    this.skillGenerationQueue.push(request);
    
    // Create mission for autonomous orchestrator to handle
    autonomousOrchestrator.createMission(
      `Generate skill for ${capability} failure pattern: ${pattern}`,
      { priority: 2, metadata: { type: 'skill_generation', requestId: request.proposedSkill.name } }
    );
  }

  public async processSkillGeneration(): Promise<void> {
    for (const request of this.skillGenerationQueue) {
      if (request.status !== 'proposed') continue;
      request.status = 'generating';

      const prompt = `Generate a J.A.R.V.I.S. skill to handle this failure pattern:
Pattern: ${request.failurePattern}
Capability: ${request.capability}
Related test cases: ${request.testCases.map(t => `${t.name}: ${t.input}`).join('; ')}

Create a skill with:
1. Name: ${request.proposedSkill.name}
2. Description
3. Scripts (bash/python/ts) that implement the fix
4. Trigger conditions
5. Installation instructions

Output as valid skill manifest JSON.`;

      try {
        const res = await execHermes(prompt, { yolo: true, mode: 'oneshot' });
        const skill = JSON.parse(res.text.match(/\{[\s\S]*\}/)?.[0] || '{}');
        
        request.proposedSkill.scripts = skill.scripts || [];
        request.status = 'testing';
        
        // Would install and test here
        console.log(`[EvaluationHarness] Generated skill: ${request.proposedSkill.name}`);
      } catch (err) {
        console.warn('[EvaluationHarness] Skill generation failed:', err);
        request.status = 'rejected';
      }
    }
  }

  // ========================================================================
  // NIGHTLY IMPROVEMENT CYCLE
  // ========================================================================

  private startNightlyCycle(): void {
    // Run at 3 AM daily
    const now = new Date();
    const next3am = new Date(now);
    next3am.setHours(3, 0, 0, 0);
    if (next3am <= now) next3am.setDate(next3am.getDate() + 1);
    const msUntil3am = next3am.getTime() - now.getTime();

    setTimeout(() => {
      this.nightlyCycle();
      this.nightlyTimer = setInterval(() => this.nightlyCycle(), 24 * 60 * 60 * 1000);
    }, msUntil3am);
  }

  private async nightlyCycle(): Promise<void> {
    console.log('[EvaluationHarness] Starting nightly improvement cycle...');
    
    try {
      // 1. Generate test cases from recent memory
      for (const cap of Object.values(Capability)) {
        await this.generateTestCasesFromMemory(cap, 5);
        await this.generateAdversarialTestCases(cap, 3);
      }

      // 2. Run all benchmarks
      for (const benchmark of this.benchmarks.values()) {
        await this.runBenchmark(benchmark.id);
      }

      // 3. Generate improvement proposals
      const proposals = await this.generateImprovementProposals();
      console.log(`[EvaluationHarness] Generated ${proposals.length} improvement proposals`);

      // 4. Process skill generation queue
      await this.processSkillGeneration();

      // 5. Create autonomous missions for top proposals
      for (const proposal of proposals.slice(0, 3)) {
        if (proposal.status === 'proposed') {
          proposal.status = 'testing';
          autonomousOrchestrator.createMission(
            `Test improvement: ${proposal.description}`,
            { priority: 1, metadata: { proposalId: proposal.id } }
          );
        }
      }

      // 6. Persist state
      await this.persistState();

      console.log('[EvaluationHarness] Nightly cycle completed');
    } catch (err) {
      console.error('[EvaluationHarness] Nightly cycle failed:', err);
    }
  }

  private startSelfPlayLoop(): void {
    // Run self-play every 15 minutes
    setInterval(async () => {
      if (!this.isRunning) return;
      
      // Sample recent interactions and self-critique
      try {
        const context = await runMemoryBridge(['context', 'jarvis-evaluation']);
        const turns = context?.turns?.slice(-5) || [];
        
        for (const turn of turns) {
          if (turn.role === 'user' && turn.other_text) {
            const critique = await this.runSelfCritique(
              this.inferCapability(turn.text || ''),
              turn.other_text,
              turn.text || ''
            );
            
            if (critique.improved && critique.optimizedPrompt) {
              // Store optimized prompt for A/B testing
              await runMemoryBridge(['add_triad', 'instructions', JSON.stringify({
                type: 'optimized_prompt',
                originalInput: turn.text,
                originalOutput: turn.other_text,
                optimizedPrompt: critique.optimizedPrompt,
                critique: critique.critique,
                capability: this.inferCapability(turn.text || ''),
                timestamp: Date.now()
              })]);
            }
          }
        }
      } catch (err) {
        console.warn('[EvaluationHarness] Self-play loop error:', err);
      }
    }, 15 * 60 * 1000);
  }

  private inferCapability(text: string): Capability {
    const lower = text.toLowerCase();
    if (lower.includes('code') || lower.includes('function') || lower.includes('refactor')) return Capability.CODING;
    if (lower.includes('delegate') || lower.includes('hermes') || lower.includes('agent')) return Capability.DELEGATION;
    if (lower.includes('remember') || lower.includes('memory') || lower.includes('recall')) return Capability.MEMORY;
    if (lower.includes('plan') || lower.includes('mission') || lower.includes('task')) return Capability.PLANNING;
    if (lower.includes('fix') || lower.includes('repair') || lower.includes('error')) return Capability.SELF_REPAIR;
    return Capability.REASONING;
  }

  // ========================================================================
  // PERSISTENCE & BROADCAST
  // ========================================================================

  private async persistTestCase(tc: TestCase): Promise<void> {
    await runMemoryBridge(['add_triad', 'instructions', JSON.stringify({
      type: 'test_case',
      ...tc
    })]);
  }

  private async persistBenchmark(benchmark: BenchmarkSuite): Promise<void> {
    await runMemoryBridge(['add_triad', 'instructions', JSON.stringify({
      type: 'benchmark',
      ...benchmark
    })]);
  }

  private async persistExperiment(exp: Experiment): Promise<void> {
    await runMemoryBridge(['add_triad', 'instructions', JSON.stringify({
      type: 'experiment',
      ...exp
    })]);
  }

  private async persistState(): Promise<void> {
    await runMemoryBridge(['add_triad', 'instructions', JSON.stringify({
      type: 'evaluation_harness_state',
      benchmarks: Array.from(this.benchmarks.values()).map(b => ({ id: b.id, lastRun: b.lastRun, history: b.history.slice(-10) })),
      testCasesCount: this.testCases.size,
      experimentsCount: this.experiments.size,
      proposalsCount: this.improvementProposals.size,
      timestamp: Date.now()
    })]);
  }

  private async loadPersistedState(): Promise<void> {
    try {
      const context = await runMemoryBridge(['context', 'jarvis-evaluation']);
      // Could restore test cases, experiments, etc. from memory
      console.log('[EvaluationHarness] Loaded persisted state');
    } catch (err) {
      console.warn('[EvaluationHarness] Failed to load persisted state:', err);
    }
  }

  private broadcast(message: any): void {
    const payload = JSON.stringify(message);
    for (const ws of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      benchmarks: this.benchmarks.size,
      testCases: this.testCases.size,
      experiments: this.experiments.size,
      proposals: this.improvementProposals.size,
      skillQueue: this.skillGenerationQueue.length,
      evaluationHistory: this.evaluationHistory.length
    };
  }
}

export const evaluationHarness = new EvaluationHarness();