/**
 * J.A.R.V.I.S. Audio Synthesizer (Web Audio API)
 * Zero-dependency procedural sci-fi interface sound effects.
 */

class JarvisSFX {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  constructor() {
    // Check saved mute preference
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('jarvis_sfx_muted');
      this.isMuted = savedMute === 'true';
    }
  }

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 0.25; // comfortable level
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis_sfx_muted', String(muted));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.25, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Short tactical blip / chirp on button hover or tap
   */
  public playPip(freq = 1200, duration = 0.04) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + duration);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + duration);
    } catch {
      // AudioContext handling safety
    }
  }

  /**
   * Arc Reactor engagement bass swell & electrical ionization chirp
   */
  public playReactorHum() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const t = this.ctx.currentTime;

      // Sub-bass sine sweep
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65, t);
      osc1.frequency.exponentialRampToValueAtTime(220, t + 0.35);

      gain1.gain.setValueAtTime(0.01, t);
      gain1.gain.linearRampToValueAtTime(0.5, t + 0.15);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc1.connect(gain1);
      gain1.connect(this.masterGain);
      osc1.start(t);
      osc1.stop(t + 0.45);

      // High resonance harmonic
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, t + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(880, t + 0.35);

      gain2.gain.setValueAtTime(0.001, t);
      gain2.gain.linearRampToValueAtTime(0.2, t + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(t + 0.1);
      osc2.stop(t + 0.45);
    } catch {}
  }

  /**
   * Arpeggiated holographic chime on coworker squad transfer
   */
  public playHandoff() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.15);
      });
    } catch {}
  }

  /**
   * High-frequency tactile ping on mid-sentence fast actuation
   */
  public playActuation() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1760, t); // A6
      osc.frequency.exponentialRampToValueAtTime(2637, t + 0.08); // E7

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.09);
    } catch {}
  }

  /**
   * Holographic modal drawer whoosh
   */
  public playModalOpen() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(640, t + 0.12);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.14);
    } catch {}
  }

  /**
   * Low warning alert buzz
   */
  public playWarning() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.setValueAtTime(140, t + 0.08);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.18);
    } catch {}
  }
}

export const sfx = new JarvisSFX();
