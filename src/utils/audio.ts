/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private grindOsc: OscillatorNode | null = null;
  private grindNoise: AudioWorkletNode | ScriptProcessorNode | null = null;
  private grindGain: GainNode | null = null;
  private sizzleGain: GainNode | null = null;
  private sizzleOsc: ScriptProcessorNode | null = null;

  constructor() {
    // Initialized lazily upon first user interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playCoin() {
    this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // Arpeggio sound
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc1.frequency.setValueAtTime(783.99, now + 0.16); // G5
    osc1.frequency.setValueAtTime(1046.50, now + 0.24); // C6

    osc2.frequency.setValueAtTime(523.25 * 1.5, now);
    osc2.frequency.setValueAtTime(659.25 * 1.5, now + 0.08);
    osc2.frequency.setValueAtTime(783.99 * 1.5, now + 0.16);
    osc2.frequency.setValueAtTime(1046.50 * 1.5, now + 0.24);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  }

  playUnlock() {
    this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(261.63, now); // C4
    osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.15); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.3); // G5
    osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.5); // C6

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.setValueAtTime(0.2, now + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  startGrind() {
    this.resume();
    if (!this.ctx || this.grindOsc) return;

    const now = this.ctx.currentTime;
    
    // Low frequency rumbling oscillator
    this.grindOsc = this.ctx.createOscillator();
    this.grindOsc.type = 'sawtooth';
    this.grindOsc.frequency.setValueAtTime(35, now);

    // Filter to make it muffled
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);

    // Create custom noise source for gritty friction crackles
    if (this.ctx.createScriptProcessor) {
      const bufferSize = 4096;
      this.grindNoise = this.ctx.createScriptProcessor(bufferSize, 1, 1);
      this.grindNoise.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          // Cracking grit texture: sparse spikes in random noise
          const r = Math.random();
          if (r > 0.98) {
            output[i] = (Math.random() * 2 - 1) * 0.4;
          } else {
            output[i] = (Math.random() * 2 - 1) * 0.02; // soft background hiss
          }
        }
      };
    }

    this.grindGain = this.ctx.createGain();
    this.grindGain.gain.setValueAtTime(0, now);

    // Connections
    this.grindOsc.connect(filter);
    filter.connect(this.grindGain);
    
    if (this.grindNoise) {
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(800, now);
      noiseFilter.Q.setValueAtTime(3, now);
      
      this.grindNoise.connect(noiseFilter);
      noiseFilter.connect(this.grindGain);
    }

    this.grindGain.connect(this.ctx.destination);
    
    this.grindOsc.start(now);
  }

  setGrindIntensity(intensity: number) {
    if (!this.ctx || !this.grindGain || !this.grindOsc) return;
    const now = this.ctx.currentTime;
    
    // Modulate gain and pitch with intensity (speed of movement)
    const smoothInt = Math.max(0, Math.min(1, intensity));
    this.grindGain.gain.setTargetAtTime(smoothInt * 0.22, now, 0.05);
    this.grindOsc.frequency.setTargetAtTime(35 + smoothInt * 60, now, 0.1);
  }

  stopGrind() {
    if (!this.grindOsc) return;
    try {
      this.grindOsc.stop();
      this.grindOsc.disconnect();
      if (this.grindNoise) {
        this.grindNoise.disconnect();
      }
      if (this.grindGain) {
        this.grindGain.disconnect();
      }
    } catch (e) {
      console.warn("Error stopping grind sound", e);
    }
    this.grindOsc = null;
    this.grindNoise = null;
    this.grindGain = null;
  }

  playExplosion(power: number = 1.0) {
    this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const noise = this.ctx.createScriptProcessor ? this.ctx.createScriptProcessor(4096, 1, 1) : null;
    const gainNode = this.ctx.createGain();
    const lowpass = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90 * power, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 0.6 * power);

    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(300, now);
    lowpass.frequency.exponentialRampToValueAtTime(20, now + 0.5 * power);

    gainNode.gain.setValueAtTime(0.4 * power, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8 * power);

    osc.connect(lowpass);
    lowpass.connect(gainNode);

    // Setup noise for the blast debris crackle
    if (noise) {
      noise.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < e.outputBuffer.length; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.5;
        }
      };
      
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(200, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(50, now + 0.4);

      noise.connect(noiseFilter);
      noiseFilter.connect(gainNode);
    }

    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.8 * power);
    
    if (noise) {
      setTimeout(() => {
        try {
          noise.disconnect();
        } catch (e) {}
      }, 1000 * power);
    }
  }

  playSpark() {
    this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  playBubble() {
    this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    // Classic bubbling sound starts low and pitches up rapidly
    const startFreq = 150 + Math.random() * 150;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 2.5, now + 0.12);

    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  playSizzle(active: boolean) {
    this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (active) {
      if (this.sizzleOsc) return;

      if (this.ctx.createScriptProcessor) {
        this.sizzleOsc = this.ctx.createScriptProcessor(4096, 1, 1);
        this.sizzleOsc.onaudioprocess = (e) => {
          const output = e.outputBuffer.getChannelData(0);
          for (let i = 0; i < e.outputBuffer.length; i++) {
            // Highly crackly static noise
            const r = Math.random();
            output[i] = r > 0.9 ? (Math.random() * 2 - 1) * 0.12 : (Math.random() * 2 - 1) * 0.015;
          }
        };

        const bandpass = this.ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(3500, now);
        bandpass.Q.setValueAtTime(2, now);

        this.sizzleGain = this.ctx.createGain();
        this.sizzleGain.gain.setValueAtTime(0.05, now);

        this.sizzleOsc.connect(bandpass);
        bandpass.connect(this.sizzleGain);
        this.sizzleGain.connect(this.ctx.destination);
      }
    } else {
      if (this.sizzleOsc) {
        try {
          this.sizzleOsc.disconnect();
          if (this.sizzleGain) this.sizzleGain.disconnect();
        } catch (e) {}
        this.sizzleOsc = null;
        this.sizzleGain = null;
      }
    }
  }
}

export const audio = new SoundEngine();
