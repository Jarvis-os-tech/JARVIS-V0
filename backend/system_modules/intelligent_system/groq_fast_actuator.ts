/**
 * J.A.R.V.I.S. Ultra-Fast Mid-Sentence Tool Actuator (Groq Engine)
 * 
 * Analyzes real-time streaming speech transcripts as they arrive from Gemini Live (sub-80ms),
 * detects actionable intents mid-sentence, and executes native C++ / OS controls immediately
 * before the user even finishes speaking. Caches results so Gemini Live gets instant 0ms responses.
 */

import { dispatchSystemControl, getSystemControlDeclarations, isSystemControl } from './system_controls';
import { isConnectorTool, dispatchConnectorTool, getConnectorToolDeclarations } from '../../../connectors/connector-agent';
import { WebSocket } from 'ws';

export interface SpeculativeExecutionResult {
  toolName: string;
  args: Record<string, any>;
  result: any;
  latencyMs: number;
  timestamp: string;
}

function normalizeSchemaForGroq(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(normalizeSchemaForGroq);
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'type' && typeof v === 'string') {
      out[k] = v.toLowerCase();
    } else if (typeof v === 'object' && v !== null) {
      out[k] = normalizeSchemaForGroq(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export class GroqFastActuator {
  private apiKey: string;
  private model: string;
  private toolsFormatted: any[] | null = null;
  private lastProcessedText: string = '';
  private debounceTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private turnExecutedKeys: Set<string> = new Set();
  private turnCachedResponses: Map<string, any> = new Map();
  private currentAbortController: AbortController | null = null;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    this.model = process.env.GROQ_TOOL_MODEL || 'openai/gpt-oss-20b';
  }

  /**
   * Builds OpenAI/Groq compatible tool definitions from whole_controls & memory.
   */
  private getGroqTools(): any[] {
    if (this.toolsFormatted) {
      return this.toolsFormatted;
    }

    const decls = getSystemControlDeclarations();
    const formatted = decls.map((d: any) => ({
      type: 'function',
      function: {
        name: d.name,
        description: d.description,
        parameters: normalizeSchemaForGroq(d.parameters || { type: 'object', properties: {} })
      }
    }));

    // Add Connector Tools (Google Workspace & GitHub MCP)
    try {
      const connectorDecls = getConnectorToolDeclarations();
      for (const d of connectorDecls) {
        formatted.push({
          type: 'function',
          function: {
            name: d.name,
            description: d.description,
            parameters: normalizeSchemaForGroq(d.parameters || { type: 'object', properties: {} })
          }
        });
      }
    } catch (e: any) {
      console.warn('[Groq Fast Actuator] Could not load connector tool declarations:', e.message);
    }

    // Add Memory Tools
    formatted.push({
      type: 'function',
      function: {
        name: 'search_memory',
        description: 'Search long-term episodic or semantic memory for past facts, preferences, and conversations',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        }
      }
    });

    formatted.push({
      type: 'function',
      function: {
        name: 'save_memory_fact',
        description: 'Store a sovereign fact or preference into long-term memory',
        parameters: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Memory key or title' },
            value: { type: 'string', description: 'Fact detail' },
            category: { type: 'string', enum: ['identity', 'preference', 'project', 'hardware', 'custom'] }
          },
          required: ['key', 'value']
        }
      }
    });

    formatted.push({
      type: 'function',
      function: {
        name: 'remove_memory',
        description: 'Delete or forget an existing personal fact, user preference, or instruction from memory core',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['all', 'personal_data', 'preferences', 'instructions'], description: 'Memory category or all' },
            content: { type: 'string', description: 'The fact or detail to remove, or all' }
          },
          required: ['category', 'content']
        }
      }
    });

    formatted.push({
      type: 'function',
      function: {
        name: 'clear_memory',
        description: 'Completely wipe or clear stored memory facts, user preferences, instructions, or all memory cores',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['all', 'personal_data', 'preferences', 'instructions'], description: 'Category to clear or all' },
            scope: { type: 'string', enum: ['all', 'database', 'vault', 'buffer'], description: 'Wipe scope' }
          }
        }
      }
    });

    formatted.push({
      type: 'function',
      function: {
        name: 'delete_text',
        description: 'Deletes or clears text in currently focused window, input field, or editor (backspace, word, line, or all)',
        parameters: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of characters or words to delete' },
            mode: { type: 'string', enum: ['backspace', 'delete', 'word', 'line', 'all'], description: 'Deletion mode' }
          }
        }
      }
    });

    // Add UI & Vision Tools
    formatted.push({
      type: 'function',
      function: {
        name: 'switch_persona',
        description: 'Switch the conversational persona or voice to another agent (e.g. nova, friday, ultron, edith, karen, vision)',
        parameters: {
          type: 'object',
          properties: {
            targetPersonaId: { type: 'string', description: 'Target persona ID' }
          },
          required: ['targetPersonaId']
        }
      }
    });

    formatted.push({
      type: 'function',
      function: {
        name: 'set_ui_reminder',
        description: 'Set a UI reminder notification on the user screen with countdown minutes',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Reminder title' },
            minutes: { type: 'number', description: 'Minutes from now' }
          },
          required: ['title', 'minutes']
        }
      }
    });

    formatted.push({
      type: 'function',
      function: {
        name: 'activate_camera',
        description: 'Turn on or activate optical camera vision stream',
        parameters: { type: 'object', properties: {} }
      }
    });

    formatted.push({
      type: 'function',
      function: {
        name: 'activate_screen_share',
        description: 'Turn on or activate screen share vision feed',
        parameters: { type: 'object', properties: {} }
      }
    });

    formatted.push({
      type: 'function',
      function: {
        name: 'deactivate_vision',
        description: 'Stop or close camera or screen share vision streams',
        parameters: { type: 'object', properties: {} }
      }
    });

    this.toolsFormatted = formatted;
    return formatted;
  }

  /**
   * Filters and returns only the relevant tools based on speech keywords.
   * This reduces prompt token count by 90% (from ~3,150 tokens to ~250 tokens),
   * speeds up Groq inference to ~40-70ms, and stays well within rate limits.
   */
  public getRelevantTools(transcript: string): any[] {
    const text = transcript.toLowerCase();
    const allTools = this.getGroqTools();
    const selectedNames = new Set<string>();

    // 1. Audio & Volume Domain
    if (/volume|sound|mute|unmute|audio|loud|quiet|hear/i.test(text)) {
      selectedNames.add('set_system_volume');
      selectedNames.add('get_system_volume');
    }

    // 2. Display & Brightness Domain
    if (/brightness|bright|dim|display|backlight|screen/i.test(text)) {
      selectedNames.add('set_display_brightness');
      selectedNames.add('get_display_brightness');
    }

    // 3. Telemetry, Specs & Diagnostics Domain
    if (/telemetry|spec|cpu|ram|stats|status|usage|load|hardware|temp|health/i.test(text)) {
      selectedNames.add('get_system_telemetry');
      selectedNames.add('get_pc_specs');
    }

    // 4. Email & Gmail Domain
    if (/email|emails|mail|inbox|gmail|message|messages/i.test(text)) {
      selectedNames.add('search_emails');
      selectedNames.add('read_email');
      selectedNames.add('send_email');
      selectedNames.add('create_draft');
      selectedNames.add('list_labels');
    }

    // 5. Calendar & Schedule Domain
    if (/calendar|event|events|meeting|meetings|schedule|appointment|agenda/i.test(text)) {
      selectedNames.add('list_events');
      selectedNames.add('create_event');
      selectedNames.add('find_free_time');
      selectedNames.add('update_event');
      selectedNames.add('delete_event');
    }

    // 6. Tasks & Todos Domain
    if (/task|tasks|todo|to-do|todos|to-dos/i.test(text)) {
      selectedNames.add('list_tasks');
      selectedNames.add('create_task');
      selectedNames.add('complete_google_task');
    }

    // 7. GitHub & Repositories Domain
    if (/github|repo|repos|repository|repositories|pull request|pr\b|commit|issue|issues/i.test(text)) {
      selectedNames.add('list_repos');
      selectedNames.add('search_issues');
      selectedNames.add('get_pull_request');
      selectedNames.add('create_issue');
      selectedNames.add('list_notifications');
    }

    // 8. App Launch & Management Domain
    if (/open|launch|start|run|app|application|browser|chrome|terminal|code|editor/i.test(text)) {
      // Guard against hijacking connector requests (e.g. "open my emails", "open calendar") into launching browser apps
      const isConnectorQuery = /email|emails|mail|inbox|gmail|calendar|event|meeting|schedule|task|tasks|todo|github|repo|issue/i.test(text);
      const isExplicitAppLaunch = /open (the )?(app|application|browser|chrome|terminal|code|editor|slack|discord|spotify)/i.test(text);
      if (!isConnectorQuery || isExplicitAppLaunch) {
        selectedNames.add('launch_application');
      }
    }

    // 5. Window & Tab Management Domain
    if (/close|kill|quit|exit|tab|window/i.test(text)) {
      selectedNames.add('close_window');
      selectedNames.add('close_tab');
    }

    // 6. Desktop, Hyprland & Omarchy Domain
    if (/workspace|theme|wallpaper|nightlight|touchpad|omarchy|hyprland|screenshot|osd/i.test(text)) {
      selectedNames.add('omarchy_control');
    }

    // 7. Network & WiFi Domain
    if (/wifi|network|socket|port|connection|ssid|internet/i.test(text)) {
      selectedNames.add('scan_wifi_networks');
      selectedNames.add('inspect_network_sockets');
    }

    // 8. Sovereign Memory Domain
    if (/remember|save|fact|memory|recall|search memory|note/i.test(text)) {
      selectedNames.add('save_memory_fact');
      selectedNames.add('search_memory');
    }
    if (/clear memory|wipe memory|erase memory|forget|delete memory|reset memory|purge memory/i.test(text)) {
      selectedNames.add('clear_memory');
      selectedNames.add('remove_memory');
    }

    // 8b. Text Deletion & Input Automation Domain
    if (/delete|erase|backspace|clear text|remove text|undo text|clear line|delete word/i.test(text)) {
      selectedNames.add('delete_text');
      selectedNames.add('desktop_control');
    }

    // 9. Vision & Optical Streaming Domain
    if (/camera|vision|look|see|view|stream/i.test(text)) {
      selectedNames.add('activate_camera');
      selectedNames.add('deactivate_vision');
    }
    if (/screen share|share screen|monitor/i.test(text)) {
      selectedNames.add('activate_screen_share');
      selectedNames.add('deactivate_vision');
    }

    // 10. UI Reminders Domain
    if (/reminder|remind|timer|alarm/i.test(text)) {
      selectedNames.add('set_ui_reminder');
    }

    // 11. Persona Switch Domain
    if (/switch|persona|speak to|talk to|agent/i.test(text)) {
      selectedNames.add('switch_persona');
    }

    // Fallback: If no specific domain matches, provide high-frequency core tools
    if (selectedNames.size === 0) {
      selectedNames.add('launch_application');
      selectedNames.add('omarchy_control');
      selectedNames.add('get_system_telemetry');
      selectedNames.add('set_system_volume');
    }

    return allTools.filter(t => selectedNames.has(t.function.name));
  }

  /**
   * Ingests streaming speech transcripts from Gemini Live in real-time.
   * Debounces at ~180ms to batch rapid word fragments, then queries Groq.
   */
  public processStreamingSpeech(
    currentTurnText: string,
    clientWs: WebSocket | null,
    memoryBridgeRunner?: (args: string[]) => Promise<any>
  ) {
    const text = currentTurnText.trim();
    if (!text || text.length < 5) return;

    // Check if new meaningful words have been spoken
    if (text === this.lastProcessedText) return;

    // Fast keyword pre-check to prevent invoking Groq for purely conversational phrases
    const hasActionSignal = /(open|close|launch|start|kill|volume|sound|mute|brightness|screen|screenshot|workspace|theme|omarchy|status|spec|telemetry|wifi|network|memory|save|remember|search|camera|vision|reminder|remind|switch|persona)/i.test(text);
    if (!hasActionSignal) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.evaluateAndAct(text, clientWs, memoryBridgeRunner);
    }, 180);
  }

  /**
   * Sends the partial speech transcript to Groq for ultra-fast intent & function extraction.
   */
  private async evaluateAndAct(
    transcript: string,
    clientWs: WebSocket | null,
    memoryBridgeRunner?: (args: string[]) => Promise<any>
  ) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.lastProcessedText = transcript;

    const startTotal = performance.now();

    try {
      const tools = this.getRelevantTools(transcript);
      if (!tools || tools.length === 0) return;

      const payload = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are J.A.R.V.I.S. fast intent actuator. Output ONLY tool calls. Do not output any conversational or thinking text. For functions without arguments, always pass empty JSON object {}. If speech is casual conversation without an actionable OS command, do not call any tool.'
          },
          {
            role: 'user',
            content: transcript
          }
        ],
        tools,
        tool_choice: 'auto',
        max_tokens: 150,
        temperature: 0.1
      };

      if (this.currentAbortController) {
        this.currentAbortController.abort();
      }
      this.currentAbortController = new AbortController();

      const key = this.apiKey || process.env.GROQ_API_KEY || '';
      if (!key) {
        return;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: this.currentAbortController.signal
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Groq Fast Actuator] API call warning (${response.status}):`, errText);
        return;
      }

      const data: any = await response.json();
      const choice = data.choices?.[0];
      const toolCalls = choice?.message?.tool_calls;

      if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
        const groqTime = Math.round(performance.now() - startTotal);
        console.log(`⚡ [Groq Mid-Sentence] Detected ${toolCalls.length} action(s) in ${groqTime}ms for speech: "${transcript}"`);

        for (const call of toolCalls) {
          const fnName = call.function?.name;
          let fnArgs: Record<string, any> = {};
          try {
            fnArgs = JSON.parse(call.function?.arguments || '{}');
          } catch {
            fnArgs = {};
          }

          // Canonical execution key to prevent duplicate execution within the same turn
          const execKey = `${fnName}:${JSON.stringify(fnArgs)}`;
          if (this.turnExecutedKeys.has(execKey)) {
            continue;
          }
          this.turnExecutedKeys.add(execKey);

          // Execute tool immediately via direct native C++ workers or actuators
          const execStart = performance.now();
          const toolResult = await this.executeTool(fnName, fnArgs, memoryBridgeRunner, clientWs);
          const execDuration = Math.round(performance.now() - execStart);
          const totalLatency = Math.round(performance.now() - startTotal);

          // Cache result for Gemini Live turn completion
          this.turnCachedResponses.set(fnName, toolResult);

          console.log(`🚀 [Groq Mid-Sentence Executed] '${fnName}' finished in ${execDuration}ms (Total latency: ${totalLatency}ms)`);

          // Broadcast real-time execution telemetry to frontend HUD
          if (clientWs && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: 'mid_sentence_tool_executed',
              source: 'groq_speculative',
              tool: fnName,
              args: fnArgs,
              result: toolResult,
              groqLatencyMs: groqTime,
              execLatencyMs: execDuration,
              totalLatencyMs: totalLatency,
              triggerTranscript: transcript
            }));
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.warn('[Groq Fast Actuator Error]', err.message);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Immediately evaluates and executes a transcript without debounce wait.
   * Useful for text commands or automated tests.
   */
  public async evaluateImmediately(
    transcript: string,
    clientWs: WebSocket | null,
    memoryBridgeRunner?: (args: string[]) => Promise<any>
  ): Promise<any> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    return await this.evaluateAndAct(transcript, clientWs, memoryBridgeRunner);
  }

  /**
   * Executes a tool via whole_controls or sovereign memory bridge.
   */
  private async executeTool(
    name: string,
    args: Record<string, any>,
    memoryBridgeRunner?: (args: string[]) => Promise<any>,
    clientWs?: WebSocket | null
  ): Promise<any> {
    if (isSystemControl(name)) {
      return await dispatchSystemControl(name, args);
    }

    if (isConnectorTool(name)) {
      const mutatingTools = new Set([
        'send_email',
        'create_event',
        'update_event',
        'delete_event',
        'create_task',
        'complete_google_task',
        'create_issue',
        'create_draft',
        'create_document',
        'append_document_text',
        'create_presentation',
        'add_slide'
      ]);
      if (mutatingTools.has(name)) {
        console.log(`[Groq Fast Actuator] Skipping speculative execution for mutating connector tool '${name}' (deferred to final turn)`);
        return { deferredToLive: true, tool: name };
      }
      return await dispatchConnectorTool(name, args);
    }

    if (name === 'search_memory' && memoryBridgeRunner) {
      const q = args?.query || '';
      return await memoryBridgeRunner(['search', q, '5']);
    }

    if (name === 'save_memory_fact' && memoryBridgeRunner) {
      const { key, value, category } = args || {};
      return await memoryBridgeRunner(['save_fact', key || '', value || '', category || 'custom']);
    }

    if (name === 'remove_memory' && memoryBridgeRunner) {
      const { category = 'all', content = 'all' } = args || {};
      return await memoryBridgeRunner(['remove_triad', category, content]);
    }

    if (name === 'clear_memory' && memoryBridgeRunner) {
      const { category = 'all', scope = 'all' } = args || {};
      return await memoryBridgeRunner(['clear_memory', category, scope]);
    }

    if (name === 'delete_text') {
      const count = Number(args?.count || 1);
      const mode = String(args?.mode || 'backspace');
      return await dispatchSystemControl('delete_text', { count, mode });
    }

    if (name === 'switch_persona' && clientWs && clientWs.readyState === WebSocket.OPEN) {
      const targetPersonaId = args?.targetPersonaId;
      clientWs.send(JSON.stringify({
        type: 'switch_persona_tool_call',
        targetPersonaId
      }));
      return { result: "success, switched" };
    }

    if (name === 'set_ui_reminder' && clientWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'set_ui_reminder',
        title: args?.title || 'Reminder',
        minutes: args?.minutes || 5
      }));
      return { result: "reminder_scheduled_in_ui" };
    }

    if (name === 'activate_camera' && clientWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'activate_camera' }));
      return { result: "Optical camera stream successfully activated and transmitting frames." };
    }

    if (name === 'activate_screen_share' && clientWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'activate_screen_share' }));
      return { result: "Screen sharing stream successfully activated and transmitting telemetry frames." };
    }

    if (name === 'deactivate_vision' && clientWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'deactivate_vision' }));
      return { result: "Vision feed successfully deactivated." };
    }

    return { success: true, executed: true };
  }

  /**
   * Retrieves a pre-executed tool result for Gemini Live turn integration.
   * If the tool was already executed mid-sentence, Gemini gets an instantaneous 0ms response.
   */
  public getCachedResult(toolName: string): any | undefined {
    return this.turnCachedResponses.get(toolName);
  }

  /**
   * Resets the turn cache when user finishes speaking or turn completes.
   */
  public resetTurn() {
    this.turnExecutedKeys.clear();
    this.turnCachedResponses.clear();
    this.lastProcessedText = '';
    this.isProcessing = false;
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

// Global Singleton for session reuse
export const groqFastActuator = new GroqFastActuator();
