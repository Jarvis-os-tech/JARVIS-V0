import { VoicePersona } from '../types';

export interface DemoVoiceOptions {
  persona: VoicePersona;
  onVolumeChange?: (volume: number) => void;
  onStartSpeaking?: () => void;
  onStopSpeaking?: () => void;
  onTranscriptChunk?: (chunk: string) => void;
}

export class DemoVoiceService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private volumeInterval: any = null;
  private isSpeaking = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isAvailable(): boolean {
    return !!this.synth;
  }

  public speak(text: string, options: DemoVoiceOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) {
        options.onTranscriptChunk?.(text);
        resolve();
        return;
      }

      // Stop any previous speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      // Select suitable voice
      const voices = this.synth.getVoices();
      const pName = options.persona.name.toLowerCase();

      let matchedVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google'));
      if (!matchedVoice) {
        matchedVoice = voices.find(v => v.lang.startsWith('en'));
      }

      // Fine-tune tone for J.A.R.V.I.S.
      utterance.pitch = 0.95;
      utterance.rate = 1.0;

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        options.onStartSpeaking?.();
        options.onTranscriptChunk?.(text);

        // Simulate waveform volume for visualizer orb
        let phase = 0;
        this.volumeInterval = setInterval(() => {
          phase += 0.2;
          const simulatedVol = Math.abs(Math.sin(phase) * 0.4 + Math.cos(phase * 2.3) * 0.3) * 0.8 + 0.1;
          options.onVolumeChange?.(simulatedVol);
        }, 60);
      };

      utterance.onend = () => {
        this.cleanup();
        options.onVolumeChange?.(0);
        options.onStopSpeaking?.();
        resolve();
      };

      utterance.onerror = (err) => {
        console.warn('[DemoVoice] Utterance error:', err);
        this.cleanup();
        options.onVolumeChange?.(0);
        options.onStopSpeaking?.();
        resolve();
      };

      this.synth.speak(utterance);
    });
  }

  public stop() {
    this.cleanup();
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
  }

  private cleanup() {
    this.isSpeaking = false;
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }
    this.currentUtterance = null;
  }

  public generateResponse(userInput: string, _personaName?: string): string {
    const input = userInput.toLowerCase();

    // Deep diagnostics / heavy computation
    if (input.includes('deep') || input.includes('exhaustive') || input.includes('full check') || input.includes('telemetry')) {
      return `Right away, Sir. Initializing deep diagnostic scan across all neural pipelines. This multi-stage check will take a brief moment to compute—compiling full results now. All 4 memory matrix tiers, real-time audio channels, and system security credentials are fully verified and operating at peak efficiency.`;
    }

    // Code & architecture analysis (complex task)
    if (input.includes('code') || input.includes('architecture') || input.includes('audit') || input.includes('optimize') || input.includes('build')) {
      return `On it, Sir. Accessing project architecture and cross-referencing latency parameters. This is a multi-step analysis, so allow me a brief moment. Audio pipeline latency is optimized to sub-50ms, state decouplings are verified, and cognitive persistence is operating without bottleneck.`;
    }

    // Tactical roadmap & planning
    if (input.includes('roadmap') || input.includes('planning') || input.includes('milestone') || input.includes('plan')) {
      return `Executing tactical planning protocol, Sir. This calculation will require a moment to structure. Roadmap initialized: Phase 1 low-latency streaming verified, Phase 2 Google connectors active, Phase 3 episodic recall established. Committed to episodic memory.`;
    }

    // Memory recall inquiries
    if (input.includes('memory') || input.includes('recall') || input.includes('remember') || input.includes('banks')) {
      return `Accessing memory matrix, Sir. My 4-tier memory architecture (Working, Episodic, Semantic, and Long-Term) is fully synchronized and holding all your directives in safe persistent storage.`;
    }

    // Quick status check
    if (input.includes('status') || input.includes('diagnostic') || input.includes('health') || input.includes('check')) {
      return `Right away, Sir. All core systems are functioning within optimal operational tolerances. Arc-Reactor acoustic telemetry and memory banks are 100% operational.`;
    }

    // Reminders
    if (input.includes('remind') || input.includes('reminder')) {
      return `Right away, Sir. I have committed that reminder to working memory and configured the alert trigger.`;
    }

    // Camera activation & optical telemetry
    if (input.includes('turn on camera') || input.includes('open camera') || input.includes('activate camera') || input.includes('start camera') || input.includes('enable camera') || input.includes('show camera')) {
      return `Right away, Sir. Initializing optical sensors and camera telemetry feed now.`;
    }

    // Screen sharing activation
    if (input.includes('share screen') || input.includes('share my screen') || input.includes('activate screen share') || input.includes('start screen share') || input.includes('open screen share') || input.includes('show my screen') || input.includes('show screen')) {
      return `On it, Sir. Establishing visual screen-sharing link to monitor your workspace display.`;
    }

    // Vision deactivation
    if (input.includes('stop camera') || input.includes('stop screen') || input.includes('stop sharing') || input.includes('stop vision') || input.includes('close camera') || input.includes('close screen') || input.includes('disable camera')) {
      return `Acknowledged, Sir. Terminating optical feed and closing telemetry stream.`;
    }

    // Camera / screen / image general inspection
    if (input.includes('snapshot') || input.includes('screen') || input.includes('camera') || input.includes('see') || input.includes('look')) {
      return `Optical telemetry feed received, Sir. Real-time vision analytics are active in J.A.R.V.I.S. core memory.`;
    }

    // Email / Gmail inquiries
    if (input.includes('email') || input.includes('mail') || input.includes('inbox') || input.includes('message')) {
      return `Accessing Gmail telemetry, Sir. Initializing inbox connection to scan unread messages and headers. You can also view and draft messages with full confirmation via the Connectors hub.`;
    }

    // Calendar & Schedule inquiries
    if (input.includes('calendar') || input.includes('schedule') || input.includes('event') || input.includes('meeting')) {
      return `Scanning Google Calendar databanks, Sir. Synchronizing your upcoming itinerary and timeline events into active memory.`;
    }

    // Contacts inquiries
    if (input.includes('contact') || input.includes('contacts') || input.includes('people') || input.includes('address book')) {
      return `Accessing Google Contacts directory, Sir. Contact profiles and communications channels are synced and available.`;
    }

    // Greetings & general queries
    if (input.includes('hello') || input.includes('hi') || input.includes('hey') || input.includes('jarvis')) {
      return `Good day, Sir. J.A.R.V.I.S. is online, fully powered, and awaiting your command. How may I be of assistance?`;
    }

    // Complex / Long generic task detection
    if (input.length > 70 || input.includes('how') || input.includes('why') || input.includes('explain') || input.includes('calculate')) {
      return `Acknowledged, Sir. Processing "${userInput}". This will take a brief moment to compute—standby while I assemble the data. Directives evaluated and synced to active memory.`;
    }

    return `Right away, Sir. I have processed "${userInput}" and registered this interaction into our active episodic timeline.`;
  }
}

export const demoVoiceInstance = new DemoVoiceService();
