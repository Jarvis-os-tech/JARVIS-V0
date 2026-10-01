/**
 * J.A.R.V.I.S. Autonomous Self-Repair Engine
 * 
 * Intercepts tool execution errors, diagnoses root causes, generates adaptive
 * fallbacks, self-heals corrupted paths or missing commands, and records lessons.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, execFile } from 'child_process';
import { resolveWallpaperPath, resolveFolderNavigation, normalizePath } from './dynamic_resolver';
import { omarchyQuattro } from './omarchy_quattro_core';

export interface RepairAttemptResult {
  repaired: boolean;
  strategy: string;
  originalError: string;
  result?: any;
  lesson?: string;
}

export type SelfRepairTelemetryCallback = (event: {
  tool: string;
  originalError: string;
  strategy: string;
  success: boolean;
  durationMs: number;
}) => void;

class SelfRepairEngine {
  private telemetryCallback: SelfRepairTelemetryCallback | null = null;

  public setTelemetryCallback(cb: SelfRepairTelemetryCallback) {
    this.telemetryCallback = cb;
  }

  /**
   * Main entry point: intercepts an error from any tool or actuator,
   * analyzes the context, and attempts self-repair.
   */
  public async interceptAndRepair(tool: string, args: Record<string, any>, error: any): Promise<RepairAttemptResult> {
    const t0 = Date.now();
    const errorMsg = String(error?.message || error?.error || error || '');
    console.log(`[Self-Repair] Intercepted failure in tool '${tool}': "${errorMsg}". Initiating autonomous diagnosis...`);

    let repairResult: RepairAttemptResult = {
      repaired: false,
      strategy: 'none',
      originalError: errorMsg
    };

    // ── Strategy 1: Wallpaper / Background Setting Failures ─────────────────
    if (tool === 'set_wallpaper' || tool === 'change_wallpaper' || (tool === 'omarchy_control' && args?.action?.includes('bg'))) {
      repairResult = await this.repairWallpaperSetting(args, errorMsg);
    }
    // ── Strategy 2: File Explorer & Folder Navigation Failures ───────────────
    else if (tool === 'open_folder' || tool === 'open_app' || tool === 'launch_application') {
      repairResult = await this.repairFolderOrAppLaunch(tool, args, errorMsg);
    }
    // ── Strategy 3: Command Not Found / Execvp Failures ─────────────────────
    else if (errorMsg.includes('execvp') || errorMsg.includes('ENOENT') || errorMsg.includes('command not found')) {
      repairResult = await this.repairMissingCommand(tool, args, errorMsg);
    }
    // ── Strategy 4: System Control Fallback ────────────────────────────────
    else if (tool === 'omarchy_control') {
      repairResult = await this.repairOmarchyControl(args, errorMsg);
    }

    const durationMs = Date.now() - t0;
    if (this.telemetryCallback) {
      this.telemetryCallback({
        tool,
        originalError: errorMsg,
        strategy: repairResult.strategy,
        success: repairResult.repaired,
        durationMs
      });
    }

    return repairResult;
  }

  /**
   * Repairs wallpaper setting when paths have spaces, wrong extensions, or missing images.
   */
  private async repairWallpaperSetting(args: Record<string, any>, originalError: string): Promise<RepairAttemptResult> {
    console.log('[Self-Repair] Repairing wallpaper setting...');
    const candidateInput = args?.path || args?.target || args?.image || args?.filename || 'downloads';

    // 1. Try dynamic resolution with newest image in Downloads
    const resolved = resolveWallpaperPath(candidateInput);
    if (resolved.found && resolved.path) {
      const applyResult = await omarchyQuattro.setWallpaper(resolved.path);
      if (applyResult.success) {
        return {
          repaired: true,
          strategy: `dynamic_path_discovery (${resolved.source})`,
          originalError,
          result: applyResult,
          lesson: `Wallpaper path resolved dynamically to ${resolved.path}. Set via omarchy-theme-bg-set.`
        };
      }
    }

    // 2. Fallback: cycle to next wallpaper
    const nextRes = await omarchyQuattro.nextWallpaper();
    if (nextRes.success) {
      return {
        repaired: true,
        strategy: 'next_wallpaper_fallback',
        originalError,
        result: nextRes,
        lesson: 'Target image unlocatable; successfully applied next stock Omarchy wallpaper.'
      };
    }

    return {
      repaired: false,
      strategy: 'wallpaper_exhausted',
      originalError
    };
  }

  /**
   * Repairs file manager navigation or app launch failures.
   */
  private async repairFolderOrAppLaunch(tool: string, args: Record<string, any>, originalError: string): Promise<RepairAttemptResult> {
    const rawTarget = args?.folder_path || args?.section_name || args?.app_name || args?.app || args?.target || '';
    console.log(`[Self-Repair] Diagnosing launch failure for target: "${rawTarget}"...`);

    const lower = String(rawTarget).toLowerCase();

    // Check if target is a folder or file explorer request
    if (lower.includes('download') || lower.includes('doc') || lower.includes('pic') || lower.includes('file') || lower.includes('explorer') || lower.includes('folder')) {
      const nav = resolveFolderNavigation(rawTarget);
      if (nav.found && nav.path) {
        return new Promise((resolve) => {
          execFile(nav.command, nav.args, { env: process.env }, (err, stdout, stderr) => {
            if (!err) {
              resolve({
                repaired: true,
                strategy: `file_manager_direct_launch (${nav.command})`,
                originalError,
                result: { path: nav.path, command: nav.command },
                lesson: `Navigated file manager to ${nav.path} using ${nav.command}.`
              });
            } else {
              // Try fallback to xdg-open
              execFile('xdg-open', [nav.path], { env: process.env }, (err2) => {
                resolve({
                  repaired: !err2,
                  strategy: 'xdg_open_fallback',
                  originalError,
                  result: { path: nav.path, command: 'xdg-open' },
                  lesson: `Opened ${nav.path} via xdg-open fallback.`
                });
              });
            }
          });
        });
      }
    }

    // Check if it's an application name that exists in PATH
    return new Promise((resolve) => {
      exec(`which "${rawTarget}"`, (err, stdout) => {
        if (!err && stdout.trim()) {
          const bin = stdout.trim();
          execFile(bin, [], { env: process.env }, (execErr) => {
            resolve({
              repaired: !execErr,
              strategy: `which_path_resolution (${bin})`,
              originalError,
              result: { binary: bin },
              lesson: `Resolved binary '${rawTarget}' to ${bin}.`
            });
          });
        } else {
          resolve({
            repaired: false,
            strategy: 'binary_not_in_path',
            originalError
          });
        }
      });
    });
  }

  /**
   * Repairs missing command by inspecting alternatives or Omarchy CLI equivalents.
   */
  private async repairMissingCommand(tool: string, args: Record<string, any>, originalError: string): Promise<RepairAttemptResult> {
    console.log(`[Self-Repair] Searching Omarchy command center for tool: ${tool}...`);
    // Attempt executing via omarchy CLI directly
    const omarchyRes = await omarchyQuattro.executeOmarchyCommand(tool, args?.action, args?.target ? [args.target] : []);
    if (omarchyRes.success) {
      return {
        repaired: true,
        strategy: 'omarchy_cli_reroute',
        originalError,
        result: omarchyRes,
        lesson: `Rerouted failed worker to 'omarchy ${tool} ${args?.action || ''}'.`
      };
    }

    return {
      repaired: false,
      strategy: 'missing_command_exhausted',
      originalError
    };
  }

  /**
   * Repairs Omarchy control issues (e.g. wrong domain or action syntax).
   */
  private async repairOmarchyControl(args: Record<string, any>, originalError: string): Promise<RepairAttemptResult> {
    const { domain, action, target } = args;
    console.log(`[Self-Repair] Diagnosing Omarchy control mismatch: domain=${domain}, action=${action}, target=${target}`);

    if (domain === 'theme' && (action === 'set' || action === 'wallpaper') && target) {
      // Check if target is an image file path rather than a theme name
      const ext = path.extname(target).toLowerCase();
      if (ext && ['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        const bgRes = await omarchyQuattro.setWallpaper(target);
        if (bgRes.success) {
          return {
            repaired: true,
            strategy: 'theme_set_to_wallpaper_redirect',
            originalError,
            result: bgRes,
            lesson: `Redirected 'omarchy theme set <image>' to 'omarchy-theme-bg-set ${target}'.`
          };
        }
      }
    }

    if (domain === 'hyprland' && action === 'workspace' && target) {
      const wsRes = await omarchyQuattro.switchWorkspace(target);
      return {
        repaired: wsRes.success,
        strategy: 'hyprland_socket_direct_dispatch',
        originalError,
        result: wsRes,
        lesson: `Switched Hyprland workspace to ${target} via direct socket dispatch.`
      };
    }

    return {
      repaired: false,
      strategy: 'omarchy_control_unrepaired',
      originalError
    };
  }
}

export const selfRepairEngine = new SelfRepairEngine();
