import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { RawBrainEvent } from '../core/types.js';
import { EventIngestCallback } from './hermes_adapter.js';

/**
 * OpenAI Codex CLI Adapter
 * Monitors ~/.codex/ history and session logs
 */
export class CodexAdapter {
  private baseDir: string;
  private watcher: fs.FSWatcher | null = null;
  private onEvent: EventIngestCallback | null = null;

  constructor() {
    this.baseDir = path.join(os.homedir(), '.codex');
  }

  public start(callback: EventIngestCallback): boolean {
    this.onEvent = callback;
    if (!fs.existsSync(this.baseDir)) {
      try {
        fs.mkdirSync(this.baseDir, { recursive: true });
      } catch (e) {
        return false;
      }
    }

    try {
      this.watcher = fs.watch(this.baseDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        this.handleCodexChange(filename);
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  private async handleCodexChange(filename: string): Promise<void> {
    const fullPath = path.join(this.baseDir, filename);
    if (!fs.existsSync(fullPath)) return;

    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile() || stat.size > 200 * 1024) return;
      if (/(?:\.db|\.db-shm|\.db-wal|\.sqlite|\.sqlite3|\.bin|\.lock|\.sock|\.pyc)$/i.test(filename)) return;

      const content = fs.readFileSync(fullPath, 'utf8');
      if (!content.trim() || content.includes('\0')) return;

      const event: RawBrainEvent = {
        id: crypto.randomUUID(),
        agentId: 'Codex',
        sessionId: `codex_${path.basename(filename, path.extname(filename))}`,
        timestamp: stat.mtime.toISOString(),
        payload: `[Codex Execution: ${filename}]\n${content.slice(-1500)}`,
        sourcePath: fullPath
      };

      if (this.onEvent) {
        await this.onEvent(event);
      }
    } catch (e) {
      // ignore
    }
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
