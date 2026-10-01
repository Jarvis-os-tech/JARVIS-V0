import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { RawBrainEvent } from '../core/types.js';
import { EventIngestCallback } from './hermes_adapter.js';

/**
 * Claude Code / OpenCode Adapter
 * Tailer with byte-offset tracking and debouncing for ~/.claude/history.jsonl
 */
export class ClaudeAdapter {
  private targetFile: string;
  private currentOffset: number = 0;
  private debounceTimer: NodeJS.Timeout | null = null;
  private watcher: fs.FSWatcher | null = null;
  private onEvent: EventIngestCallback | null = null;

  constructor() {
    this.targetFile = path.join(os.homedir(), '.claude', 'history.jsonl');
  }

  public start(callback: EventIngestCallback): boolean {
    this.onEvent = callback;

    const dir = path.dirname(this.targetFile);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        return false;
      }
    }

    if (fs.existsSync(this.targetFile)) {
      try {
        const stat = fs.statSync(this.targetFile);
        // Start from current end or read last 4KB on startup
        this.currentOffset = Math.max(0, stat.size - 4096);
      } catch (e) {
        this.currentOffset = 0;
      }
    }

    try {
      this.watcher = fs.watch(dir, (eventType, filename) => {
        if (filename === 'history.jsonl' || filename === 'history.json') {
          this.triggerDebouncedRead();
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  private triggerDebouncedRead(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.readNewLines();
    }, 300);
  }

  private async readNewLines(): Promise<void> {
    if (!fs.existsSync(this.targetFile)) return;

    try {
      const stat = fs.statSync(this.targetFile);
      if (stat.size <= this.currentOffset) {
        if (stat.size < this.currentOffset) {
          // File was truncated or rotated
          this.currentOffset = 0;
        }
        return;
      }

      const bytesToRead = stat.size - this.currentOffset;
      const buffer = Buffer.alloc(bytesToRead);
      const fd = fs.openSync(this.targetFile, 'r');
      fs.readSync(fd, buffer, 0, bytesToRead, this.currentOffset);
      fs.closeSync(fd);

      this.currentOffset = stat.size;

      const chunk = buffer.toString('utf8');
      const lines = chunk.split('\n').filter(l => l.trim().length > 0);

      for (const line of lines) {
        let payloadText = line;
        let sessionId = 'claude_session';
        try {
          const parsed = JSON.parse(line);
          payloadText = parsed.content || parsed.message || parsed.text || JSON.stringify(parsed);
          if (parsed.sessionId) sessionId = parsed.sessionId;
        } catch (e) {
          // raw line
        }

        const event: RawBrainEvent = {
          id: crypto.randomUUID(),
          agentId: 'Claude',
          sessionId,
          timestamp: new Date().toISOString(),
          payload: `[Claude Code]: ${payloadText}`,
          sourcePath: this.targetFile
        };

        if (this.onEvent) {
          await this.onEvent(event);
        }
      }
    } catch (e) {
      // file read error
    }
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}
