/**
 * J.A.R.V.I.S. Memory Bridge TypeScript Wrapper
 * Wraps the Python memory_bridge.py for type-safe usage
 */

import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORY_BRIDGE_SCRIPT = [
  path.resolve(__dirname, '../../../memory_bridge.py'),
  path.resolve(__dirname, '../../memory_bridge.py'),
  path.resolve(__dirname, '../../../JARVIS-V1/memory_bridge.py'),
  path.resolve(__dirname, '../../JARVIS-V1/memory_bridge.py')
].find(p => fs.existsSync(p)) || path.resolve(__dirname, '../../memory_bridge.py');

export interface MemoryBridgeResult {
  success?: boolean;
  context?: string;
  facts?: MemoryFact[];
  turns?: MemoryTurn[];
  triad?: MemoryTriad;
  extracted_facts?: ExtractedFact[];
  error?: string;
  [key: string]: unknown;
}

export interface MemoryFact {
  id?: number;
  category: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface MemoryTurn {
  id?: number;
  speaker: string;
  text: string;
  role: string;
  timestamp: string;
  other_speaker?: string;
  other_text?: string;
}

export interface MemoryTriad {
  personal_data?: MemoryFact[];
  preferences?: MemoryFact[];
  instructions?: MemoryFact[];
  memory_buffer?: MemoryFact[];
}

export interface ExtractedFact {
  type: string;
  key: string;
  value: string;
  category: string;
  confidence: number;
}

export function runMemoryBridge(args: string[]): Promise<MemoryBridgeResult> {
  return new Promise((resolve) => {
    execFile('python3', [MEMORY_BRIDGE_SCRIPT, ...args], { 
      timeout: 15000, 
      env: process.env 
    }, (err, stdout) => {
      if (err) {
        console.error('[MemoryBridge] Execution error:', err);
        resolve({ success: false, error: err.message });
        return;
      }
      try {
        const result = JSON.parse(stdout || '{}');
        resolve(result);
      } catch (parseErr) {
        console.error('[MemoryBridge] Parse error:', parseErr, 'stdout:', stdout);
        resolve({ success: false, error: 'Invalid JSON response' });
      }
    });
  });
}

export async function getMemoryContext(agentId: string = 'jarvis-prime'): Promise<MemoryBridgeResult> {
  return runMemoryBridge(['context', agentId]);
}

export async function getMemoryStatus(): Promise<MemoryBridgeResult> {
  return runMemoryBridge(['status']);
}

export async function getTriadMemory(): Promise<MemoryBridgeResult> {
  return runMemoryBridge(['get_triad']);
}

export async function addTriadMemory(category: string, content: string): Promise<MemoryBridgeResult> {
  return runMemoryBridge(['add_triad', category, content]);
}

export async function removeTriadMemory(category: string, content: string): Promise<MemoryBridgeResult> {
  return runMemoryBridge(['remove_triad', category, content]);
}

export async function rewriteTriadMemory(category: string, oldContent: string, newContent: string): Promise<MemoryBridgeResult> {
  return runMemoryBridge(['rewrite_triad', category, oldContent, newContent]);
}

export async function clearMemory(category: string = 'all', scope: string = 'all'): Promise<MemoryBridgeResult> {
  return runMemoryBridge(['clear_memory', category, scope]);
}

export async function searchMemory(query: string, limit: number = 10): Promise<MemoryBridgeResult> {
  return runMemoryBridge(['search', query, String(limit)]);
}

export async function logConversationTurn(data: {
  speaker: string;
  text: string;
  role: string;
  other_speaker?: string;
  other_text?: string;
}): Promise<MemoryBridgeResult> {
  return runMemoryBridge(['log_turn', JSON.stringify(data)]);
}

export async function saveMemoryFact(key: string, value: string, category: string = 'custom'): Promise<MemoryBridgeResult> {
  return runMemoryBridge(['save_fact', key, value, category]);
}