/**
 * J.A.R.V.I.S. Working Memory — Unified Agent Scratchpad
 *
 * Single persistent state store that the reasoning loop reads and writes
 * every iteration. Replaces the fragmented memory spread across:
 *   - agent_memory.ts (localStorage / frontend)
 *   - experience_learner.ts (JSONL episodes)
 *   - memory_bridge.py (Python sovereign memory)
 *   - autonomous_engine.ts (transient diagnostics)
 *
 * Design decisions:
 *   - File-backed JSON on disk (no localStorage dependency — works on backend)
 *   - Lazy load / eager write to keep it crash-safe
 *   - Capped collections (steps, errors, rules) to bound prompt size
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { WorkingMemory, CognitiveStep, TaskPlan } from './cognitive_types';

const STATE_DIR = path.join(os.homedir(), '.local/state/jarvis');
const MEMORY_FILE = path.join(STATE_DIR, 'working_memory.json');

const MAX_COMPLETED_STEPS = 50;
const MAX_RECENT_ERRORS = 20;
const MAX_LEARNED_RULES = 30;
const MAX_USER_FACTS = 50;

// ─── Default State ───────────────────────────────────────────────────

function createDefaultMemory(): WorkingMemory {
  return {
    currentGoal: null,
    currentPlan: null,
    completedSteps: [],
    userFacts: {},
    learnedRules: [
      'Set wallpapers using omarchy-theme-bg-set <path>. Auto-resolve paths in ~/Downloads.',
      'Launch file explorer via nautilus with folder path or xdg-open.',
      'Use run_system_diagnostics to monitor hardware, CPU, RAM, and thermals.',
      'Switch Hyprland workspaces (1-10) via direct socket dispatch.'
    ],
    recentErrors: [],
    lastUpdated: new Date().toISOString()
  };
}

// ─── Disk I/O ────────────────────────────────────────────────────────

function ensureStateDir(): void {
  if (!fs.existsSync(STATE_DIR)) {
    try { fs.mkdirSync(STATE_DIR, { recursive: true }); } catch { /* ignore */ }
  }
}

function loadFromDisk(): WorkingMemory {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle schema evolution
      return { ...createDefaultMemory(), ...parsed };
    }
  } catch (err: any) {
    console.warn('[WorkingMemory] Failed to load from disk, using defaults:', err.message);
  }
  return createDefaultMemory();
}

function saveToDisk(memory: WorkingMemory): void {
  ensureStateDir();
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[WorkingMemory] Failed to persist to disk:', err.message);
  }
}

// ─── Singleton Instance ──────────────────────────────────────────────

let _memory: WorkingMemory | null = null;

function getMemory(): WorkingMemory {
  if (!_memory) {
    _memory = loadFromDisk();
  }
  return _memory;
}

function persist(): void {
  if (_memory) {
    _memory.lastUpdated = new Date().toISOString();
    saveToDisk(_memory);
  }
}

// ─── Public API ──────────────────────────────────────────────────────

