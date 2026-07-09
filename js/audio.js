'use strict';
// ─── Ses: WebAudio ile prosedürel efektler + mini chiptune ───
const Sfx = {
  ctx: null,
  muted: false,
  musicGain: null,
  musicTimer: null,
  step: 0,
  nextStepTime: 0,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.14;
      this.musicGain.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
    try { this.muted = localStorage.getItem('rs_mute') === '1'; } catch (e) {}
  },

  setMute(m) {
    this.muted = m;
    try { localStorage.setItem('rs_mute', m ? '1' : '0'); } catch (e) {}
    if (this.musicGain) this.musicGain.gain.value = m ? 0 : 0.14;
  },

  tone(f0, f1, dur, type, vol, delay) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise(dur, vol, fc, delay) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + (delay || 0);
    const len = Math.max(1, (dur * this.ctx.sampleRate) | 0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = fc || 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.ctx.destination);
    src.start(t);
  },

  // XP toplama perde merdiveni: art arda toplandıkça tiz ve tatlı
  pickupLadder(streak) {
    if (!this.ctx || this.muted) return;
    const f = 660 * Math.pow(2, Math.min(streak, 24) / 12);
    this.tone(f, f * 1.5, 0.05, 'square', 0.05);
  },

  // kombo eşiği sesi: kombo büyüdükçe akor tizleşir
  comboTier(tier) {
    if (!this.ctx || this.muted) return;
    const base = 440 * Math.pow(1.12, Math.min(tier, 10));
    this.tone(base, base, 0.08, 'square', 0.09);
    this.tone(base * 1.5, base * 1.5, 0.1, 'square', 0.08, 0.06);
  },

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'click':    this.tone(660, 880, 0.05, 'square', 0.08); break;
      case 'select':   this.tone(440, 880, 0.09, 'square', 0.1); break;
      case 'pickup':   this.tone(880, 1320, 0.06, 'square', 0.06); break;
      case 'coin':     this.tone(988, 988, 0.05, 'square', 0.07); this.tone(1319, 1319, 0.09, 'square', 0.07, 0.05); break;
      case 'heart':    this.tone(523, 784, 0.15, 'sine', 0.12); break;
      case 'levelup':  [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.12, 'square', 0.1, i * 0.07)); break;
      case 'hurt':     this.noise(0.18, 0.14, 800); this.tone(180, 60, 0.2, 'sawtooth', 0.12); break;
      case 'dodge':    this.tone(700, 1100, 0.08, 'triangle', 0.08); break;
      case 'die':      this.noise(0.1, 0.08, 1600); this.tone(240, 70, 0.12, 'square', 0.06); break;
      case 'hit':      this.noise(0.04, 0.05, 2200); break;
      case 'suplex':   this.noise(0.15, 0.16, 400); this.tone(90, 40, 0.18, 'sine', 0.2); break;
      case 'wave':     this.tone(587, 880, 0.18, 'sine', 0.09); break;
      case 'burp':     this.tone(95, 42, 0.3, 'sawtooth', 0.16); this.noise(0.22, 0.05, 300); break;
      case 'puff':     this.noise(0.3, 0.07, 500); break;
      case 'horn':     this.tone(392, 392, 0.12, 'square', 0.11); this.tone(523, 523, 0.18, 'square', 0.11, 0.1); break;
      case 'box':      this.noise(0.08, 0.12, 700); this.tone(140, 70, 0.1, 'triangle', 0.1); break;
      case 'question': this.tone(330, 660, 0.14, 'sine', 0.08); break;
      case 'chest':    [392, 494, 587, 784].forEach((f, i) => this.tone(f, f, 0.14, 'square', 0.1, i * 0.09)); break;
      case 'boss':     this.tone(220, 110, 0.4, 'sawtooth', 0.14); this.tone(233, 117, 0.4, 'sawtooth', 0.14, 0.05); break;
      case 'zimba':    this.tone(1200, 700, 0.04, 'square', 0.07); this.noise(0.03, 0.05, 3000); break;
      case 'mail':     this.tone(700, 1400, 0.12, 'sine', 0.06); this.tone(900, 1600, 0.1, 'sine', 0.05, 0.06); break;
      case 'evolve':   [392, 494, 587, 784, 988, 1175].forEach((f, i) => this.tone(f, f * 1.01, 0.16, 'square', 0.11, i * 0.08)); break;
      case 'explode':  this.noise(0.35, 0.2, 500); this.tone(120, 35, 0.35, 'sawtooth', 0.16); break;
      case 'dash':     this.noise(0.12, 0.1, 900); this.tone(300, 600, 0.1, 'triangle', 0.06); break;
      case 'teleport': this.tone(880, 180, 0.22, 'sine', 0.1); this.noise(0.15, 0.06, 1500); break;
      case 'ready':    this.tone(784, 1175, 0.1, 'sine', 0.07); this.tone(1175, 1175, 0.08, 'sine', 0.05, 0.09); break;
      case 'nova':     this.tone(220, 880, 0.2, 'triangle', 0.12); this.noise(0.15, 0.08, 2000); break;
      case 'break':    this.noise(0.1, 0.14, 900); this.tone(200, 90, 0.08, 'triangle', 0.08); break;
      case 'bomb':     this.noise(0.5, 0.24, 400); this.tone(100, 30, 0.5, 'sawtooth', 0.18); break;
      case 'shield':   this.tone(392, 784, 0.16, 'sine', 0.1); this.tone(784, 784, 0.1, 'sine', 0.06, 0.14); break;
      case 'magnet':   this.tone(300, 1200, 0.25, 'sine', 0.09); break;
      case 'turbo':    this.tone(220, 880, 0.18, 'sawtooth', 0.08); break;
      case 'mission':  [659, 784, 988].forEach((f, i) => this.tone(f, f, 0.12, 'square', 0.1, i * 0.08)); break;
      case 'tick':     this.tone(1000, 900, 0.04, 'square', 0.06); break;
      case 'bigslam':  this.noise(0.25, 0.2, 300); this.tone(70, 30, 0.3, 'sine', 0.24); break;
      case 'akin':     this.tone(440, 220, 0.25, 'square', 0.1); this.tone(440, 220, 0.25, 'square', 0.1, 0.28); break;
      case 'win':      [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f, 0.2, 'square', 0.11, i * 0.12)); break;
      case 'over':     [392, 330, 262, 196].forEach((f, i) => this.tone(f, f, 0.25, 'triangle', 0.12, i * 0.18)); break;
    }
  },

  // ── basit 8'lik adım sekansörü ──
  intensity: 0,   // 0: sakin, 1: tehlike (boss/akın) - tempo yükselir
  BASS: [110, 110, 0, 110, 87.31, 87.31, 0, 98,
         130.81, 130.81, 0, 130.81, 98, 98, 110, 0],
  ARP:  [220, 261.63, 329.63, 261.63, 174.61, 220, 261.63, 220,
         261.63, 329.63, 392, 329.63, 196, 246.94, 293.66, 246.94],

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.schedule(), 60);
  },

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  },

  schedule() {
    if (!this.ctx) return;
    // tehlike anlarında tempo yükselir, ekstra hi-hat girer
    const STEP_DUR = this.intensity > 0 ? 0.19 : 0.24;
    while (this.nextStepTime < this.ctx.currentTime + 0.15) {
      const t = this.nextStepTime;
      const i = this.step % 16;
      if (!this.muted) {
        const b = this.BASS[i];
        if (b) this.mnote(b, t, 0.22, 'triangle', 0.5);
        if (this.step % 2 === 0) this.mnote(this.ARP[i] * 2, t, 0.1, 'square', 0.12);
        if (i % 4 === 2) this.mhat(t);
        if (this.intensity > 0 && i % 4 === 0) this.mhat(t);
        if (this.intensity > 0 && i % 8 === 4) this.mnote(this.ARP[i] * 4, t, 0.08, 'square', 0.07);
      }
      this.nextStepTime += STEP_DUR;
      this.step++;
    }
  },

  mnote(f, t, dur, type, vol) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.musicGain);
    o.start(t); o.stop(t + dur + 0.02);
  },

  mhat(t) {
    const len = (0.03 * this.ctx.sampleRate) | 0;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.connect(f); f.connect(g); g.connect(this.musicGain);
    src.start(t);
  }
};
