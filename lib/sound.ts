import type { Sentiment } from "./types";

/**
 * Tiny Web Audio "sound design" helper. All cues are synthesized on the fly so
 * there are no audio assets to ship. Safe to call on the server (no-ops).
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
  if (value) ensureContext();
}

export function isSoundEnabled() {
  return enabled;
}

/** Soft filtered-noise whoosh. */
export function playWhoosh(intensity = 0.5) {
  if (!enabled) return;
  const ac = ensureContext();
  if (!ac || !master) return;

  const duration = 0.55 + intensity * 0.5;
  const bufferSize = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const src = ac.createBufferSource();
  src.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(300, ac.currentTime);
  filter.frequency.exponentialRampToValueAtTime(1800 + intensity * 2200, ac.currentTime + duration * 0.6);
  filter.frequency.exponentialRampToValueAtTime(220, ac.currentTime + duration);
  filter.Q.value = 0.8;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18 + intensity * 0.18, ac.currentTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);

  src.connect(filter).connect(gain).connect(master);
  src.start();
  src.stop(ac.currentTime + duration);
}

/** Short bell/blip whose pitch tracks sentiment. */
export function playChime(sentiment: Sentiment) {
  if (!enabled) return;
  const ac = ensureContext();
  if (!ac || !master) return;

  const freqs: Record<Sentiment, number[]> = {
    positive: [523.25, 659.25, 783.99],
    negative: [220, 196, 174.61],
    neutral: [329.63, 392, 440],
  };
  const notes = freqs[sentiment];
  notes.forEach((f, idx) => {
    const t0 = ac.currentTime + idx * 0.06;
    const osc = ac.createOscillator();
    osc.type = sentiment === "negative" ? "sawtooth" : "sine";
    osc.frequency.value = f;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    osc.connect(gain).connect(master!);
    osc.start(t0);
    osc.stop(t0 + 0.55);
  });
}

/** Subtle hover tick. */
export function playRipple() {
  if (!enabled) return;
  const ac = ensureContext();
  if (!ac || !master) return;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1320, ac.currentTime + 0.12);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, ac.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
  osc.connect(gain).connect(master);
  osc.start();
  osc.stop(ac.currentTime + 0.2);
}
