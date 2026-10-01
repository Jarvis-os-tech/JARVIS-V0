import { GoogleGenAI } from '@google/genai';
import { DistilledSummary } from './types.js';

/**
 * Estimates token count from text using standard ~4 chars per token rule
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

/**
 * Two-Tier Summarization Engine:
 * - Tier 1: Semantic LLM primary (Gemini 2.5 Flash / Groq) with 2500ms timeout
 * - Tier 2: Deterministic Rule-Based Extractive Fallback (0ms latency, 100% offline reliability)
 */
export class DistillationEngine {
  private genAI: GoogleGenAI | null = null;
  private groqApiKey: string | null = null;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        this.genAI = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: { headers: { 'User-Agent': 'jarvis-central-brain' } }
        });
      } catch (e) {
        // Fallback gracefully if initialization fails
        this.genAI = null;
      }
    }
    this.groqApiKey = process.env.GROQ_API_KEY || null;
  }

  /**
   * Distills raw payload into a dense structured summary
   */
  public async distill(agentId: string, payload: string): Promise<DistilledSummary> {
    const rawTokens = estimateTokens(payload);

    // Try Tier 1: Semantic LLM Primary
    try {
      const llmResult = await this.semanticLLMSummarizeWithTimeout(agentId, payload, 2500);
      if (llmResult) {
        const distilledTokens = estimateTokens(llmResult.summary);
        const ratio = rawTokens > 0 ? (rawTokens - distilledTokens) / rawTokens : 0;

        return {
          summary: llmResult.summary,
          keyDecisions: llmResult.keyDecisions,
          artifacts: llmResult.artifacts,
          metrics: {
            rawTokens,
            distilledTokens,
            compressionRatio: Math.max(0, ratio),
            engine: 'semantic_llm'
          }
        };
      }
    } catch (err: any) {
      // LLM call failed or timed out; proceed immediately to Tier 2
    }

    // Tier 2: Deterministic Rule-Based Extractive Fallback (0ms, 100% reliable)
    return this.deterministicFallback(agentId, payload, rawTokens);
  }

  /**
   * Tier 1 implementation with strict timeout
   */
  private async semanticLLMSummarizeWithTimeout(
    agentId: string, 
    payload: string, 
    timeoutMs: number
  ): Promise<{ summary: string; keyDecisions: string[]; artifacts: string[] } | null> {
    const prompt = `You are the Distillation Agent for J.A.R.V.I.S. Central Brain.
Analyze the following activity log/transcript from agent "${agentId}".
Distill it into:
1. A dense, factual summary (maximum 2-3 sentences) capturing core achievements, decisions, and errors. Avoid conversational fluff.
2. A JSON list of key decisions.
3. A JSON list of referenced file paths or URLs.

Raw Activity:
${payload.slice(0, 8000)}

Respond strictly in valid JSON format:
{
  "summary": "...",
  "keyDecisions": ["..."],
  "artifacts": ["..."]
}`;

    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('LLM distillation timeout')), timeoutMs)
    );

    const callPromise = (async () => {
      // 1. Try Gemini
      if (this.genAI) {
        const response = await (this.genAI as any).models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });

        const rawText = response.text || '';
        const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.summary) {
          return {
            summary: parsed.summary,
            keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
            artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : []
          };
        }
      }

      // 2. Try Groq if Gemini was not available
      if (this.groqApiKey) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.groqApiKey}`
          },
          body: JSON.stringify({
            model: process.env.GROQ_TOOL_MODEL || 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
          })
        });

        if (res.ok) {
          const data: any = await res.json();
          const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
          if (parsed.summary) {
            return {
              summary: parsed.summary,
              keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
              artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : []
            };
          }
        }
      }

      return null;
    })();

    return Promise.race([callPromise, timeoutPromise]);
  }

  /**
   * Tier 2 Deterministic Rule-Based Extractive Fallback
   * 0ms latency, zero external dependency, guaranteed token reduction
   */
  public deterministicFallback(agentId: string, payload: string, rawTokens: number): DistilledSummary {
    const lines = payload.split('\n').map(l => l.trim()).filter(Boolean);
    const actionLines: string[] = [];
    const artifacts = new Set<string>();
    const decisions: string[] = [];

    // Regex matchers for files, paths, and URLs
    const pathRegex = /(?:(?:\/[\w.-]+)+|(?:[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)|(?:[a-zA-Z0-9_.-]+\.(?:ts|tsx|js|jsx|json|md|py|sh|html|css|yaml|yml)))/g;
    const urlRegex = /(https?:\/\/[^\s)]+)/g;
    const actionRegex = /^(?:created|built|modified|updated|deleted|fixed|implemented|executed|refactored|installed|verified|designed|added|resolved|failed|tested)/i;

    for (const line of lines) {
      // Extract file paths
      const paths = line.match(pathRegex);
      if (paths) {
        paths.forEach(p => {
          if (!p.startsWith('//') && p.length > 3 && !p.startsWith('http')) {
            artifacts.add(p);
          }
        });
      }

      // Extract URLs
      const urls = line.match(urlRegex);
      if (urls) {
        urls.forEach(u => artifacts.add(u));
      }

      // Identify action or decision statements
      if (actionRegex.test(line) || line.includes('=>') || line.includes('Decision:') || line.includes('Milestone:')) {
        actionLines.push(line.replace(/^[-*#\s]+/, ''));
      }
    }

    let summaryText = '';
    if (actionLines.length > 0) {
      summaryText = actionLines.slice(0, 3).join('. ') + '.';
    } else if (lines.length > 0) {
      // Fallback to concise truncation of leading lines
      summaryText = lines.slice(0, 2).join(' ').slice(0, 240);
      if (!summaryText.endsWith('.')) summaryText += '...';
    } else {
      summaryText = `Activity recorded from ${agentId}.`;
    }

    // Strip unprintable control characters and normalize whitespace
    summaryText = summaryText.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim();
    if (summaryText.length < 5 || /^[^\w\s]+$/.test(summaryText)) {
      summaryText = `${agentId} completed task execution and logged session activity.`;
    }

    if (artifacts.size > 0) {
      decisions.push(`Identified ${artifacts.size} target resources/artifacts.`);
    }

    const distilledTokens = estimateTokens(summaryText);
    const ratio = rawTokens > 0 ? (rawTokens - distilledTokens) / rawTokens : 0;

    return {
      summary: summaryText,
      keyDecisions: decisions,
      artifacts: Array.from(artifacts).slice(0, 8),
      metrics: {
        rawTokens,
        distilledTokens,
        compressionRatio: Math.max(0, ratio),
        engine: 'deterministic_fallback'
      }
    };
  }
}

export const defaultDistiller = new DistillationEngine();
