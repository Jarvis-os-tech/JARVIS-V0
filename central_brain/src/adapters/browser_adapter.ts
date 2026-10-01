import crypto from 'crypto';
import { RawBrainEvent } from '../core/types.js';

export interface BrowserIngestPayload {
  url?: string;
  title?: string;
  selectedText?: string;
  rawSessionText?: string;
  toolName?: string;
}

/**
 * Browser Ingestion Adapter
 * Normalizes browser research, ChatGPT/Claude web conversations, and Colab runs
 */
export function normalizeBrowserPayload(body: BrowserIngestPayload): RawBrainEvent {
  const url = body.url || 'browser://tab';
  const title = body.title || 'Untitled Web Tab';
  const content = (body.selectedText || body.rawSessionText || '').trim();
  const toolName = body.toolName || 'Browser';

  const sessionHash = crypto.createHash('md5').update(url).digest('hex').slice(0, 10);

  return {
    id: crypto.randomUUID(),
    agentId: 'Browser',
    sessionId: `web_${sessionHash}`,
    timestamp: new Date().toISOString(),
    payload: `[Browser Tab: ${title}] URL: ${url}\nTool: ${toolName}\nContent: ${content}`,
    sourcePath: url,
    metadata: {
      url,
      title,
      toolName
    }
  };
}
