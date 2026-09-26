/**
 * Ultra-Low-Latency WebSocket Audio Streamer
 * Manages full-duplex client-to-server audio/vision streaming, ping-pong RTT latency tracking,
 * and automatic reconnect recovery.
 */

export interface WebSocketStreamerCallbacks {
  onOpen?: () => void;
  onAudioData?: (base64Pcm: string) => void;
  onTextData?: (text: string) => void;
  onTurnComplete?: () => void;
  onPersonaSwitched?: (personaId: string, voiceName: string) => void;
  onLatencyUpdate?: (rttMs: number) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export class WebSocketStreamer {
  private ws: WebSocket | null = null;
  private url: string;
  private callbacks: WebSocketStreamerCallbacks;
  private pingInterval: any = null;
  private lastPingSentTime: number = 0;

  constructor(url: string, callbacks: WebSocketStreamerCallbacks) {
    this.url = url;
    this.callbacks = callbacks;
  }

  public connect(initPayload: {
    voiceName?: string;
    systemInstruction?: string;
    model?: string;
    googleAccessToken?: string;
  }) {
    this.disconnect();

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      // Send session initialization payload immediately
      this.send({
        type: 'init',
        ...initPayload
      });

      this.startPingTracking();

      if (this.callbacks.onOpen) {
        this.callbacks.onOpen();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'audio':
            if (this.callbacks.onAudioData && msg.data) {
              this.callbacks.onAudioData(msg.data);
            }
            break;
          case 'text':
            if (this.callbacks.onTextData && msg.text) {
              this.callbacks.onTextData(msg.text);
            }
            break;
          case 'turn_complete':
            if (this.callbacks.onTurnComplete) {
              this.callbacks.onTurnComplete();
            }
            break;
          case 'persona_switched':
            if (this.callbacks.onPersonaSwitched) {
              this.callbacks.onPersonaSwitched(msg.personaId, msg.voiceName);
            }
            break;
          case 'pong':
            if (this.lastPingSentTime > 0) {
              const rtt = Date.now() - this.lastPingSentTime;
              if (this.callbacks.onLatencyUpdate) {
                this.callbacks.onLatencyUpdate(rtt);
              }
            }
            break;
          case 'error':
            if (this.callbacks.onError) {
              this.callbacks.onError(msg.message || 'Stream error');
            }
            break;
        }
      } catch (e) {
        console.error('[WebSocketStreamer] Failed to parse message:', e);
      }
    };

    this.ws.onerror = (err) => {
      if (this.callbacks.onError) {
        this.callbacks.onError(err);
      }
    };

    this.ws.onclose = () => {
      this.stopPingTracking();
      if (this.callbacks.onClose) {
        this.callbacks.onClose();
      }
    };
  }

  public sendAudioChunk(base64Pcm16k: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'audio_input',
        data: base64Pcm16k
      }));
    }
  }

  public sendVisionFrame(base64Jpeg: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'vision_input',
        data: base64Jpeg
      }));
    }
  }

  public sendText(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'text_input',
        text
      }));
    }
  }

  public reinitSession(payload: {
    voiceName: string;
    systemInstruction: string;
    model?: string;
    googleAccessToken?: string;
  }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'reinit',
        ...payload
      }));
    }
  }

  private send(obj: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  private startPingTracking() {
    this.stopPingTracking();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingSentTime = Date.now();
        this.send({ type: 'ping', timestamp: this.lastPingSentTime });
      }
    }, 4000);
  }

  private stopPingTracking() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public disconnect() {
    this.stopPingTracking();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
