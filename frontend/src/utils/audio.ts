/**
 * Audio utilities for Gemini Live API — AudioWorklet-based capture & playback.
 *
 * Reference implementation: google-gemini/gemini-live-api-examples
 *
 * Key improvements over the old ScriptProcessorNode approach:
 *   - Capture runs on the real-time audio rendering thread (AudioWorklet)
 *   - 32ms buffer chunks (512 samples @ 16kHz) instead of 256ms (4096 samples)
 *   - Playback uses a zero-copy ring-buffer worklet instead of per-chunk AudioBufferSourceNode
 *   - No GC pauses on the main thread during audio processing
 */

export function float32ToInt16Base64(buffer: Float32Array): string {
  const l = buffer.length;
  const int16Array = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  let binary = '';
  const bytes = new Uint8Array(int16Array.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function calculateVolume(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sum / (buffer.length || 1));
  return Math.min(100, Math.round(rms * 350));
}

/**
 * AudioWorklet-based playback queue.
 * Sends Float32 PCM chunks directly to a worklet ring-buffer on the audio thread.
 * Zero AudioBufferSourceNode creation per chunk — no GC pressure or scheduling gaps.
 */
export class AudioQueuePlayer {
  private ctx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private onVolumeChange?: (volume: number) => void;
  private onPlaybackStateChange?: (isPlaying: boolean) => void;
  private isWarmedUp = false;
  private isPlaying = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(onVolumeChange?: (vol: number) => void, onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onVolumeChange = onVolumeChange;
    this.onPlaybackStateChange = onPlaybackStateChange;
  }

  /**
   * Pre-warms the Web Audio Context, loads the playback worklet, and primes the DAC.
   */
  public async prewarm(): Promise<void> {
    try {
      if (this.isWarmedUp && this.ctx && this.ctx.state === 'running') return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx({ sampleRate: 24000 });
      }
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Load the playback worklet if not yet loaded
      if (!this.workletNode) {
        await this.ctx.audioWorklet.addModule('/audio-processors/playback.worklet.js');
        this.workletNode = new AudioWorkletNode(this.ctx, 'pcm-processor');
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = 1.0;
        this.workletNode.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);
      }

      this.isWarmedUp = true;
      console.log('[AudioQueuePlayer] Worklet-based playback pipeline pre-warmed.');
    } catch (err) {
      console.warn('[AudioQueuePlayer] Prewarm notice:', err);
    }
  }

  public isPrewarmed(): boolean {
    return this.isWarmedUp && this.ctx !== null && this.ctx.state === 'running';
  }

  public getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 24000 });
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public enqueueChunk(base64Pcm: string) {
    if (!this.workletNode || !this.ctx) {
      // Fallback: if worklet isn't loaded yet, try to prewarm
      this.prewarm().then(() => this.enqueueChunk(base64Pcm)).catch(() => {});
      return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    try {
      // Decode base64 → Int16 → Float32
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32Data[i] = int16[i] / 32768;
      }

      // Volume metering
      const vol = calculateVolume(float32Data);
      if (this.onVolumeChange) {
        this.onVolumeChange(vol);
      }

      // Send to worklet for gapless playback
      this.workletNode.port.postMessage(float32Data);

      // Track playback state
      if (!this.isPlaying) {
        this.isPlaying = true;
        if (this.onPlaybackStateChange) {
          this.onPlaybackStateChange(true);
        }
      }

      // Reset silence detection timer — after ~300ms of no new chunks, consider playback done
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        this.isPlaying = false;
        if (this.onPlaybackStateChange) {
          this.onPlaybackStateChange(false);
        }
        if (this.onVolumeChange) {
          this.onVolumeChange(0);
        }
      }, 300);
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  }

  public stopAndClear() {
    // Tell worklet to flush its ring buffer
    if (this.workletNode) {
      this.workletNode.port.postMessage('interrupt');
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.isPlaying = false;
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(false);
    }
    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  public close() {
    this.stopAndClear();
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isWarmedUp = false;
  }
}

/**
 * Synthesizes futuristic Stark HUD notification audio cues using native Web Audio API oscillators.
 * Zero external asset files or network latency.
 * NOTE: Beep sound removed per user directive.
 */
export function playStarkChime(_type: 'start' | 'complete' | 'alert' = 'complete'): void {
  // Beep sound removed per user request
}
