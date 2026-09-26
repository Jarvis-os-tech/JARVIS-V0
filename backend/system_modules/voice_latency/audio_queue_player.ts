import { base64ToAudioBuffer, calculateVolume } from './audio_processor';
import { AudioQueueState } from './audio_latency_types';

/**
 * AudioQueuePlayer
 * High-performance gapless audio chunk scheduler with zero-click cross-buffer timing,
 * instantaneous barge-in cancellation, and dynamic volume metering.
 */
export class AudioQueuePlayer {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onVolumeChange?: (volume: number) => void;
  private onPlaybackStateChange?: (isPlaying: boolean) => void;

  constructor(
    onVolumeChange?: (vol: number) => void,
    onPlaybackStateChange?: (isPlaying: boolean) => void
  ) {
    this.onVolumeChange = onVolumeChange;
    this.onPlaybackStateChange = onPlaybackStateChange;
  }

  /**
   * Lazily acquires or resumes the high-precision 24kHz AudioContext
   */
  public getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 24000, latencyHint: 'interactive' });
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Schedules a newly arrived 24kHz Base64 PCM chunk into the WebAudio pipeline
   */
  public enqueueChunk(base64Pcm: string) {
    const ctx = this.getAudioContext();
    try {
      const audioBuffer = base64ToAudioBuffer(base64Pcm, ctx, 24000);
      const channelData = audioBuffer.getChannelData(0);
      const vol = calculateVolume(channelData);
      
      if (this.onVolumeChange) {
        this.onVolumeChange(vol);
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      // If queue fell behind current time, reset to current time with 5ms jitter guard
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.005;
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
      console.error('[AudioQueuePlayer] Error scheduling audio chunk:', err);
    }
  }

  /**
   * Barge-In / Interrupt handler: Instantaneously stops and discards all pending audio chunks
   */
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

  /**
   * Returns current playback state and buffer length
   */
  public getState(): AudioQueueState {
    const isPlaying = this.activeSources.length > 0;
    const currentTime = this.ctx ? this.ctx.currentTime : 0;
    const queuedDurationSec = Math.max(0, this.nextStartTime - currentTime);
    return {
      isPlaying,
      activeSourcesCount: this.activeSources.length,
      currentVolume: 0,
      queuedDurationSec
    };
  }

  /**
   * Closes the AudioContext and releases hardware audio devices
   */
  public close() {
    this.stopAndClear();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
