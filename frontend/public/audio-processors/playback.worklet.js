/**
 * Audio Playback Worklet Processor for playing PCM audio.
 * Uses an offset tracker instead of slice() to avoid allocations
 * on the real-time audio thread.
 *
 * Reference: google-gemini/gemini-live-api-examples
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.audioQueue = [];
    this.currentOffset = 0;

    this.port.onmessage = (event) => {
      if (event.data === 'interrupt') {
        this.audioQueue = [];
        this.currentOffset = 0;
      } else if (event.data instanceof Float32Array) {
        this.audioQueue.push(event.data);
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (output.length === 0) return true;

    const outputChannel = output[0];
    let outputIndex = 0;

    while (outputIndex < outputChannel.length && this.audioQueue.length > 0) {
      const currentBuffer = this.audioQueue[0];
      const remainingSamples = currentBuffer.length - this.currentOffset;
      const samplesToCopy = Math.min(remainingSamples, outputChannel.length - outputIndex);

      for (let i = 0; i < samplesToCopy; i++) {
        outputChannel[outputIndex++] = currentBuffer[this.currentOffset++];
      }

      if (this.currentOffset >= currentBuffer.length) {
        this.audioQueue.shift();
        this.currentOffset = 0;
      }
    }

    // Fill remaining with silence
    while (outputIndex < outputChannel.length) {
      outputChannel[outputIndex++] = 0;
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
