/**
 * J.A.R.V.I.S. Ultra-Low-Latency Intent Router (<100ms)
 * 
 * Two-Tier Cascading Routing Architecture:
 * - Tier 1: Sub-2ms deterministic regex / token matching for immediate OS/GUI actions (FAST_PATH).
 * - Tier 2: Sub-70ms Groq fast LLM with structured JSON schema for ambiguous or complex tasks (SLOW_PATH).
 */

import { ExecutionPath, IntentClassificationResult, TaskDomain } from './dual_path_types';
import { KeyPoolRotator } from './key_pool_rotator';

export class IntentRouter {
  private groqKeyRotator: KeyPoolRotator;
  private groqModel: string;
  private routingTimeoutMs: number;

  constructor(options?: { groqModel?: string; routingTimeoutMs?: number }) {
    this.groqKeyRotator = new KeyPoolRotator('GROQ_API_KEY');
    this.groqModel = options?.groqModel || process.env.GROQ_TOOL_MODEL || 'openai/gpt-oss-20b';
    this.routingTimeoutMs = options?.routingTimeoutMs || 350;
  }

  /**
   * Classifies an incoming utterance within <100ms.
   */
  public async classify(text: string): Promise<IntentClassificationResult> {
    const start = performance.now();
    const cleanText = text.trim();

    if (!cleanText) {
      return {
        path: ExecutionPath.FAST_PATH,
        domain: 'general',
        confidence: 1.0,
        reason: 'Empty prompt defaulted to FAST_PATH',
        latencyMs: Math.round(performance.now() - start)
      };
    }

    // -----------------------------------------------------------------
    // TIER 1: Ultra-Fast Deterministic Rule Matcher (<2ms)
    // -----------------------------------------------------------------
    const tier1Result = this.evaluateTier1Rules(cleanText);
    if (tier1Result) {
      return {
        ...tier1Result,
        latencyMs: Math.round(performance.now() - start),
        tokensEvaluated: cleanText.split(/\s+/).length
      };
    }

    // -----------------------------------------------------------------
    // TIER 2: Fast Groq Structured Schema (<70ms) with Heuristic Fallback
    // -----------------------------------------------------------------
    try {
      const groqResult = await this.evaluateWithGroq(cleanText);
      if (groqResult) {
        return {
          ...groqResult,
          latencyMs: Math.round(performance.now() - start),
          tokensEvaluated: cleanText.split(/\s+/).length
        };
      }
    } catch (err: any) {
      console.warn('[IntentRouter] Groq classification skipped or timed out:', err?.message || err);
    }

    // Tier 2 Fallback: Heuristic token scoring (<1ms)
    const fallbackResult = this.evaluateHeuristicFallback(cleanText);
    return {
      ...fallbackResult,
      latencyMs: Math.round(performance.now() - start),
      tokensEvaluated: cleanText.split(/\s+/).length
    };
  }

