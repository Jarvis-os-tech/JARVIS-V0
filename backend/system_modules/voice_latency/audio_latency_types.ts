export interface AudioConfig {
  sampleRateInput: number; // 16000 Hz for Gemini Live input
  sampleRateOutput: number; // 24000 Hz from Gemini Live output
  chunkSizeMs: number; // e.g. 100ms or 2048 samples
  noiseGateThreshold: number; // RMS threshold to skip silent chunks
  enableNoiseFilter: boolean;
}

export interface LatencyMetrics {
  roundTripTimeMs: number;
  timeToFirstByteMs: number;
  playbackBufferDelayMs: number;
  totalLatencyEstimateMs: number;
  lastPingTimestamp: number;
}

export interface AudioQueueState {
  isPlaying: boolean;
  activeSourcesCount: number;
  currentVolume: number;
  queuedDurationSec: number;
}
