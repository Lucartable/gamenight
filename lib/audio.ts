"use client";

export type SfxName =
  | "click"
  | "validate"
  | "reveal"
  | "leaderboard"
  | "scoreUp"
  | "countdown"
  | "urgent"
  | "joined"
  | "roundStart"
  | "roundEnd"
  | "primary"
  | "modalOpen"
  | "avatarPick"
  | "swoosh"
  | "wrong"
  | "tick"
  | "birthday";

interface ToneSpec {
  freq: number;
  durationMs: number;
  type?: OscillatorType;
  gain?: number;
  attackMs?: number;
  decayMs?: number;
  sustain?: number;
  releaseMs?: number;
  vibrato?: number;
  glide?: number;
  noise?: number;
}

interface SfxSpec {
  voices: ToneSpec[];
  spacingMs?: number;
  gain?: number;
}

const SFX_LIBRARY: Record<SfxName, SfxSpec> = {
  click: { voices: [{ freq: 880, durationMs: 60, type: "triangle", gain: 0.18, attackMs: 4, releaseMs: 50 }] },
  validate: {
    voices: [
      { freq: 660, durationMs: 90, type: "sine", gain: 0.22, attackMs: 5, releaseMs: 80 },
      { freq: 880, durationMs: 130, type: "sine", gain: 0.28, attackMs: 5, releaseMs: 120 },
      { freq: 1320, durationMs: 160, type: "triangle", gain: 0.18, attackMs: 8, releaseMs: 150 },
    ],
    spacingMs: 40,
  },
  reveal: {
    voices: [
      { freq: 220, durationMs: 280, type: "sawtooth", gain: 0.18, attackMs: 12, releaseMs: 240, glide: 660 },
      { freq: 660, durationMs: 320, type: "sine", gain: 0.22, attackMs: 18, releaseMs: 280 },
      { freq: 990, durationMs: 380, type: "triangle", gain: 0.16, attackMs: 24, releaseMs: 320 },
    ],
    spacingMs: 60,
  },
  leaderboard: {
    voices: [
      { freq: 392, durationMs: 200, type: "sine", gain: 0.22, attackMs: 10, releaseMs: 180 },
      { freq: 523, durationMs: 220, type: "sine", gain: 0.22, attackMs: 10, releaseMs: 200 },
      { freq: 659, durationMs: 280, type: "triangle", gain: 0.2, attackMs: 12, releaseMs: 260 },
      { freq: 784, durationMs: 360, type: "triangle", gain: 0.22, attackMs: 12, releaseMs: 320 },
    ],
    spacingMs: 90,
  },
  scoreUp: {
    voices: [
      { freq: 523, durationMs: 80, type: "triangle", gain: 0.22, attackMs: 4, releaseMs: 70 },
      { freq: 784, durationMs: 110, type: "triangle", gain: 0.22, attackMs: 4, releaseMs: 100 },
    ],
    spacingMs: 60,
  },
  countdown: { voices: [{ freq: 720, durationMs: 90, type: "square", gain: 0.16, attackMs: 3, releaseMs: 80 }] },
  urgent: { voices: [{ freq: 920, durationMs: 110, type: "square", gain: 0.22, attackMs: 3, releaseMs: 100, vibrato: 18 }] },
  joined: {
    voices: [
      { freq: 660, durationMs: 110, type: "sine", gain: 0.2, attackMs: 4, releaseMs: 95 },
      { freq: 990, durationMs: 140, type: "triangle", gain: 0.22, attackMs: 6, releaseMs: 120 },
    ],
    spacingMs: 50,
  },
  roundStart: {
    voices: [
      { freq: 392, durationMs: 130, type: "triangle", gain: 0.2, attackMs: 6, releaseMs: 110 },
      { freq: 523, durationMs: 150, type: "triangle", gain: 0.22, attackMs: 6, releaseMs: 130 },
      { freq: 784, durationMs: 240, type: "sine", gain: 0.22, attackMs: 8, releaseMs: 220 },
    ],
    spacingMs: 80,
  },
  roundEnd: {
    voices: [
      { freq: 660, durationMs: 180, type: "sine", gain: 0.2, attackMs: 8, releaseMs: 160 },
      { freq: 440, durationMs: 220, type: "sine", gain: 0.18, attackMs: 8, releaseMs: 200 },
    ],
    spacingMs: 90,
  },
  primary: {
    voices: [
      { freq: 523, durationMs: 90, type: "sawtooth", gain: 0.2, attackMs: 4, releaseMs: 80 },
      { freq: 784, durationMs: 120, type: "triangle", gain: 0.22, attackMs: 6, releaseMs: 110 },
    ],
    spacingMs: 35,
  },
  modalOpen: {
    voices: [
      { freq: 880, durationMs: 90, type: "triangle", gain: 0.18, attackMs: 4, releaseMs: 80, glide: 660 },
    ],
  },
  avatarPick: {
    voices: [
      { freq: 990, durationMs: 90, type: "triangle", gain: 0.18, attackMs: 4, releaseMs: 80 },
      { freq: 1320, durationMs: 110, type: "sine", gain: 0.18, attackMs: 4, releaseMs: 100 },
    ],
    spacingMs: 30,
  },
  swoosh: {
    voices: [{ freq: 320, durationMs: 220, type: "sawtooth", gain: 0.16, attackMs: 12, releaseMs: 200, glide: 1100, noise: 0.08 }],
  },
  wrong: {
    voices: [
      { freq: 220, durationMs: 140, type: "square", gain: 0.18, attackMs: 4, releaseMs: 120 },
      { freq: 175, durationMs: 200, type: "square", gain: 0.18, attackMs: 4, releaseMs: 180 },
    ],
    spacingMs: 60,
  },
  tick: { voices: [{ freq: 1500, durationMs: 35, type: "square", gain: 0.1, attackMs: 1, releaseMs: 30 }] },
  birthday: {
    voices: [
      { freq: 784, durationMs: 70, type: "triangle", gain: 0.16, attackMs: 3, releaseMs: 62 },
      { freq: 1175, durationMs: 90, type: "sine", gain: 0.15, attackMs: 4, releaseMs: 80 },
      { freq: 1568, durationMs: 120, type: "triangle", gain: 0.12, attackMs: 5, releaseMs: 110, noise: 0.04 },
    ],
    spacingMs: 34,
    gain: 0.75,
  },
};

