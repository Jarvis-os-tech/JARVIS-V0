import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { loadAgentRoster, getAgent, AgentDefinition } from './ceo_roster.js';
import { recordAgentSession, findAgentSessions, MasterSessionIndex, loadMasterSessionIndex, SessionSearchResult } from './ceo_session_logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');

export type MissionType = 'FEATURE' | 'BUGFIX' | 'REFACTOR' | 'RESEARCH' | 'AUDIT' | 'GENERAL';

export interface WorkflowPrescription {
  type: MissionType;
  title: string;
  rationale: string;
  recommendedSkills: string[];
  assignedAgent: string;
  steps: Array<{
    stepNumber: number;
    description: string;
    responsibleAgent: string;
  }>;
}

export interface CeoMissionResult {
  success: boolean;
  missionId: string;
  goal: string;
  prescription: WorkflowPrescription;
  workerOutput: string;
  qualityGatePassed: boolean;
  qualityGateLog: string;
  executiveSummary: string;
  sessionId?: number;
  durationMs: number;
  timestamp: string;
}

export type CeoProgressCallback = (event: {
  missionId: string;
  stage: 'PLANNING' | 'DELEGATING' | 'EXECUTING' | 'QUALITY_CHECK' | 'LOGGING' | 'COMPLETED' | 'FAILED';
  message: string;
  details?: any;
}) => void;

/**
 * Resolve path to Hermes executable
 */
function resolveHermesBinary(): string {
  const envBin = process.env.HERMES_BIN;
  if (envBin && fs.existsSync(envBin)) return envBin;

  const standardPaths = [
    '/home/g0pi/.local/bin/hermes',
    path.resolve(process.env.HOME || '', '.local/bin/hermes'),
    path.resolve(process.env.HOME || '', '.hermes/hermes-agent/bin/hermes')
  ];

  for (const p of standardPaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'hermes';
}

/**
 * Classify user intent and prescribe workflow based on CEO skills
 */
export function prescribeWorkflow(goal: string): WorkflowPrescription {
  const lower = goal.toLowerCase();

  if (lower.includes('fix') || lower.includes('bug') || lower.includes('error') || lower.includes('fail') || lower.includes('issue')) {
    return {
      type: 'BUGFIX',
      title: 'Defect Remediation & Root Cause Resolution',
      rationale: 'Identified bug remediation request. Prescribing systematic debugging and test verification.',
      recommendedSkills: ['systematic-debugging', 'test-driven-development', 'code-quality-check'],
      assignedAgent: 'hermes',
      steps: [
        { stepNumber: 1, description: 'Analyze error stack trace and reproduce failure', responsibleAgent: 'hermes' },
        { stepNumber: 2, description: 'Apply atomic root-cause code patch', responsibleAgent: 'hermes' },
        { stepNumber: 3, description: 'Verify regression tests and type safety', responsibleAgent: 'jarvis' }
      ]
    };
  }

  if (lower.includes('build') || lower.includes('create') || lower.includes('add') || lower.includes('new feature') || lower.includes('implement')) {
    return {
      type: 'FEATURE',
      title: 'Autonomous Feature Engineering Cycle',
      rationale: 'Identified feature development mission. Prescribing structured planning and test-driven implementation.',
      recommendedSkills: ['speckit-plan', 'speckit-tasks', 'test-driven-development', 'verification-before-completion'],
      assignedAgent: 'hermes',
      steps: [
        { stepNumber: 1, description: 'Decompose feature spec into actionable tasks', responsibleAgent: 'jarvis' },
        { stepNumber: 2, description: 'Implement code modules and interfaces', responsibleAgent: 'hermes' },
        { stepNumber: 3, description: 'Run quality checks and type validation', responsibleAgent: 'jarvis' }
      ]
    };
  }

  if (lower.includes('refactor') || lower.includes('clean') || lower.includes('optimize') || lower.includes('perf')) {
    return {
      type: 'REFACTOR',
      title: 'Architectural Refactor & Quality Optimization',
      rationale: 'Identified optimization mission. Enforcing strict verification gates and minimal divergence.',
      recommendedSkills: ['code-quality-check', 'verification-before-completion', 'finishing-a-development-branch'],
      assignedAgent: 'hermes',
      steps: [
        { stepNumber: 1, description: 'Audit current codebase bottlenecks and types', responsibleAgent: 'hermes' },
        { stepNumber: 2, description: 'Restructure components while maintaining backwards compatibility', responsibleAgent: 'hermes' },
        { stepNumber: 3, description: 'Execute full build and lint validation', responsibleAgent: 'jarvis' }
      ]
    };
  }

  if (lower.includes('research') || lower.includes('investigate') || lower.includes('analyze') || lower.includes('explore')) {
    return {
      type: 'RESEARCH',
      title: 'Technical Investigation & Knowledge Synthesis',
      rationale: 'Identified research request. Prescribing deep research prompt generation and project context analysis.',
      recommendedSkills: ['create-deep-research-prompt', 'analyze-project-context', 'document-project-state'],
      assignedAgent: 'hermes',
      steps: [
        { stepNumber: 1, description: 'Inspect codebase references and architecture docs', responsibleAgent: 'hermes' },
        { stepNumber: 2, description: 'Synthesize findings and recommendations', responsibleAgent: 'hermes' }
      ]
    };
  }

  return {
    type: 'GENERAL',
    title: 'Autonomous Engineering Mission',
    rationale: 'General engineering directive. Prescribing standard CEO operating protocol with Hermes delegation.',
    recommendedSkills: ['using-ceo', 'code-quality-check', 'verification-before-completion'],
    assignedAgent: 'hermes',
    steps: [
      { stepNumber: 1, description: 'Plan and execute delegated instructions', responsibleAgent: 'hermes' },
      { stepNumber: 2, description: 'Audit deliverables and report summary', responsibleAgent: 'jarvis' }
    ]
  };
}

/**
 * Execute task via Hermes CLI
 */
async function invokeHermes(prompt: string, skills: string[] = []): Promise<{ success: boolean; output: string }> {
  const hermesBin = resolveHermesBinary();

  return new Promise((resolve) => {
    // Format Hermes command with one-shot mode and skills
    const args: string[] = ['-z', prompt, '--yolo'];
    if (skills.length > 0) {
      args.push('-s', skills.join(','));
    }

    let stdout = '';
    let stderr = '';

    const proc = spawn(hermesBin, args, {
      cwd: WORKSPACE_ROOT,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    const timeout = setTimeout(() => {
      try {
        proc.kill('SIGTERM');
      } catch (e) {}
      resolve({
        success: false,
        output: stdout || `[Hermes] Execution timed out after 120 seconds.`
      });
    }, 120000);

    proc.stdout?.on('data', (d) => {
      stdout += d.toString();
    });

    proc.stderr?.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ success: true, output: stdout.trim() || stderr.trim() });
      } else {
        // If Hermes returned non-zero, capture whatever it said
        resolve({
          success: false,
          output: stdout.trim() || stderr.trim() || `Hermes exited with code ${code}`
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        output: `Failed to spawn Hermes executable at '${hermesBin}': ${err.message}`
      });
    });
  });
}

