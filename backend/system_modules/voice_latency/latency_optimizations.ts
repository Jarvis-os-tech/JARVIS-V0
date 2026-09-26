/**
 * Voice Latency Optimization Guide & Helper Utilities
 * Key techniques for achieving sub-300ms round-trip voice interaction:
 */

export interface LatencyTuningConfig {
  /** Optimal buffer size for ScriptProcessor / AudioWorklet (1024 = 64ms, 2048 = 128ms at 16kHz) */
  bufferSize: 1024 | 2048 | 4096;
  /** Silence threshold RMS value (0-100). Below this, chunks can be dropped to reduce upstream bandwidth */
  noiseGateThreshold: number;
  /** Minimum consecutive speech frames before opening gate */
  speechHoldFrames: number;
}

export const DEFAULT_LATENCY_CONFIG: LatencyTuningConfig = {
  bufferSize: 2048, // ~128ms latency per chunk at 16kHz
  noiseGateThreshold: 3,
  speechHoldFrames: 2
};

/**
 * Noise Gate / Voice Activity Filter
 * Filters out low-level ambient room noise before base64 encoding to preserve bandwidth & reduce model inference delay.
 */
export class LowLatencyNoiseGate {
  private threshold: number;
  private holdFrames: number;
  private activeCount: number = 0;

  constructor(threshold = 3, holdFrames = 2) {
    this.threshold = threshold;
    this.holdFrames = holdFrames;
  }

  public shouldTransmit(volumeRms: number): boolean {
    if (volumeRms >= this.threshold) {
      this.activeCount = this.holdFrames;
      return true;
    }
    if (this.activeCount > 0) {
      this.activeCount--;
      return true;
    }
    return false;
  }

  public setThreshold(threshold: number) {
    this.threshold = threshold;
  }
}

/**
 * AudioWorklet Processor Source Code (String representation for blob loading)
 * Using AudioWorklet replaces main-thread ScriptProcessorNode, eliminating UI thread jitter.
 */
export const AUDIO_WORKLET_PROCESSOR_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channel = input[0];
    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.bytesWritten++] = channel[i];
      if (this.bytesWritten >= this.bufferSize) {
        this.port.postMessage(this.buffer.slice(0, this.bufferSize));
        this.bytesWritten = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

/**
 * Latency Breakdown & Benchmark Reference:
 * 1. Audio Capture & Buffer (2048 samples @ 16kHz) -> ~128ms
 * 2. Base64 & WebSocket Client-to-Server Network -> ~15ms - 40ms
 * 3. Gemini 3.1 Live Native Audio Inference TTFT -> ~80ms - 150ms
 * 4. WebSocket Server-to-Client Streaming -> ~15ms - 40ms
 * 5. WebAudio Jitter Buffer Gapless Scheduling -> ~5ms
 * -------------------------------------------------------------
 * Total Round-Trip Conversational Latency: ~240ms - 360ms
 */