export const workingMemory = {

  /** Returns the full current state (read-only snapshot). */
  getState(): Readonly<WorkingMemory> {
    return getMemory();
  },

  // ── Goal Management ──────────────────────────────────────────────

  /** Sets the current top-level goal the agent is pursuing. */
  setGoal(goal: string): void {
    const mem = getMemory();
    mem.currentGoal = goal;
    mem.completedSteps = [];  // reset steps for new goal
    persist();
  },

  /** Clears the current goal (task complete or abandoned). */
  clearGoal(): void {
    const mem = getMemory();
    mem.currentGoal = null;
    mem.currentPlan = null;
    persist();
  },

  // ── Plan Management ──────────────────────────────────────────────

  /** Stores a decomposed task plan. */
  setPlan(plan: TaskPlan): void {
    const mem = getMemory();
    mem.currentPlan = plan;
    persist();
  },

  /** Updates a subtask status within the current plan. */
  updateSubtaskStatus(
    subtaskId: string,
    status: 'pending' | 'running' | 'done' | 'failed' | 'skipped',
    result?: string,
    error?: string
  ): void {
    const mem = getMemory();
    if (!mem.currentPlan) return;
    const sub = mem.currentPlan.subtasks.find(s => s.id === subtaskId);
    if (sub) {
      sub.status = status;
      if (result !== undefined) sub.result = result;
      if (error !== undefined) sub.error = error;
      mem.currentPlan.updatedAt = new Date().toISOString();
      persist();
    }
  },

  /** Replaces the current plan with a revised one (replanning after failure). */
  replacePlan(newPlan: TaskPlan): void {
    const mem = getMemory();
    mem.currentPlan = newPlan;
    persist();
  },

  // ── ReAct Step Logging ───────────────────────────────────────────

  /** Records a completed cognitive step (Think → Act → Observe cycle). */
  recordStep(step: CognitiveStep): void {
    const mem = getMemory();
    mem.completedSteps.push(step);
    // Keep bounded
    if (mem.completedSteps.length > MAX_COMPLETED_STEPS) {
      mem.completedSteps = mem.completedSteps.slice(-MAX_COMPLETED_STEPS);
    }
    persist();
  },

  /** Returns the N most recent steps as context for the LLM. */
  getRecentSteps(n: number = 8): CognitiveStep[] {
    return getMemory().completedSteps.slice(-n);
  },

  // ── Error Tracking ───────────────────────────────────────────────

  /** Records an error and its resolution for future self-correction. */
  recordError(tool: string, error: string, resolution: string): void {
    const mem = getMemory();
    mem.recentErrors.push({
      tool,
      error,
      resolution,
      timestamp: new Date().toISOString()
    });
    if (mem.recentErrors.length > MAX_RECENT_ERRORS) {
      mem.recentErrors = mem.recentErrors.slice(-MAX_RECENT_ERRORS);
    }
    persist();
  },

  // ── Learned Rules ────────────────────────────────────────────────

  /** Adds a new learned rule (deduplicated). */
  addLearnedRule(rule: string): void {
    const mem = getMemory();
    if (!mem.learnedRules.includes(rule)) {
      mem.learnedRules.push(rule);
      if (mem.learnedRules.length > MAX_LEARNED_RULES) {
        mem.learnedRules = mem.learnedRules.slice(-MAX_LEARNED_RULES);
      }
      persist();
    }
  },

  // ── User Facts ───────────────────────────────────────────────────

  /** Stores or updates a user fact/preference. */
  setUserFact(key: string, value: string): void {
    const mem = getMemory();
    mem.userFacts[key] = value;
    // Cap the number of facts
    const keys = Object.keys(mem.userFacts);
    if (keys.length > MAX_USER_FACTS) {
      delete mem.userFacts[keys[0]];
    }
    persist();
  },

  /** Retrieves a specific user fact. */
  getUserFact(key: string): string | undefined {
    return getMemory().userFacts[key];
  },

  // ── Prompt Formatting ────────────────────────────────────────────

  /** Formats the working memory into a prompt block for the reasoning LLM. */
  formatForPrompt(): string {
    const mem = getMemory();
    const parts: string[] = [];

    parts.push('[WORKING MEMORY — CURRENT STATE]');

    if (mem.currentGoal) {
      parts.push(`\nACTIVE GOAL: ${mem.currentGoal}`);
    }

    if (mem.currentPlan) {
      const taskSummary = mem.currentPlan.subtasks.map(
        s => `  [${s.status.toUpperCase()}] ${s.id}: ${s.description}${s.result ? ` → ${s.result.slice(0, 80)}` : ''}${s.error ? ` ✗ ${s.error.slice(0, 60)}` : ''}`
      ).join('\n');
      parts.push(`\nACTIVE PLAN:\n${taskSummary}`);
    }

    if (mem.completedSteps.length > 0) {
      const recent = mem.completedSteps.slice(-5);
      const stepLines = recent.map(
        s => `  Step ${s.index}: [${s.action}] → ${s.observation.slice(0, 120)}`
      ).join('\n');
      parts.push(`\nRECENT ACTIONS (last ${recent.length}):\n${stepLines}`);
    }

    if (Object.keys(mem.userFacts).length > 0) {
      const facts = Object.entries(mem.userFacts)
        .slice(0, 8)
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join('\n');
      parts.push(`\nUSER FACTS:\n${facts}`);
    }

    if (mem.learnedRules.length > 0) {
      const rules = mem.learnedRules.slice(-6).map((r, i) => `  ${i + 1}. ${r}`).join('\n');
      parts.push(`\nLEARNED RULES:\n${rules}`);
    }

    if (mem.recentErrors.length > 0) {
      const errors = mem.recentErrors.slice(-3).map(
        e => `  - [${e.tool}] ${e.error} → Fixed by: ${e.resolution}`
      ).join('\n');
      parts.push(`\nRECENT ERROR RESOLUTIONS:\n${errors}`);
    }

    return parts.join('\n');
  },

  /** Force reload from disk (e.g., after an external write). */
  reload(): void {
    _memory = loadFromDisk();
  },

  /** Reset to defaults (dangerous — use for testing only). */
  reset(): void {
    _memory = createDefaultMemory();
    persist();
  }
};
