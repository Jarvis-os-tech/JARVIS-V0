import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { RawBrainEvent } from '../core/types.js';
import { EventIngestCallback } from './hermes_adapter.js';

/**
 * Antigravity IDE & CLI Adapter
 * Monitors ~/.gemini/antigravity/brain/ session transcripts
 */
export class AntigravityAdapter {
  private baseDir: string;
  private watchers: fs.FSWatcher[] = [];
  private onEvent: EventIngestCallback | null = null;
  private fileOffsets: Map<string, number> = new Map();

  constructor() {
    this.baseDir = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
  }

  public start(callback: EventIngestCallback): boolean {
    this.onEvent = callback;
    if (!fs.existsSync(this.baseDir)) {
      return false;
    }

    try {
      // Watch parent directory for new session directories
      const parentWatcher = fs.watch(this.baseDir, (eventType, filename) => {
        if (!filename) return;
        const candidate = path.join(this.baseDir, filename, '.system_generated', 'logs', 'transcript.jsonl');
        if (fs.existsSync(candidate)) {
          this.tailTranscriptFile(candidate);
        }
      });
      this.watchers.push(parentWatcher);

      // Inspect active session directories
      const entries = fs.readdirSync(this.baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const transcriptFile = path.join(this.baseDir, entry.name, '.system_generated', 'logs', 'transcript.jsonl');
          if (fs.existsSync(transcriptFile)) {
            // Seed offset to current size - 2KB
            try {
              const stat = fs.statSync(transcriptFile);
              this.fileOffsets.set(transcriptFile, Math.max(0, stat.size - 2048));
              this.tailTranscriptFile(transcriptFile);
            } catch (e) {
              // ignore
            }
          }
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  private tailTranscriptFile(filePath: string): void {
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) return;

    try {
      const w = fs.watch(parentDir, (event, filename) => {
        if (filename === 'transcript.jsonl') {
          this.readNewTranscriptLines(filePath);
        }
      });
      this.watchers.push(w);
    } catch (e) {
      // watcher error
    }
  }

  private async readNewTranscriptLines(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) return;

    try {
      const stat = fs.statSync(filePath);
      let offset = this.fileOffsets.get(filePath) || 0;

      if (stat.size <= offset) {
        if (stat.size < offset) offset = 0;
        return;
      }

      const bytesToRead = stat.size - offset;
      const buffer = Buffer.alloc(bytesToRead);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, bytesToRead, offset);
      fs.closeSync(fd);

      this.fileOffsets.set(filePath, stat.size);

      const lines = buffer.toString('utf8').split('\n').filter(l => l.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const type = parsed.type || 'UNKNOWN';
          const content = parsed.content || (parsed.thinking ? `[Thinking]: ${parsed.thinking.slice(0, 200)}` : '');

          if (!content || content.length < 5) continue;

          // Extract session id from path
          const match = filePath.match(/\/brain\/([^/]+)\//);
          const sessionId = match ? match[1].slice(0, 8) : 'antigravity_session';

          const event: RawBrainEvent = {
            id: crypto.randomUUID(),
            agentId: 'Antigravity',
            sessionId: `ag_${sessionId}`,
            timestamp: parsed.created_at || new Date().toISOString(),
            payload: `[Antigravity ${type}]: ${content.slice(0, 1500)}`,
            sourcePath: filePath
          };

          if (this.onEvent) {
            await this.onEvent(event);
          }
        } catch (e) {
          // ignore non-json lines
        }
      }
    } catch (e) {
      // file read error
    }
  }

  public stop(): void {
    this.watchers.forEach(w => w.close());
    this.watchers = [];
  }
}
