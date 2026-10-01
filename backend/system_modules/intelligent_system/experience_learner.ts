/**
 * J.A.R.V.I.S. Continuous Experience Learner & Self-Improving Engine
 * 
 * Records execution episodes, audits successes and failures, synthesizes behavioral
 * rules, and commits them to the sovereign memory matrix for permanent self-evolution.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';

export interface ExecutionEpisode {
  id: string;
  timestamp: string;
  tool: string;
  args: Record<string, any>;
  success: boolean;
  error?: string;
  repaired?: boolean;
  strategy?: string;
  lesson?: string;
}

class ExperienceLearner {
  private logFilePath: string;
  private recentEpisodes: ExecutionEpisode[] = [];
  private learnedRules: string[] = [];

  constructor() {
    const stateDir = path.join(os.homedir(), '.local/state/jarvis');
    if (!fs.existsSync(stateDir)) {
      try { fs.mkdirSync(stateDir, { recursive: true }); } catch {}
    }
    this.logFilePath = path.join(stateDir, 'execution_episodes.jsonl');
    this.loadLearnedRules();
  }

  private loadLearnedRules() {
    // Default baseline learned rules for Omarchy 4
    this.learnedRules = [
      'Omarchy 4 Wallpaper: Set wallpapers using omarchy-theme-bg-set <path>. Auto-resolve paths in ~/Downloads and preserve spaces.',
      'File Explorer: Launch nautilus with folder path arguments or xdg-open. Do not drop folder path parameters.',
      'Omarchy 4 Diagnostics: Use run_system_diagnostics or omarchy debug/hw to monitor hardware, CPU, RAM, and thermals.',
      'Hyprland Workspaces: Switch workspaces dynamically (1-10) using direct socket dispatch.'
    ];

    if (fs.existsSync(this.logFilePath)) {
      try {
        const lines = fs.readFileSync(this.logFilePath, 'utf-8').trim().split('\n');
        for (const line of lines.slice(-50)) {
          if (!line) continue;
          const ep = JSON.parse(line);
          if (ep.lesson && !this.learnedRules.includes(ep.lesson)) {
            this.learnedRules.push(ep.lesson);
          }
        }
      } catch {}
    }
  }

  /**
   * Records an execution episode and triggers self-reflection.
   */
  public logEpisode(episode: Omit<ExecutionEpisode, 'id' | 'timestamp'>) {
    const fullEpisode: ExecutionEpisode = {
      id: `ep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...episode
    };

    this.recentEpisodes.push(fullEpisode);
    if (this.recentEpisodes.length > 100) this.recentEpisodes.shift();

    // Append to disk asynchronously
    try {
      fs.appendFileSync(this.logFilePath, JSON.stringify(fullEpisode) + '\n');
    } catch {}

    // If repair was applied or a lesson was generated, commit to learned rules
    if (fullEpisode.lesson && !this.learnedRules.includes(fullEpisode.lesson)) {
      this.learnedRules.push(fullEpisode.lesson);
      this.persistRuleToSovereignMemory(fullEpisode.lesson);
    }
  }

  /**
   * Persists a newly formulated rule into the sovereign memory matrix (instructions category).
   */
  private persistRuleToSovereignMemory(rule: string) {
    const memoryBridge = path.resolve(process.cwd(), 'backend/memory_bridge.py');
    if (fs.existsSync(memoryBridge)) {
      execFile('python3', [memoryBridge, 'add_triad', 'instructions', rule], { env: process.env }, (err) => {
        if (!err) {
          console.log(`[Experience Learner] Committed learned rule to memory core: "${rule}"`);
        }
      });
    }
  }

  /**
   * Generates dynamic prompt context from learned rules for Gemini Live and Groq models.
   */
  public getLearnedPromptDirectives(): string {
    if (this.learnedRules.length === 0) return '';
    const items = this.learnedRules.slice(-6).map((r, i) => `   ${i + 1}. ${r}`).join('\n');
    return `\n\nDYNAMIC SYSTEM RULES LEARNED FROM PREVIOUS OPERATIONS:\n${items}\nApply these learned principles dynamically to ensure zero-latency, error-free execution.`;
  }

  /**
   * Returns recent operational metrics for the CEO HUD.
   */
  public getMetrics() {
    const total = this.recentEpisodes.length;
    const successes = this.recentEpisodes.filter(e => e.success).length;
    const repairs = this.recentEpisodes.filter(e => e.repaired).length;
    return {
      totalEpisodes: total,
      successRate: total > 0 ? (successes / total) * 100 : 100,
      totalRepairs: repairs,
      activeLearnedRulesCount: this.learnedRules.length
    };
  }
}

export const experienceLearner = new ExperienceLearner();