/**
 * Run quality gate: tsc --noEmit
 */
async function runQualityGate(): Promise<{ passed: boolean; log: string }> {
  return new Promise((resolve) => {
    const proc = spawn('npm', ['run', 'lint'], {
      cwd: WORKSPACE_ROOT,
      env: process.env
    });

    let output = '';
    proc.stdout?.on('data', (d) => { output += d.toString(); });
    proc.stderr?.on('data', (d) => { output += d.toString(); });

    proc.on('close', (code) => {
      resolve({
        passed: code === 0,
        log: output.trim()
      });
    });

    proc.on('error', (err) => {
      resolve({
        passed: false,
        log: `Quality gate runner error: ${err.message}`
      });
    });
  });
}

/**
 * CEO Orchestrator Engine: Executes full autonomous workflow end-to-end
 */
export async function executeCeoMission(
  goal: string,
  onProgress?: CeoProgressCallback
): Promise<CeoMissionResult> {
  const startTime = Date.now();
  const missionId = `mission-${Date.now()}`;

  // 1. Prescribe Workflow
  onProgress?.({
    missionId,
    stage: 'PLANNING',
    message: `J.A.R.V.I.S. CEO analyzing directive: "${goal}"`
  });

  const prescription = prescribeWorkflow(goal);

  // 2. Delegate to Hermes
  onProgress?.({
    missionId,
    stage: 'DELEGATING',
    message: `Prescribed ${prescription.type} workflow. Delegating mission to ${prescription.assignedAgent.toUpperCase()} with skills: [${prescription.recommendedSkills.join(', ')}]`,
    details: prescription
  });

  const hermesPrompt = `[MISSION FOR HERMES - DIRECTED BY CEO J.A.R.V.I.S.]
Mission Title: ${prescription.title}
Objective: ${goal}
Required Quality Standards:
- All code must conform to TypeScript strict guidelines.
- Preserved 4-subfolder workspace architecture.
- Target branch is dev.
Please execute the requested task and provide a concise technical summary of what was performed.`;

  onProgress?.({
    missionId,
    stage: 'EXECUTING',
    message: `Hermes executing technical directive...`
  });

  const workerResult = await invokeHermes(hermesPrompt, prescription.recommendedSkills);

  // 3. Quality Gate Verification
  onProgress?.({
    missionId,
    stage: 'QUALITY_CHECK',
    message: `CEO J.A.R.V.I.S. auditing quality gates (tsc --noEmit)...`
  });

  const qualityGate = await runQualityGate();

  // 4. Log Session in Central Single-Index Data Center
  onProgress?.({
    missionId,
    stage: 'LOGGING',
    message: `Logging mission details into Central Memory Index...`
  });

  const topic = `${prescription.title}: ${goal.slice(0, 80)}`;
  const summary = workerResult.output.slice(0, 300) || `Mission ${prescription.type} executed. Quality gates: ${qualityGate.passed ? 'PASSED' : 'CHECK FAILED'}`;
  
  const recordedSession = recordAgentSession(
    'Hermes',
    topic,
    summary,
    ['agents_roster.yaml', 'skills/skills_registry.json']
  );

  // 5. Generate Executive British Briefing
  const passedText = qualityGate.passed
    ? "All quality gates and TypeScript type validations have passed with flying colours, sir."
    : "The actuation was attempted, however our quality gate reported lint or type discrepancies requiring your attention, sir.";

  const executiveSummary = `Right away, Tony. I have orchestrated the ${prescription.type.toLowerCase()} mission and commanded Hermes to execute the directive. ${passedText} The mission has been duly logged into our Central Memory Index under Session ${recordedSession.sessionId}.`;

  const durationMs = Date.now() - startTime;

  onProgress?.({
    missionId,
    stage: qualityGate.passed ? 'COMPLETED' : 'FAILED',
    message: executiveSummary,
    details: {
      sessionId: recordedSession.sessionId,
      durationMs
    }
  });

  return {
    success: qualityGate.passed && workerResult.success,
    missionId,
    goal,
    prescription,
    workerOutput: workerResult.output,
    qualityGatePassed: qualityGate.passed,
    qualityGateLog: qualityGate.log,
    executiveSummary,
    sessionId: recordedSession.sessionId,
    durationMs,
    timestamp: new Date().toISOString()
  };
}
