import { HermesAdapter } from './hermes_adapter.js';
import { ClaudeAdapter } from './claude_adapter.js';
import { AntigravityAdapter } from './antigravity_adapter.js';
import { CodexAdapter } from './codex_adapter.js';
import { RawBrainEvent } from '../core/types.js';
import { brainGraph } from '../core/brain_graph.js';
import { discoverAgentRuntimes } from '../core/agent_discovery.js';

export type EventBroadcastCallback = (type: string, data: any) => void;

export class AdapterManager {
  private hermes = new HermesAdapter();
  private claude = new ClaudeAdapter();
  private antigravity = new AntigravityAdapter();
  private codex = new CodexAdapter();
  private broadcaster: EventBroadcastCallback | null = null;

  public setBroadcaster(cb: EventBroadcastCallback) {
    this.broadcaster = cb;
  }

  public async startAll(): Promise<void> {
    // 1. Initial agent runtime discovery
    const agents = discoverAgentRuntimes();
    if (this.broadcaster) {
      this.broadcaster('AGENTS_DISCOVERED', agents);
    }

    // 2. Start adapters with shared ingestion handler
    const handler = async (event: RawBrainEvent) => {
      await this.ingestEvent(event);
    };

    this.hermes.start(handler);
    this.claude.start(handler);
    this.antigravity.start(handler);
    this.codex.start(handler);
  }

  public async ingestEvent(rawEvent: RawBrainEvent): Promise<any> {
    if (this.broadcaster) {
      this.broadcaster('EVENT_INGESTED', {
        agentId: rawEvent.agentId,
        sessionId: rawEvent.sessionId,
        timestamp: rawEvent.timestamp,
        preview: rawEvent.payload.slice(0, 140)
      });
    }

    try {
      const result = await brainGraph.invoke({
        rawEvent,
        auditPassed: false,
        circuitBreakerOpen: false,
        errors: []
      });

      if (this.broadcaster && result.distilledSummary) {
        this.broadcaster('EVENT_DISTILLED', {
          agentId: rawEvent.agentId,
          sessionId: rawEvent.sessionId,
          summary: result.distilledSummary.summary,
          metrics: result.distilledSummary.metrics
        });
      }

      return result;
    } catch (err: any) {
      return { error: err.message };
    }
  }

  public stopAll(): void {
    this.hermes.stop();
    this.claude.stop();
    this.antigravity.stop();
    this.codex.stop();
  }
}

export const adapterManager = new AdapterManager();