interface AudioState {
  ctx: AudioContext | null;
  master: GainNode | null;
  initialized: boolean;
  muted: boolean;
  volumeSfx: number;
  lastPlayedAt: Map<SfxName, number>;
  active: number;
}

const STATE: AudioState = {
  ctx: null,
  master: null,
  initialized: false,
  muted: false,
  volumeSfx: 0.7,
  lastPlayedAt: new Map(),
  active: 0,
};

const MAX_CONCURRENT = 6;
const MIN_SPACING_MS: Partial<Record<SfxName, number>> = {
  click: 80,
  validate: 140,
  joined: 250,
  countdown: 200,
  tick: 60,
  scoreUp: 90,
  urgent: 220,
  birthday: 900,
};

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (STATE.ctx) {
    if (STATE.ctx.state === "suspended") void STATE.ctx.resume();
    return STATE.ctx;
  }
  const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctor) return null;
  try {
    STATE.ctx = new Ctor();
    STATE.master = STATE.ctx.createGain();
    STATE.master.gain.value = STATE.volumeSfx;
    STATE.master.connect(STATE.ctx.destination);
    STATE.initialized = true;
    return STATE.ctx;
  } catch {
    return null;
  }
}

export function primeAudio(): void {
  ensureContext();
}

export function setMuted(muted: boolean): void {
  STATE.muted = muted;
  if (STATE.master) {
    STATE.master.gain.cancelScheduledValues(STATE.ctx?.currentTime ?? 0);
    STATE.master.gain.value = muted ? 0 : STATE.volumeSfx;
  }
}

export function setSfxVolume(volume: number): void {
  const clamped = Math.min(1, Math.max(0, volume));
  STATE.volumeSfx = clamped;
  if (STATE.master && !STATE.muted) {
    STATE.master.gain.value = clamped;
  }
}

export function isAudioReady(): boolean {
  return STATE.initialized;
}

export function playSfx(name: SfxName): void {
  if (STATE.muted) return;
  const ctx = ensureContext();
  if (!ctx || !STATE.master) return;
  const minSpacing = MIN_SPACING_MS[name] ?? 40;
  const last = STATE.lastPlayedAt.get(name) ?? 0;
  const now = performance.now();
  if (now - last < minSpacing) return;
  STATE.lastPlayedAt.set(name, now);
  if (STATE.active >= MAX_CONCURRENT) return;
  const spec = SFX_LIBRARY[name];
  if (!spec) return;
  const startTime = ctx.currentTime + 0.005;
  spec.voices.forEach((voice, index) => {
    const offset = (spec.spacingMs ?? 0) * index;
    scheduleVoice(ctx, voice, startTime + offset / 1000, spec.gain ?? 1);
  });
}

function scheduleVoice(ctx: AudioContext, voice: ToneSpec, startAt: number, masterScale: number): void {
  if (!STATE.master) return;
  STATE.active += 1;
  const osc = ctx.createOscillator();
  osc.type = voice.type ?? "sine";
  osc.frequency.setValueAtTime(voice.freq, startAt);
  if (voice.glide) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, voice.glide), startAt + voice.durationMs / 1000);
  }
  if (voice.vibrato) {
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 18;
    lfoGain.gain.value = voice.vibrato;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(startAt);
    lfo.stop(startAt + voice.durationMs / 1000 + 0.05);
  }
  const gain = ctx.createGain();
  const peak = (voice.gain ?? 0.2) * masterScale;
  const attack = (voice.attackMs ?? 5) / 1000;
  const release = (voice.releaseMs ?? 80) / 1000;
  const totalTime = voice.durationMs / 1000;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + attack);
  gain.gain.setValueAtTime(peak, startAt + Math.max(attack, totalTime - release));
  gain.gain.linearRampToValueAtTime(0, startAt + totalTime);
  osc.connect(gain).connect(STATE.master);
  osc.start(startAt);
  osc.stop(startAt + totalTime + 0.05);
  if (voice.noise && voice.noise > 0) {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * totalTime), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * voice.noise;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = peak * 0.4;
    noise.connect(noiseGain).connect(STATE.master);
    noise.start(startAt);
    noise.stop(startAt + totalTime);
  }
  osc.onended = () => {
    STATE.active = Math.max(0, STATE.active - 1);
    osc.disconnect();
    gain.disconnect();
  };
}

export function playSfxBurst(names: SfxName[], spacingMs = 70): void {
  if (STATE.muted) return;
  let delay = 0;
  for (const name of names) {
    if (delay === 0) {
      playSfx(name);
    } else {
      window.setTimeout(() => playSfx(name), delay);
    }
    delay += spacingMs;
  }
}
