/**
 * Web Audio API Sound Engine & Synthesizer
 * Inspired by Emotion Agency's interactive audio design.
 * Generates tactile clicks, subtle harmonic hover blips, and threat alert chimes
 * entirely via the browser Web Audio API with zero external audio assets.
 */

let audioCtx = null;
let soundEnabled = true;

// Load saved sound preference
try {
  const saved = localStorage.getItem("emotion_sound_enabled");
  if (saved !== null) {
    soundEnabled = saved === "true";
  }
} catch {
  // localStorage not available
}

function getContext() {
  if (!audioCtx && typeof window !== "undefined") {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  try {
    localStorage.setItem("emotion_sound_enabled", String(enabled));
  } catch {
    // localStorage not available
  }
  if (enabled) {
    playChirpSound();
  }
}

export function toggleSound() {
  setSoundEnabled(!soundEnabled);
  return soundEnabled;
}

/**
 * Tactile micro-click sound for UI buttons and switches
 */
export function playClickSound() {
  if (!soundEnabled) return;
  const ctx = getContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // AudioContext error suppressed
  }
}

/**
 * Subtle harmonic hover blip
 */
export function playHoverSound() {
  if (!soundEnabled) return;
  const ctx = getContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch {
    // AudioContext error suppressed
  }
}

/**
 * Harmonic confirmation chord (e.g. toggle on, mode activated)
 */
export function playChirpSound() {
  if (!soundEnabled) return;
  const ctx = getContext();
  if (!ctx) return;

  try {
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.03);

      gain.gain.setValueAtTime(0.05, ctx.currentTime + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.03 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.03);
      osc.stop(ctx.currentTime + i * 0.03 + 0.16);
    });
  } catch {
    // AudioContext error suppressed
  }
}

/**
 * Dual-tone security threat siren
 */
export function playThreatAlarm(severity = "HIGH") {
  if (!soundEnabled) return;
  const ctx = getContext();
  if (!ctx) return;

  try {
    const isCritical = severity === "CRITICAL";
    const baseFreq = isCritical ? 880 : 660;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(baseFreq, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // AudioContext error suppressed
  }
}
