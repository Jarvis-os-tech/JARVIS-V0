/**
 * Utility functions for Web Audio API PCM capture, base64 encoding/decoding,
 * gapless audio queue playback at 24kHz, and volume visualization metering.
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

export function base64ToAudioBuffer(base64: string, ctx: AudioContext): AudioBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  const buffer = ctx.createBuffer(1, float32.length, 24000);
  buffer.getChannelData(0).set(float32);
  return buffer;
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
 * Audio Queue Manager for scheduling 24kHz incoming PCM chunks gaplessly
 */
export class AudioQueuePlayer {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onVolumeChange?: (volume: number) => void;
  private onPlaybackStateChange?: (isPlaying: boolean) => void;
  private isWarmedUp = false;

  constructor(onVolumeChange?: (vol: number) => void, onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onVolumeChange = onVolumeChange;
    this.onPlaybackStateChange = onPlaybackStateChange;
  }

  /**
   * Pre-warms the Web Audio Context and audio output pipeline immediately.
   * This awakens the audio hardware clock, executes a micro-buffer of silence
   * to prime the DAC/audio rendering thread, and eliminates initial time-to-first-word latency.
   */
  public async prewarm(): Promise<void> {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Generate a tiny silent buffer (0.005s / 120 samples at 24kHz) to prime the hardware output pipe
      const silentBuffer = ctx.createBuffer(1, 120, 24000);
      const source = ctx.createBufferSource();
      source.buffer = silentBuffer;

      // Connect through a tiny gain node to keep output completely silent during warmup
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start(ctx.currentTime);
      this.nextStartTime = ctx.currentTime;
      this.isWarmedUp = true;
      console.log('[AudioQueuePlayer] Audio output stream pre-warmed & primed for ultra-low latency.');
    } catch (err) {
      console.warn('[AudioQueuePlayer] Audio pre-warming notice:', err);
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
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const audioBuffer = base64ToAudioBuffer(base64Pcm, ctx);
      const channelData = audioBuffer.getChannelData(0);
      const vol = calculateVolume(channelData);
      if (this.onVolumeChange) {
        this.onVolumeChange(vol);
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.005; // Tight 5ms buffer for seamless playback
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.push(source);

      if (this.onPlaybackStateChange && this.activeSources.length === 1) {
        this.onPlaybackStateChange(true);
      }

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0) {
          if (this.onPlaybackStateChange) {
            this.onPlaybackStateChange(false);
          }
          if (this.onVolumeChange) {
            this.onVolumeChange(0);
          }
        }
      };
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  }

  public stopAndClear() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // ignore
      }
    });
    this.activeSources = [];
    if (this.ctx) {
      this.nextStartTime = this.ctx.currentTime;
    }
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(false);
    }
    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  public close() {
    this.stopAndClear();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