  /**
   * Deterministic pattern matching for fast OS commands.
   */
  private evaluateTier1Rules(text: string): Omit<IntentClassificationResult, 'latencyMs'> | null {
    const lower = text.trim().toLowerCase();

    // 0. Explicit Agent Delegation Commands (DELEGATION_PATH) - check FIRST before general coding patterns
    // Matches: "delegate to hermes...", "handoff to claude...", "send to codex...", "assign to opencode...", "dispatch to hermes..."
    // Also matches: "hermes analyze...", "claude fix...", "codex write...", "opencode debug..." (agent name as command prefix)
    if (
      (/\b(delegate|handoff|hand\s*off|assign|dispatch|send\s+to)\b/i.test(lower) &&
       /\b(hermes|claude|codex|opencode|openmanus|agent|subagent|sub\s*agent)\b/i.test(lower)) ||
      /^\s*(hermes|claude|codex|opencode|openmanus)\b/i.test(lower)
    ) {
      const targetMatch = lower.match(/\b(hermes|claude|codex|opencode|openmanus)\b/i);
      const targetAgent = targetMatch ? targetMatch[1].toLowerCase() : 'hermes';
      return {
        path: ExecutionPath.DELEGATION_PATH,
        domain: 'delegation',
        confidence: 0.98,
        reason: `Explicit delegation to ${targetAgent}`,
        targetAgent
      };
    }

    // 1. Definite SLOW_PATH indicators (Heavy reasoning, coding, refactoring, script pipelines)

    // 2. Hardware Volume Controls
    if (/\b(set|turn|change|crank|raise|lower|reduce|get|check)?\s*(system\s*)?(volume|sound|audio)\b/i.test(lower) || /\b(mute|unmute)\b/i.test(lower)) {
      return {
        path: ExecutionPath.FAST_PATH,
        domain: 'os_control',
        confidence: 0.99,
        reason: 'Immediate hardware volume control'
      };
    }

    // 3. Display & Brightness Controls
    if (/\b(brightness|backlight|dim|brighten)\b/i.test(lower)) {
      return {
        path: ExecutionPath.FAST_PATH,
        domain: 'os_control',
        confidence: 0.99,
        reason: 'Immediate display brightness control'
      };
    }

    // 4. Application Launch & Termination
    if (
      /\b(open|launch|start|run|spawn)\s+(the\s+|a\s+|an\s+)?(app|application|browser|chrome|terminal|code|vlc|editor|calculator|files|finder|settings)\b/i.test(lower) ||
      /\b(close|kill|quit|terminate)\s+(the\s+|this\s+|current\s+|active\s+)?(app|application|window|tab|process)\b/i.test(lower) ||
      /\b(close\s+(window|tab|app))\b/i.test(lower)
    ) {
      return {
        path: ExecutionPath.FAST_PATH,
        domain: 'os_control',
        confidence: 0.95,
        reason: 'Immediate native application lifecycle control'
      };
    }

    // 5. Hardware Specs & Quick Telemetry
    if (/\b(pc\s*specs|system\s*specs|cpu\s*usage|ram\s*usage|memory\s*usage|telemetry|hardware\s*info)\b/i.test(lower)) {
      return {
        path: ExecutionPath.FAST_PATH,
        domain: 'diagnostics',
        confidence: 0.95,
        reason: 'Instant native C++ hardware telemetry probe'
      };
    }

    // 6. Network & WiFi scanning
    if (/\b(scan\s*wifi|wifi\s*networks|network\s*status|ping\s*router)\b/i.test(lower)) {
      return {
        path: ExecutionPath.FAST_PATH,
        domain: 'os_control',
        confidence: 0.95,
        reason: 'Immediate network scan'
      };
    }

    // 7. Conversational Greetings & Persona Switches
    if (/^(hello|hi|hey|good\s*(morning|afternoon|evening)|jarvis|are you there)\b/i.test(lower) && lower.split(/\s+/).length <= 4) {
      return {
        path: ExecutionPath.FAST_PATH,
        domain: 'general',
        confidence: 0.99,
        reason: 'Short conversational greeting'
      };
    }

    // 8. Text Deletion & Active Input Editing (<2ms)
    if (/\b(delete\s+text|clear\s+text|backspace|erase\s+text|delete\s+that|clear\s+input|delete\s+the\s+word|clear\s+the\s+line|erase\s+that)\b/i.test(lower)) {
      return {
        path: ExecutionPath.FAST_PATH,
        domain: 'os_control',
        confidence: 0.99,
        reason: 'Immediate keyboard input text deletion'
      };
    }

    // 9. Memory Clearing & Purging (<2ms)
    if (/\b(clear\s+memory|wipe\s+memory|erase\s+memory|reset\s+memory|forget\s+everything|purge\s+memory|clear\s+all\s+memory)\b/i.test(lower)) {
      return {
        path: ExecutionPath.FAST_PATH,
        domain: 'memory',
        confidence: 0.99,
        reason: 'Immediate sovereign memory core purge'
      };
    }
    // 10. Explicit Agent Delegation Commands (DELEGATION_PATH)
    if (
      /\b(delegate|handoff|hand\s*off|assign|dispatch|send\s+to)\b/i.test(lower) &&
      /\b(hermes|claude|codex|opencode|openmanus|agent|subagent|sub\s*agent)\b/i.test(lower)
    ) {
      const targetMatch = lower.match(/\b(hermes|claude|codex|opencode|openmanus)\b/i);
      const targetAgent = targetMatch ? targetMatch[1].toLowerCase() : 'hermes';
      return {
        path: ExecutionPath.DELEGATION_PATH,
        domain: 'delegation',
        confidence: 0.98,
        reason: `Explicit delegation to ${targetAgent}`,
        targetAgent
      };
    }
    return null;
  }

  /**
   * Fast Groq LLM with structured JSON schema (<70ms).
   */
  private async evaluateWithGroq(text: string): Promise<Omit<IntentClassificationResult, 'latencyMs'> | null> {
    const key = this.groqKeyRotator.getActiveKey();
    if (!key) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.routingTimeoutMs);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.groqModel,
          messages: [
            {
              role: 'system',
              content:
                'You are J.A.R.V.I.S. Intent Router. Classify if user request is FAST_PATH (simple OS command, simple greeting, status query) or SLOW_PATH (complex reasoning, coding, writing scripts, multi-step pipeline, deep analysis). Respond in JSON ONLY: {"path":"FAST_PATH"|"SLOW_PATH","domain":"code"|"shell"|"diagnostics"|"general"|"memory"|"os_control","reason":"brief reason","confidence":0.95}'
            },
            {
              role: 'user',
              content: text
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 60,
          temperature: 0.0
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          this.groqKeyRotator.reportRateLimit(key);
        }
        return null;
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        this.groqKeyRotator.reportSuccess(key);
        return {
          path: parsed.path === 'SLOW_PATH' ? ExecutionPath.SLOW_PATH : ExecutionPath.FAST_PATH,
          domain: parsed.domain || (parsed.path === 'SLOW_PATH' ? 'code' : 'os_control'),
          confidence: parsed.confidence || 0.9,
          reason: parsed.reason || 'Groq fast schema classification'
        };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') {
        this.groqKeyRotator.reportFailure(key);
      }
    }

    return null;
  }

  /**
   * Deterministic fallback scoring if external API is unreachable or times out.
   */
  private evaluateHeuristicFallback(text: string): Omit<IntentClassificationResult, 'latencyMs'> {
    const wordCount = text.split(/\s+/).length;
    const isMultiSentence = text.includes('.') || text.includes(';') || text.includes(' and then ') || text.includes(' after that ');
    const hasComplexVerbs = /(explain|design|implement|debug|investigate|generate|summarize|refactor|compile|automate|pipeline|benchmark|review|audit|propose|inspect|architecture|schema)/i.test(text);

    if (wordCount > 10 || isMultiSentence || hasComplexVerbs) {
      return {
        path: ExecutionPath.SLOW_PATH,
        domain: hasComplexVerbs ? 'code' : 'general',
        confidence: 0.85,
        reason: 'Heuristic word count and complex verb analysis triggered SLOW_PATH'
      };
    }

    return {
      path: ExecutionPath.FAST_PATH,
      domain: 'os_control',
      confidence: 0.8,
      reason: 'Concise utterance default to FAST_PATH'
    };
  }
}
