"use client";

// Drop royalty free tracks into public/audio and list them here (for example "/audio/track-1.mp3").
// When the list is empty an original loop is generated in the browser instead.
export const VERSUS_TRACKS: string[] = [];

const MUTE_KEY = "mikon.versus-muted";
const BPM = 104;
const STEP = 60 / BPM / 2;
const CHORDS = [
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [48, 55, 60, 64],
  [55, 59, 62, 67],
];
const ARP = [0, 2, 1, 3, 2, 1, 3, 2];
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextTime = 0;
let step = 0;
let noise: AudioBuffer | null = null;
let track: HTMLAudioElement | null = null;

export const isMuted = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
};

function tone(type: OscillatorType, freq: number, at: number, dur: number, peak: number, cutoff?: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  if (cutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    osc.connect(filter).connect(gain);
  } else osc.connect(gain);
  gain.connect(master);
  osc.start(at);
  osc.stop(at + dur + 0.05);
  return osc;
}

function kick(at: number) {
  const osc = tone("sine", 140, at, 0.28, 0.9);
  osc?.frequency.exponentialRampToValueAtTime(42, at + 0.18);
}

function hat(at: number, peak: number) {
  if (!ctx || !master || !noise) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
  src.connect(filter).connect(gain).connect(master);
  src.start(at);
  src.stop(at + 0.06);
}

function schedule() {
  if (!ctx) return;
  while (nextTime < ctx.currentTime + 0.25) {
    const bar = Math.floor(step / 8) % CHORDS.length;
    const beat = step % 8;
    const chord = CHORDS[bar];
    if (beat === 0) chord.forEach((n) => tone("sawtooth", hz(n), nextTime, STEP * 8, 0.035, 900));
    if (beat % 2 === 0) kick(nextTime);
    hat(nextTime, beat % 2 ? 0.09 : 0.04);
    if (beat !== 3 && beat !== 7) tone("triangle", hz(chord[0] - 24), nextTime, STEP * 0.9, 0.28);
    tone("square", hz(chord[ARP[beat]] + 12), nextTime, STEP * 0.8, 0.045, 2400);
    nextTime += STEP;
    step++;
  }
}

export function startMusic() {
  if (typeof window === "undefined" || isMuted()) return;
  if (VERSUS_TRACKS.length) {
    track ??= new Audio(VERSUS_TRACKS[Math.floor(Math.random() * VERSUS_TRACKS.length)]);
    track.loop = true;
    track.volume = 0.5;
    track.play().catch(() => null);
    return;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  ctx.resume().catch(() => null);
  master!.gain.cancelScheduledValues(ctx.currentTime);
  master!.gain.setValueAtTime(0.0001, ctx.currentTime);
  master!.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 1.2);
  if (timer) return;
  nextTime = ctx.currentTime + 0.08;
  step = 0;
  schedule();
  timer = setInterval(schedule, 60);
}

export function stopMusic() {
  if (track) {
    track.pause();
    track.currentTime = 0;
  }
  if (timer) clearInterval(timer);
  timer = null;
  if (ctx && master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    const c = ctx;
    setTimeout(() => !timer && c.suspend().catch(() => null), 500);
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {}
  if (muted) stopMusic();
  else startMusic();
}
