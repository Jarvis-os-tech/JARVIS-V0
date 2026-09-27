import { GoogleGenAI, Modality, Type } from '@google/genai';
import { LiveSessionConfig } from './intelligent_types';
import { workspaceFunctionDeclarations, handleWorkspaceToolCall } from './workspace_tools';
import { getSystemControlDeclarations, dispatchSystemControl, isSystemControl } from './system_controls';

export class GeminiLiveBrain {
  private ai: GoogleGenAI;
  private activeSession: any = null;
  private model: string = 'gemini-8-flash-live';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is required to initialize GeminiLiveBrain');
    }
    this.ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }

  /**
   * Initializes a live bidirectional multi-modal session with Gemini 3.1 Live
   */
  public async createSession(config: LiveSessionConfig, callbacks: {
    onAudioOutput?: (base64Pcm: string) => void;
    onTextOutput?: (text: string) => void;
    onTurnComplete?: () => void;
    onToolCall?: (toolCall: any) => Promise<any>;
    onError?: (err: any) => void;
    onClose?: (code?: number, reason?: string) => void;
  }) {
    if (this.activeSession) {
      try {
        await this.activeSession.close();
      } catch (e) {
        // ignore cleanup error
      }
      this.activeSession = null;
    }

    const voiceName = config.voiceName || 'Puck';
    const model = config.model || this.model;
    const systemInstruction = config.systemInstruction || 'You are Jarvis, an ultra-fast intelligent voice assistant.';

    // Prepare unified tool declarations
    const baseFunctionDeclarations = [
      {
        name: 'switch_persona',
        description: 'Switch the conversational persona to a different agent. Use this when the user asks to speak to someone else (e.g. Jarvis, Friday, Ultron, Edith, Karen, Vision).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            targetPersonaId: {
              type: Type.STRING,
              description: 'The ID of the persona to switch to.'
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
      }
    ];

    const allDeclarations = [
      ...baseFunctionDeclarations,
      ...getSystemControlDeclarations(),
      ...(config.googleAccessToken ? workspaceFunctionDeclarations : [])
    ];

    this.activeSession = await this.ai.live.connect({
      model,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName
            }
          }
        },
        systemInstruction,
        tools: [{ functionDeclarations: allDeclarations }]
      },
      callbacks: {
        onopen: () => {
          console.log(`[GeminiLiveBrain] Live session opened with voice ${voiceName}`);
        },
        onmessage: async (message: any) => {
          // Handle Model Turn Audio/Text
          if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
              if (part.inlineData?.data && callbacks.onAudioOutput) {
                callbacks.onAudioOutput(part.inlineData.data);
              }
              if (part.text && callbacks.onTextOutput) {
                callbacks.onTextOutput(part.text);
              }
            }
          }

          if (message.serverContent?.turnComplete && callbacks.onTurnComplete) {
            callbacks.onTurnComplete();
          }

          // Handle Function/Tool Calls Simultaneously in Parallel
          if (message.toolCall && message.toolCall.functionCalls?.length > 0) {
            const functionCalls = message.toolCall.functionCalls;
            const functionResponses = await Promise.all(functionCalls.map(async (call: any) => {
              try {
                let result: any = null;
                if (callbacks.onToolCall) {
                  result = await callbacks.onToolCall(call);
                }

                // If not handled by caller callback, check whole_controls system vault
                if ((result === undefined || result === null) && isSystemControl(call.name)) {
                  result = await dispatchSystemControl(call.name, call.args);
                }

                // If still not handled, check workspace tools
                if ((result === undefined || result === null) && config.googleAccessToken) {
                  result = await handleWorkspaceToolCall(call.name, call.args, config.googleAccessToken);
                }

                return {
                  response: { output: result || { status: 'completed' } },
                  id: call.id
                };
              } catch (err: any) {
                console.error(`[GeminiLiveBrain] Error executing tool ${call.name}:`, err);
                return {
                  response: { error: err.message },
                  id: call.id
                };
              }
            }));

            // Send bundled toolResponse back to Gemini Live
            await this.activeSession.send({
              toolResponse: {
                functionResponses
              }
            });
          }
        },
        onerror: (err: any) => {
          console.error('[GeminiLiveBrain] Live session error:', err);
          if (callbacks.onError) callbacks.onError(err);
        },
        onclose: (event: any) => {
          console.log('[GeminiLiveBrain] Live session closed:', event?.code, event?.reason);
          if (callbacks.onClose) callbacks.onClose(event?.code, event?.reason);
        }
      }
    });

    return this.activeSession;
  }

  /**
   * Stream Realtime 16kHz PCM Audio Chunks to the Live Brain
   */
  public sendAudioChunk(base64Pcm16k: string) {
    if (!this.activeSession) return;
    this.activeSession.sendRealtimeInput({
      audio: {
        data: base64Pcm16k,
        mimeType: 'audio/pcm;rate=16000'
      }
    });
  }

  /**
   * Send Realtime Vision / Screen capture frame (JPEG base64)
   */
  public sendVisionFrame(base64Jpeg: string) {
    if (!this.activeSession) return;
    this.activeSession.sendRealtimeInput({
      media: {
        data: base64Jpeg,
        mimeType: 'image/jpeg'
      }
    });
  }

  /**
   * Send Text or System Prompt turn
   */
  public sendTextTurn(text: string) {
    if (!this.activeSession) return;
    this.activeSession.send({
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }]
          }
        ],
        turnComplete: true
      }
    });
  }

  /**
   * Cleanly terminate active live session
   */
  public async close() {
    if (this.activeSession) {
      try {
        await this.activeSession.close();
      } catch (e) {
        // ignore
      }
      this.activeSession = null;
    }
  }
}
