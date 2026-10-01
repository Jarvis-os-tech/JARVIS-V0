import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { RawBrainEvent } from '../core/types.js';

export type EventIngestCallback = (event: RawBrainEvent) => Promise<void>;

/**
 * Hermes CLI & Session Adapter
 * Tracks ~/.hermes/ session files, logs, and activity records
 */
export class HermesAdapter {
  private baseDir: string;
  private watcher: fs.FSWatcher | null = null;
  private onEvent: EventIngestCallback | null = null;
  private knownFiles: Set<string> = new Set();

  constructor() {
    this.baseDir = path.join(os.homedir(), '.hermes');
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

    // Read existing files to baseline
    try {
      const files = fs.readdirSync(this.baseDir);
      files.forEach(f => this.knownFiles.add(f));
    } catch (e) {
      // directory read failure
    }

    try {
      this.watcher = fs.watch(this.baseDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        this.handleHermesChange(filename);
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  private async handleHermesChange(filename: string): Promise<void> {
    const fullPath = path.join(this.baseDir, filename);
    if (!fs.existsSync(fullPath)) return;

    try {
      const stat = fs.statSync(fullPath);
      const ext = path.extname(filename).toLowerCase();
      const validExtensions = ['.json', '.jsonl', '.txt', '.md', '.log', '.yaml', '.yml', '.sh'];
      if (!validExtensions.includes(ext)) {
        return;
      }

      if (filename.includes('cache') || filename.includes('audio') || filename.includes('gateway_state') || filename.includes('pycache')) {
        return;
      }

      // Only inspect files under 500KB to avoid excessive reads
      if (stat.size > 500 * 1024) return;

      const content = fs.readFileSync(fullPath, 'utf8');
      if (!content || content.trim().length === 0 || content.includes('\0')) return;

      const event: RawBrainEvent = {
        id: crypto.randomUUID(),
        agentId: 'Hermes',
        sessionId: `hermes_${path.basename(filename, path.extname(filename))}`,
        timestamp: stat.mtime.toISOString(),
        payload: `[Hermes Execution Log: ${filename}]\n${content.slice(-2000)}`,
        sourcePath: fullPath,
        metadata: {
          file: filename,
          size: stat.size
        }
      };

      if (this.onEvent) {
        await this.onEvent(event);
      }
    } catch (e) {
      // ignore reading race
    }
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
