/**
 * J.A.R.V.I.S. Web Agent Bridge
 * 
 * Connects J.A.R.V.I.S. to Web-domain agents:
 * - OpenManus A2A Agent Server (http://127.0.0.1:10000)
 * - Chrome DevTools & Web automation agents
 */

import { AgentCard } from './a2a_types';

export class WebAgentBridge {
  private openManusUrl: string;

  constructor() {
    this.openManusUrl = process.env.OPENMANUS_A2A_URL || 'http://127.0.0.1:10000';
  }

  /**
   * Health probe to check if OpenManus A2A server is running.
   */
  public async probeOpenManus(): Promise<{ isOnline: boolean; card?: AgentCard }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.openManusUrl}/.well-known/agent.json`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const card: any = await res.json();
        return {
          isOnline: true,
          card: {
            name: card.name || 'Manus Agent',
            description: card.description || 'Autonomous Web and Multi-Step Planning Agent',
            url: this.openManusUrl,
            version: card.version || '1.0.0',
            domain: 'web',
            defaultInputModes: card.defaultInputModes || ['text', 'text/plain'],
            defaultOutputModes: card.defaultOutputModes || ['text', 'text/plain'],
            capabilities: card.capabilities || { streaming: false, pushNotifications: true },
            skills: card.skills || [],
            status: 'active',
            lastSeen: Date.now()
          }
        };
      }
    } catch (_) {
      // OpenManus server not active at this moment
    }

    return { isOnline: false };
  }

  /**
   * Dispatches a task to OpenManus via A2A HTTP endpoint.
   */
  public async dispatchA2ATask(prompt: string, sessionId?: string): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      const res = await fetch(`${this.openManusUrl}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          sessionId: sessionId || `jarvis-web-${Date.now()}`
        })
      });

      if (res.ok) {
        const data: any = await res.json();
        return {
          success: true,
          result: typeof data === 'string' ? data : data.message || JSON.stringify(data)
        };
      } else {
        return {
          success: false,
          error: `OpenManus returned HTTP ${res.status}: ${res.statusText}`
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: `Could not reach OpenManus A2A server: ${err.message}`
      };
    }
  }

  public getAgentCards(): AgentCard[] {
    return [
      {
        name: 'OpenManus Web Agent',
        description: 'Autonomous multi-step task planning and web automation agent (A2A-enabled).',
        url: `${this.openManusUrl}/`,
        version: '1.0.0',
        domain: 'web',
        defaultInputModes: ['text', 'text/plain'],
        defaultOutputModes: ['text', 'text/plain'],
        capabilities: {
          streaming: false,
          pushNotifications: true,
          statePersistence: true
        },
        skills: [
          {
            id: 'web_browser_use',
            name: 'Autonomous Web Surfing',
            description: 'Inspects DOM, extracts web content, and drives browser-use sessions.'
          }
        ],
        status: 'active',
        lastSeen: Date.now()
      }
    ];
  }
}

export const webAgentBridge = new WebAgentBridge();
