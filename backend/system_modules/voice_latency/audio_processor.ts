/**
 * Audio Processor Module
 * Ultra-fast Float32 to Int16 PCM encoder/decoder, RMS volume calculator,
 * and low-latency Web Audio Context management.
 */

/**
 * Converts Float32Array from microphone (range -1.0 to 1.0) into
 * 16-bit signed Linear PCM (Int16) encoded as Base64.
 * Optimized with direct byte buffer transfer for minimal CPU latency.
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

/**
 * Decodes 24kHz Base64-encoded 16-bit PCM back into a Web Audio API AudioBuffer
 */
export function base64ToAudioBuffer(base64: string, ctx: AudioContext, targetSampleRate = 24000): AudioBuffer {
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
  const buffer = ctx.createBuffer(1, float32.length, targetSampleRate);
  buffer.getChannelData(0).set(float32);
  return buffer;
}

/**
 * Calculates Root-Mean-Square (RMS) volume (0 - 100) from Float32 audio channel
 */
export function calculateVolume(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sum / (buffer.length || 1));
  return Math.min(100, Math.round(rms * 350));
}

/**
 * Downsamples audio from browser native sample rate (e.g., 44.1kHz / 48kHz) down to 16kHz
 * if the browser AudioContext cannot be natively instantiated at 16000Hz.
 */
export function downsampleTo16k(
  inputBuffer: Float32Array,
  inputSampleRate: number
): Float32Array {
  if (inputSampleRate === 16000) {
    return inputBuffer;
  }
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(inputBuffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputBuffer.length; i++) {
      accum += inputBuffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}
