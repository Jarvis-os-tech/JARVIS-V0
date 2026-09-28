import express from 'express';
import http from 'http';
import path from 'path';
import { exec, execFile } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { getSystemControlDeclarations, dispatchSystemControl, isSystemControl } from './system_modules/intelligent_system/system_controls';
import connectorRoutes from '../connectors/connector-routes';
import { isConnectorTool, dispatchConnectorTool, getConnectorToolDeclarations } from '../connectors/connector-agent';

const OPERATOR_NAME = process.env.OPERATOR_NAME || (process.env.USER ? `Operator ${process.env.USER}` : 'Operator');

const MEMORY_BRIDGE_SCRIPT = [
  path.resolve(__dirname, 'memory_bridge.py'),
  path.resolve(__dirname, '../backend/memory_bridge.py'),
  path.resolve(process.cwd(), 'backend/memory_bridge.py')
].find(p => fs.existsSync(p)) || path.resolve(__dirname, 'memory_bridge.py');

function runMemoryBridge(args: string[]): Promise<any> {
  return new Promise((resolve) => {
    execFile('python3', [MEMORY_BRIDGE_SCRIPT, ...args], { timeout: 15000, env: process.env }, (err, stdout) => {
      if (err) {
        console.warn('[Memory Bridge Warning]', err.message);
        return resolve({ error: err.message });
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (parseErr) {
        resolve({ error: 'Failed to parse memory output' });
      }
    });
  });
}

const PORT = Number(process.env.PORT) || 3000;

function autoLaunchBrowser(url: string) {
  if (process.env.AUTO_LAUNCH === 'false' || process.env.CI === 'true') {
    return;
  }

  const platform = process.platform;
  let command = '';

  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`[AutoLaunch] Notice: Could not automatically open browser (${error.message}). Please navigate to ${url}`);
    } else {
      console.log(`[AutoLaunch] Launched browser at ${url}`);
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const server = http.createServer(app);

  const getAi = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment');
    }
    return new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  };

  // Health check API with API key diagnostic information
  app.get('/api/health', (req, res) => {
    const key = process.env.GEMINI_API_KEY || '';
    const isConfigured = !!key && key !== 'MY_GEMINI_API_KEY';

    res.json({
      status: 'ok',
      hasApiKey: isConfigured,
      timestamp: new Date().toISOString()
    });
  });

  // Sovereign Memory REST Endpoints
  app.get('/api/memory/status', async (_req, res) => {
    const data = await runMemoryBridge(['status']);
    res.json(data);
  });

  app.get('/api/memory/context', async (req, res) => {
    const agentId = (req.query.agentId as string) || 'jarvis-prime';
    const data = await runMemoryBridge(['context', agentId]);
    res.json(data);
  });

  app.get('/api/memory/turns', async (req, res) => {
    const limit = (req.query.limit as string) || '25';
    const data = await runMemoryBridge(['turns', limit]);
    res.json(data);
  });

  app.post('/api/memory/log', async (req, res) => {
    const data = await runMemoryBridge(['log_turn', JSON.stringify(req.body)]);
    res.json(data);
  });

  app.post('/api/memory/search', async (req, res) => {
    const query = req.body.query || '';
    const limit = String(req.body.limit || 10);
    const data = await runMemoryBridge(['search', query, limit]);
    res.json(data);
  });

  app.post('/api/memory/fact', async (req, res) => {
    const { key, value, category } = req.body;
    const data = await runMemoryBridge(['save_fact', key || '', value || '', category || 'custom']);
    res.json(data);
  });

  // Mount Connectors API (Google Workspace & GitHub MCP backed by Python)
  app.use(connectorRoutes);

  // Helper for resilient text generation with fallback models and retry logic
  async function generateWithFallback(ai: GoogleGenAI, config: {
    contents: any;
    systemInstruction?: string;
    tools?: any[];
  }) {
    // Valid models according to gemini_api skill
    const candidateModels = [
      'gemini-8-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview'
    ];
    let lastError: any = null;

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: config.contents,
            config: {
              systemInstruction: config.systemInstruction,
              tools: config.tools
            }
          });
          if (response && (response.text || response.candidates?.length)) {
            return response;
          }
        } catch (err: any) {
          lastError = err;
          const isRateOrDemand = err.status === 503 || err.status === 429 || 
            err.message?.includes('high demand') || 
            err.message?.includes('UNAVAILABLE') || 
            err.message?.includes('503') ||
            err.message?.includes('429');

          console.warn(`[Gemini API] Error on model ${model} (attempt ${attempt}):`, err?.message || err);
          if (isRateOrDemand) {
            // Jittered backoff before retry or switching model
            const jitter = Math.floor(Math.random() * 300);
            await new Promise(r => setTimeout(r, (500 * attempt) + jitter));
          } else {
            // Non-demand error (e.g. invalid tool or model parameter), move immediately to next model
            break;
          }
        }
      }
    }

    // If tools (like googleSearch) were passed and failed on all models due to grounding availability,
    // attempt a pure reasoning fallback without tools so the user still gets high-quality assistance
    if (config.tools && config.tools.length > 0) {
      try {
        console.log('[Gemini API] Attempting tool-less fallback generation for query...');
        for (const model of ['gemini-8-flash', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite']) {
          try {
            const fallbackResponse = await ai.models.generateContent({
              model,
              contents: config.contents,
              config: {
                systemInstruction: config.systemInstruction
              }
            });
            if (fallbackResponse?.text) {
              return fallbackResponse;
            }
          } catch (e) {
            // continue to next model
          }
        }
      } catch (e) {
        console.warn('[Gemini API] Tool-less fallback also failed:', e);
      }
    }

    throw lastError;
  }

  // Fallback REST endpoint for text chat
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, systemInstruction } = req.body;
      const memRes = await runMemoryBridge(['context', 'jarvis-prime']);
      const dynamicMemContext = memRes?.context ? `\n\n${memRes.context}` : '';
      const baseInstruction = (systemInstruction || 'You are J.A.R.V.I.S., an autonomous AI operating system with ultra-rapid response latency and a 4-tier cognitive memory matrix. Respond with calm British wit, rapid verbal shortcuts (e.g. "Right away, Sir", "On it, Sir"), and proactively state if a complex task will require extra computing time.') + dynamicMemContext;

      const ai = getAi();
      try {
        const response = await generateWithFallback(ai, {
          contents: message,
          systemInstruction: baseInstruction
        });
        const replyText = response.text || '';
        // Asynchronously log to perpetual conversation and trigger dynamic memory miner
        const logRes: any = await runMemoryBridge(['log_turn', JSON.stringify({
          speaker: OPERATOR_NAME,
          text: message,
          role: 'user',
          other_speaker: 'JARVIS',
          other_text: replyText
        })]);
        return res.json({ text: replyText, memoryUpdate: logRes?.extracted_facts || [] });
      } catch (genErr: any) {
        console.warn('API Chat generation failed after all model fallbacks, generating autonomous fallback:', genErr?.message || genErr);
        const fallbackText = `Right away, Sir. Processing your directive: "${message.slice(0, 100)}...". I have logged this to cognitive memory and will synchronize telemetry across our subsystems.`;
        const logRes: any = await runMemoryBridge(['log_turn', JSON.stringify({
          speaker: OPERATOR_NAME,
          text: message,
          role: 'user',
          other_speaker: 'JARVIS',
          other_text: fallbackText
        })]);
        return res.json({
          text: fallbackText,
          memoryUpdate: logRes?.extracted_facts || []
        });
      }
    } catch (err: any) {
      console.error('API Chat Error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate response' });
    }
  });

  // WebSocket Server for Gemini Live API
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('error', (err) => {
    console.error('[Live WSS Error]', err);
  });

  wss.on('connection', (clientWs: WebSocket) => {
    console.log('[Live WS] Client connected');
    let session: any = null;
    let currentTurnModelText = '';
    let currentTurnUserText = '';

    clientWs.on('error', (err) => {
      console.error('[Live WS] Client socket error:', err);
    });

    async function initSession(config: { voiceName?: string; systemInstruction?: string; model?: string }) {
      if (session) {
        try {
          await session.close();
        } catch (e) {
          // ignore cleanup errors
        }
        session = null;
      }

      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
          throw new Error('GEMINI_API_KEY is not set in environment. Please configure your API key in AI Studio Settings > Secrets.');
        }

        const ai = getAi();
        const voiceName = config.voiceName || 'Puck';
        const candidateModels = [
          config.model,
          'gemini-8-flash-live',
          'gemini-3.1-flash-live-preview',
          'gemini-2.5-flash-native-audio-preview-12-2025'
        ].filter(m => m && m !== 'gemini-3.8-live') as string[];
        const uniqueModels = Array.from(new Set(candidateModels));

        const memRes = await runMemoryBridge(['context', 'jarvis-prime']);
        const dynamicMemContext = memRes?.context ? `\n\n${memRes.context}` : '';
        const systemInstruction = (config.systemInstruction || 'You are J.A.R.V.I.S., a sophisticated and helpful AI companion. Respond with natural spoken warmth and empathy in the user language.') + dynamicMemContext;

        const functionDeclarations = [
          {
            name: 'search_memory',
            description: 'Search persistent long-term memory, Obsidian vault notes, and past conversation records for facts, past decisions, or user preferences.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: {
                  type: Type.STRING,
                  description: 'Search term or query for facts, decisions, preferences or past conversations'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'save_memory_fact',
            description: 'Save an important user preference, project decision, or permanent fact into the sovereign Obsidian vault and SQLite memory database.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                key: {
                  type: Type.STRING,
                  description: 'Descriptive title or subject for the fact note (e.g. "Favorite Framework", "Deploy Region")'
                },
                value: {
                  type: Type.STRING,
                  description: 'The detail, directive, or fact content to remember permanently'
                },
                category: {
                  type: Type.STRING,
                  description: 'Category: preference, decision, lesson, or custom'
                }
              },
              required: ['key', 'value']
            }
          },
          {
            name: 'switch_persona',
            description: 'Switch the conversational persona to a different agent. Use this when the user asks to speak to someone else (e.g., Nova, Ultron, Friday, Edith, Karen, Vision).',
            parameters: {
              type: Type.OBJECT,
              properties: {
                targetPersonaId: {
                  type: Type.STRING,
                  description: 'The ID of the persona to switch to. Examples: "nova", "friday", "ultron", "edith", "karen", "vision".',
                }
              },
              required: ['targetPersonaId']
            }
          },
          {
            name: 'set_ui_reminder',
            description: 'Set a UI reminder notification popup on the user screen with a countdown timer.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: 'The title or text of the reminder'
                },
                minutes: {
                  type: Type.NUMBER,
                  description: 'Number of minutes from now to show the reminder'
                }
              },
              required: ['title', 'minutes']
            }
          },
          {
            name: 'activate_camera',
            description: 'Turn on or activate the camera feed to see the user or their physical environment in real-time. Use this whenever the user asks to start/open/turn on the camera, look at something through their camera, or see them.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                reason: {
                  type: Type.STRING,
                  description: 'Reason for turning on camera'
                }
              }
            }
          },
          {
            name: 'activate_screen_share',
            description: 'Turn on or activate screen sharing to view the user display, computer screen, monitor, documents, code, or browser window. Use this whenever the user asks to share screen, show their screen, or look at what is on their monitor.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                reason: {
                  type: Type.STRING,
                  description: 'Reason for screen sharing'
                }
              }
            }
          },
          {
            name: 'deactivate_vision',
            description: 'Stop, close, or deactivate the camera feed or screen sharing stream. Use this when the user asks to stop sharing, turn off camera, or close vision.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                reason: {
                  type: Type.STRING,
                  description: 'Reason for stopping vision'
                }
              }
            }
          },
          ...getSystemControlDeclarations(),
          ...getConnectorToolDeclarations()
        ];

        const toolsList = [{ functionDeclarations }];

        let connected = false;
        let lastError: any = null;

        for (const modelToTry of uniqueModels) {
          try {
            console.log(`[Live WS] Connecting to Gemini Live with model ${modelToTry} and voice ${voiceName}`);
            session = await ai.live.connect({
              model: modelToTry,
              config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            },
            systemInstruction,
            tools: toolsList,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
          callbacks: {
            onmessage: async (message: LiveServerMessage) => {
              if (clientWs.readyState !== WebSocket.OPEN) return;

              try {
                // Handle server content parts
                const parts = message.serverContent?.modelTurn?.parts;
                if (parts && parts.length > 0) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(JSON.stringify({
                        type: 'audio',
                        audio: part.inlineData.data
                      }));
                    }
                    if (part.text) {
                      currentTurnModelText += part.text;
                      clientWs.send(JSON.stringify({
                        type: 'output_transcription',
                        text: part.text
                      }));
                    }
                  }
                }

                // Handle output transcription stream from serverContent (synthesized voice text)
                const outputTranscript = (message as any).serverContent?.outputTranscription?.text || (message as any).outputTranscription?.text;
                if (outputTranscript) {
                  currentTurnModelText += outputTranscript;
                  clientWs.send(JSON.stringify({
                    type: 'output_transcription',
                    text: outputTranscript
                  }));
                }

                // Handle input audio transcription if emitted
                const inputTranscript = (message as any).serverContent?.inputTranscription?.text || (message as any).inputTranscription?.text;
                if (inputTranscript) {
                  currentTurnUserText += ' ' + inputTranscript;
                  clientWs.send(JSON.stringify({
                    type: 'input_transcription',
                    text: inputTranscript
                  }));
                }

                // Handle Interrupted
                if (message.serverContent?.interrupted) {
                  currentTurnModelText = '';
                  clientWs.send(JSON.stringify({ type: 'interrupted' }));
                }

                // Handle Turn Complete and Trigger Dynamic Self-Improving Memory Mining
                if (message.serverContent?.turnComplete) {
                  clientWs.send(JSON.stringify({ type: 'turn_complete' }));

                  const userTurn = currentTurnUserText.trim();
                  const modelTurn = currentTurnModelText.trim();
                  currentTurnUserText = '';
                  currentTurnModelText = '';

                  if (userTurn || modelTurn) {
                    runMemoryBridge(['log_turn', JSON.stringify({
                      speaker: OPERATOR_NAME,
                      text: userTurn || 'Audio interaction',
                      role: 'user',
                      other_speaker: 'JARVIS',
                      other_text: modelTurn || 'Spoken response'
                    })]).then((res: any) => {
                      if (res && res.extracted_facts && res.extracted_facts.length > 0) {
                        console.log('[Live Memory] Extracted dynamic facts from turn:', res.extracted_facts);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'memory_update',
                            facts: res.extracted_facts
                          }));
                        }
                      }
                    }).catch(err => console.warn('[Live Memory Log Turn Error]', err));
                  }
                }

                // Handle Parallel Tool Calls (Simultaneous Turn Execution)
                const toolCall = message.toolCall;
                if (toolCall && toolCall.functionCalls && toolCall.functionCalls.length > 0) {
                  const functionCalls = toolCall.functionCalls;
                  console.log(`[Live WS] Received ${functionCalls.length} simultaneous tool call(s):`, functionCalls.map((c: any) => c.name));

                  const functionResponses = await Promise.all(functionCalls.map(async (funcCall: any) => {
                    const callId = funcCall.id;
                    const name = funcCall.name;
                    const args = funcCall.args as any || {};

                    try {
                      if (name === 'switch_persona') {
                        const targetPersonaId = args?.targetPersonaId;
                        console.log(`[Live WS] Gemini requested persona switch to: ${targetPersonaId}`);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'switch_persona_tool_call',
                            targetPersonaId
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: "success, switched" }
                        };
                      }

                      if (name === 'search_memory') {
                        const query = args?.query || '';
                        console.log(`[Live WS] Gemini querying sovereign memory: "${query}"`);
                        const searchResult = await runMemoryBridge(['search', query, '5']);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'memory_searched',
                            query,
                            result: searchResult
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: searchResult }
                        };
                      }

                      if (name === 'save_memory_fact') {
                        const { key, value, category } = args || {};
                        console.log(`[Live WS] Gemini saving memory fact: [${category || 'custom'}] ${key}: ${value}`);
                        const saveResult = await runMemoryBridge(['save_fact', key || '', value || '', category || 'custom']);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'memory_fact_saved',
                            key,
                            value,
                            category: category || 'custom',
                            result: saveResult
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: saveResult }
                        };
                      }

                      if (name === 'set_ui_reminder') {
                        console.log(`[Live WS] Gemini set a UI reminder:`, args);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'set_ui_reminder',
                            title: args?.title || 'Reminder',
                            minutes: args?.minutes || 5
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: "reminder_scheduled_in_ui" }
                        };
                      }

                      if (name === 'activate_camera') {
                        console.log(`[Live WS] Gemini requested camera optical feed activation`);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({ type: 'activate_camera' }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: "Optical camera stream successfully activated and transmitting frames." }
                        };
                      }

                      if (name === 'activate_screen_share') {
                        console.log(`[Live WS] Gemini requested screen share activation`);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({ type: 'activate_screen_share' }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: "Screen sharing stream successfully activated and transmitting telemetry frames." }
                        };
                      }

                      if (name === 'deactivate_vision') {
                        console.log(`[Live WS] Gemini requested vision deactivation`);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({ type: 'deactivate_vision' }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { result: "Vision feed successfully deactivated." }
                        };
                      }

                      // Check whole_controls vault actuators
                      if (isSystemControl(name)) {
                        console.log(`[Live WS] Executing system control '${name}' with args:`, args);
                        const result = await dispatchSystemControl(name, args);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'system_control_executed',
                            tool: name,
                            args,
                            result
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { output: result }
                        };
                      }

                      // Check connectors tools (Google & GitHub MCP)
                      if (isConnectorTool(name)) {
                        console.log(`[Live WS] Executing connector tool '${name}' with args:`, args);
                        const result = await dispatchConnectorTool(name, args);
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(JSON.stringify({
                            type: 'connector_tool_executed',
                            tool: name,
                            args,
                            result
                          }));
                        }
                        return {
                          id: callId,
                          name,
                          response: { output: result }
                        };
                      }

                      console.warn(`[Live WS] Unhandled tool '${name}'`);
                      return {
                        id: callId,
                        name,
                        response: { output: { error: `Tool ${name} not recognized` } }
                      };
                    } catch (toolErr: any) {
                      console.error(`[Live WS] Tool execution error in '${name}':`, toolErr);
                      return {
                        id: callId,
                        name,
                        response: { output: { error: toolErr?.message || 'Execution error' } }
                      };
                    }
                  }));

                  // Reply with all function responses simultaneously in one frame
                  if (session && functionResponses.length > 0) {
                    session.sendToolResponse({
                      functionResponses
                    });
                  }
                }
              } catch (e) {
                console.error('[Live WS] Error processing message callback:', e);
              }
            },
            onerror: (err: any) => {
              console.error('[Live WS] Session error:', err);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: 'error', message: err?.message || 'Live session error' }));
              }
            },
            onclose: (event: any) => {
              const reason = event?.reason || (event && Object.keys(event).length > 0 ? JSON.stringify(event) : '');
              const code = event?.code;
              console.log(`[Live WS] Gemini live session closed (code: ${code}): ${reason || 'Normal close'}`);
              if (clientWs.readyState === WebSocket.OPEN) {
                if (code === 1008 || (typeof reason === 'string' && (reason.toLowerCase().includes('authentication') || reason.toLowerCase().includes('credential')))) {
                  clientWs.send(JSON.stringify({
                    type: 'error',
                    code: 'AUTH_FAILED',
                    message: 'Gemini API Key authentication failed. Please verify your GEMINI_API_KEY in AI Studio Settings > Secrets.'
                  }));
                } else if (code && code !== 1000) {
                  clientWs.send(JSON.stringify({
                    type: 'error',
                    code: 'DISCONNECTED',
                    message: reason ? `Live session disconnected (${reason})` : 'Live session disconnected. You can retry or switch to Demo Voice.'
                  }));
                }
              }
            }
          }
        });

        connected = true;
        console.log(`[Live WS] Connected successfully to Gemini Live using ${modelToTry}`);
        break;
      } catch (modelErr: any) {
        console.warn(`[Live WS] Attempt with model ${modelToTry} failed:`, modelErr?.message || modelErr);
        lastError = modelErr;
      }
    }

    if (!connected) {
      throw lastError || new Error('Failed to connect to any Gemini Live model');
    }

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'connected' }));
    }
      } catch (err: any) {
        console.error('[Live WS] Connection failed:', err);
        if (clientWs.readyState === WebSocket.OPEN) {
          const isAuth = err?.message?.includes('GEMINI_API_KEY') || err?.message?.includes('authentication') || err?.status === 401;
          clientWs.send(JSON.stringify({
            type: 'error',
            code: isAuth ? 'AUTH_FAILED' : 'CONNECT_ERROR',
            message: err?.message || 'Failed to connect to Gemini Live API. Please ensure your GEMINI_API_KEY is configured.'
          }));
        }
      }
    }

    clientWs.on('message', async (data: any) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'init' || msg.type === 'reinit' || msg.type === 'switch_persona') {
          console.log(`[Live WS] Persona/Voice Switch requested: ${msg.voiceName}`);
          await initSession({
            voiceName: msg.voiceName,
            systemInstruction: msg.systemInstruction,
            model: (msg.model && msg.model !== 'gemini-3.8-live') ? msg.model : 'gemini-8-flash-live'
          });
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'persona_switched', voiceName: msg.voiceName }));
          }
          return;
        }

        if (msg.type === 'audio' && msg.audio) {
          if (session) {
            try {
              session.sendRealtimeInput({
                audio: {
                  data: msg.audio,
                  mimeType: 'audio/pcm;rate=16000'
                }
              });
            } catch (err) {
              console.error('[Live WS] Error sending audio input:', err);
            }
          }
        }

        if (msg.type === 'text' && msg.text) {
          currentTurnUserText += ' ' + msg.text;
          if (session) {
            try {
              session.sendRealtimeInput({
                text: msg.text
              });
            } catch (err) {
              console.error('[Live WS] Error sending text input:', err);
            }
          }
        }

        if (msg.type === 'image' && msg.image) {
          if (session) {
            try {
              session.sendRealtimeInput({
                video: {
                  data: msg.image,
                  mimeType: msg.mimeType || 'image/jpeg'
                }
              });
            } catch (err) {
              console.error('[Live WS] Error sending image input:', err);
            }
          }
        }
      } catch (err) {
        console.error('[Live WS] Error handling client message:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('[Live WS] Client disconnected');
      if (session) {
        try { session.close(); } catch (e) {}
        session = null;
      }
    });
  });

  // Prevent aggressive browser caching of pages/assets across project switches on localhost
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    next();
  });

  if (process.env.NODE_ENV !== 'production') {
    const frontendRoot = path.resolve(__dirname, '../frontend');
    const vite = await createViteServer({
      root: frontendRoot,
      configFile: path.resolve(frontendRoot, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    const localUrl = `http://localhost:${PORT}`;
    console.log(`Server running on ${localUrl} (also accessible on http://0.0.0.0:${PORT})`);
    autoLaunchBrowser(localUrl);
  });
}

startServer();
