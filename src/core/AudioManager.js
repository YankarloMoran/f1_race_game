export class AudioManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.masterGain = null;

    // Engine oscillators
    this.engineOsc1 = null; // Primary sawtooth
    this.engineOsc2 = null; // Harmonic square octave up
    this.engineOsc3 = null; // Sub-bass sine octave down
    this.engineGain = null;
    this.engineFilter = null;

    // Turbo whine
    this.turboOsc = null;
    this.turboGain = null;

    // Screech
    this.screechOsc = null;
    this.screechGain = null;

    // Off-road noise
    this.noiseNode = null;
    this.noiseGain = null;
    this.noiseBuffer = null;

    // Wind
    this.windNode = null;
    this.windGain = null;
    this.windFilter = null;

    // Gear simulation
    this.currentGear = 1;
    this.gearRatios = [0, 0.12, 0.22, 0.34, 0.46, 0.58, 0.72, 0.86, 1.0];
    this.lastGearTime = 0;

    const initAudio = () => {
      if (this.initialized) return;
      this.init();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('keydown', initAudio);
    window.addEventListener('carCollision', () => this.playCrashSound());
  }

  createNoiseBuffer() {
    const size = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.noiseBuffer = this.createNoiseBuffer();

      // Master volume
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // === ENGINE: Triple oscillator V6 Turbo-Hybrid ===
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(300, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      // Osc1: Primary sawtooth (main engine tone)
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc1.start(0);

      // Osc2: Square wave one octave up (turbo harmonics)
      const osc2Gain = this.ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'square';
      this.engineOsc2.connect(osc2Gain);
      osc2Gain.connect(this.engineFilter);
      this.engineOsc2.start(0);
      this._osc2Gain = osc2Gain;

      // Osc3: Sine sub-bass one octave down (engine rumble)
      const osc3Gain = this.ctx.createGain();
      osc3Gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.engineOsc3 = this.ctx.createOscillator();
      this.engineOsc3.type = 'sine';
      this.engineOsc3.connect(osc3Gain);
      osc3Gain.connect(this.engineFilter);
      this.engineOsc3.start(0);
      this._osc3Gain = osc3Gain;

      // === TURBO WHINE ===
      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0, this.ctx.currentTime);
      const turboFilter = this.ctx.createBiquadFilter();
      turboFilter.type = 'bandpass';
      turboFilter.frequency.setValueAtTime(3000, this.ctx.currentTime);
      turboFilter.Q.setValueAtTime(8, this.ctx.currentTime);
      this.turboOsc = this.ctx.createOscillator();
      this.turboOsc.type = 'sine';
      this.turboOsc.frequency.setValueAtTime(2000, this.ctx.currentTime);
      this.turboOsc.connect(turboFilter);
      turboFilter.connect(this.turboGain);
      this.turboGain.connect(this.masterGain);
      this.turboOsc.start(0);
      this._turboFilter = turboFilter;

      // === SCREECH (drift) ===
      this.screechOsc = this.ctx.createOscillator();
      this.screechOsc.type = 'triangle';
      this.screechOsc.frequency.setValueAtTime(800, this.ctx.currentTime);
      this.screechGain = this.ctx.createGain();
      this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.screechOsc.connect(this.screechGain);
      this.screechGain.connect(this.masterGain);
      this.screechOsc.start(0);

      // === OFF-ROAD NOISE ===
      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = this.noiseBuffer;
      this.noiseNode.loop = true;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(250, this.ctx.currentTime);
      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.noiseNode.connect(noiseFilter);
      noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.masterGain);
      this.noiseNode.start(0);
      this._noiseFilter = noiseFilter;

      // === WIND RUSH ===
      this.windNode = this.ctx.createBufferSource();
      this.windNode.buffer = this.noiseBuffer;
      this.windNode.loop = true;
      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'highpass';
      this.windFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.windNode.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      this.windNode.start(0);

      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API no soportada", e);
    }
  }

  update(speed, maxSpeed, isDrifting, isOnGrass, isOnCurb, isRevving = false) {
    if (!this.initialized || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;

    let normSpeed = Math.min(1, Math.max(0, Math.abs(speed) / maxSpeed));
    if (isRevving) normSpeed = 0.85;

    // === Gear calculation ===
    let newGear = 1;
    for (let g = 8; g >= 1; g--) {
      if (normSpeed >= this.gearRatios[g]) { newGear = g; break; }
    }
    if (newGear !== this.currentGear && (now - this.lastGearTime) > 0.15) {
      this.currentGear = newGear;
      this.lastGearTime = now;
      // Brief dip in engine tone for gear shift
      this.engineGain.gain.setValueAtTime(this.engineGain.gain.value * 0.5, now);
      this.engineGain.gain.setTargetAtTime(this.engineGain.gain.value * 2, now + 0.03, 0.04);
    }

    // RPM within current gear (0-1)
    const gearLow = this.gearRatios[this.currentGear];
    const gearHigh = this.gearRatios[Math.min(8, this.currentGear + 1)];
    const gearRange = gearHigh - gearLow;
    const rpmInGear = gearRange > 0 ? Math.min(1, (normSpeed - gearLow) / gearRange) : 0;

    // === ENGINE FREQUENCIES ===
    let baseFreq = 55 + rpmInGear * 220 + normSpeed * 80;

    // Curb rumble modulation
    if (isOnCurb && Math.abs(speed) > 10) {
      const rumble = Math.sin(Date.now() * 0.09) * 60;
      baseFreq += rumble * 0.15;
    }

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.04); // Octave up + slight detune
    this.engineOsc3.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04); // Octave down

    // Filter opens with RPM
    const filterFreq = 250 + normSpeed * 550 + rpmInGear * 200;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.04);

    // Engine volume
    const engineVol = 0.02 + normSpeed * 0.09;
    this.engineGain.gain.setTargetAtTime(engineVol, now, 0.06);

    // === TURBO WHINE (increases at high RPM) ===
    const turboFreq = 1800 + normSpeed * 2500 + rpmInGear * 800;
    this.turboOsc.frequency.setTargetAtTime(turboFreq, now, 0.08);
    const turboVol = normSpeed > 0.5 ? (normSpeed - 0.5) * 0.04 : 0;
    this.turboGain.gain.setTargetAtTime(turboVol, now, 0.1);

    // === POP & CRACKLE (when lifting off throttle at high speed) ===
    if (!isRevving && normSpeed > 0.4 && Math.random() > 0.96) {
      this._playPopCrackle();
    }

    // === SCREECH ===
    if (isDrifting) {
      this.screechGain.gain.setTargetAtTime(isOnGrass ? 0.015 : 0.04, now, 0.04);
      const jitter = (Math.random() - 0.5) * 100;
      this.screechOsc.frequency.setTargetAtTime((isOnGrass ? 600 : 850) + jitter, now, 0.01);
    } else {
      this.screechGain.gain.setTargetAtTime(0, now, 0.08);
    }

    // === OFF-ROAD NOISE ===
    if (isOnGrass && Math.abs(speed) > 5) {
      const grassVol = 0.01 + normSpeed * 0.06;
      this.noiseGain.gain.setTargetAtTime(grassVol, now, 0.04);
      this._noiseFilter.frequency.setTargetAtTime(200 + Math.sin(Date.now() * 0.05) * 60, now, 0.02);
    } else {
      this.noiseGain.gain.setTargetAtTime(0, now, 0.08);
    }

    // === WIND RUSH ===
    const windVol = normSpeed > 0.25 ? (normSpeed - 0.25) * 0.035 : 0;
    this.windGain.gain.setTargetAtTime(windVol, now, 0.12);
    this.windFilter.frequency.setTargetAtTime(600 + normSpeed * 2000, now, 0.1);
  }

  _playPopCrackle() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.setValueAtTime(1200, now);
    const gain = this.ctx.createGain();
    const dur = 0.04 + Math.random() * 0.06;
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + dur);
  }

  playCrashSound() {
    if (!this.initialized || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;

    // Low frequency impact
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(8, now + 0.5);
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(250, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(filt);
    filt.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.6);

    // Metal crunch noise
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const nFilt = this.ctx.createBiquadFilter();
    nFilt.type = 'bandpass';
    nFilt.frequency.setValueAtTime(900, now);
    nFilt.Q.setValueAtTime(3, now);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.2, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    src.connect(nFilt);
    nFilt.connect(nGain);
    nGain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.35);
  }

  playBeepSound(isHigh = false) {
    if (!this.initialized || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isHigh ? 1500 : 800, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isHigh ? 0.3 : 0.1));
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + (isHigh ? 0.35 : 0.15));
  }

  playWrenchSound() {
    if (!this.initialized || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const dur = 0.12;

    // 3 rapid bursts for pneumatic gun
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.05;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(2200 + i * 400, t);
      filt.Q.setValueAtTime(6, t);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filt);
      filt.connect(gain);
      gain.connect(this.masterGain);
      src.start(t);
      src.stop(t + dur);
    }
  }
}
