"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Robust game-audio hook for Next.js / React
 * - Single shared AudioContext across all consumers
 * - Graceful handling of autoplay policies (requires one-time user gesture)
 * - Background music via <audio> with fallback to WebAudio ambient pad
 * - Clean up of all nodes and HTMLAudioElements
 * - Fade-in/out and visibility handling
 */

// ===== Module-level singletons so multiple hook consumers share the same resources
let sharedAudioCtx: AudioContext | null = null;
let bgAudioEl: HTMLAudioElement | null = null;
let championAudioEl: HTMLAudioElement | null = null;
let championStartToken = 0; // cancel in-flight play() when stopping/toggling
let ambientState: {
  gain: GainNode;
  filter: BiquadFilterNode;
  osc: OscillatorNode[]; // [osc1, osc2, lfo]
  lfoGain: GainNode;
} | null = null;

export type EffectType = "question" | "correct" | "incorrect" | "timeout" | "tick";
export type BackgroundTrack = "energy" | "mystery";

// ===== Utilities
function getCtx(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const Ctx: typeof AudioContext | undefined =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
    const ctx = sharedAudioCtx!;
    return ctx;
  } catch {
    return null;
  }
}

/** Ensure context is resumed (should be called on a user gesture). */
async function resumeCtx() {
  const ctx = getCtx();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch {}
  }
  return ctx;
}

function disconnectNode(node?: AudioNode | null) {
  try { node?.disconnect(); } catch {}
}

function safeStopOsc(osc?: OscillatorNode | null) {
  if (!osc) return;
  try {
    // onended ensures GC by disconnecting all connections
    const outs = [...(osc as any).context ? (osc as any).context.destination ? [] : [] : []];
    osc.onended = () => {
      try { osc.disconnect(); } catch {}
    };
    osc.stop();
  } catch {}
}

function fadeGain(g: GainNode, to: number, seconds: number) {
  const ctx = g.context;
  const now = ctx.currentTime;
  try {
    g.gain.cancelScheduledValues(now);
    const from = Math.max(0.0001, g.gain.value || 0.0001);
    g.gain.setValueAtTime(from, now);
    if (to === 0) {
      g.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.01, seconds));
    } else {
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, to), now + Math.max(0.01, seconds));
    }
  } catch {}
}

// ===== Ambient pad (WebAudio fallback)
function stopAmbient() {
  if (!ambientState) return;
  const { gain, osc, lfoGain, filter } = ambientState;
  // Fade out before stopping
  fadeGain(gain, 0, 0.3);
  setTimeout(() => {
    try {
      osc.forEach(o => { try { o.stop(); } catch {} });
    } finally {
      osc.forEach(o => disconnectNode(o));
      disconnectNode(lfoGain);
      disconnectNode(filter);
      disconnectNode(gain);
      ambientState = null;
    }
  }, 350);
}

function startAmbient() {
  const ctx = getCtx();
  if (!ctx) return false;
  stopAmbient();

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1200, ctx.currentTime);
  filter.connect(gain);
  gain.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(220, ctx.currentTime);
  osc1.connect(filter);

  const osc2 = ctx.createOscillator();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(440, ctx.currentTime);
  osc2.connect(filter);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
  lfoGain.gain.setValueAtTime(60, ctx.currentTime);
  lfo.connect(lfoGain);
  // Modulate filter cutoff
  (lfoGain as any).connect((filter as any).frequency);

  osc1.start();
  osc2.start();
  lfo.start();

  fadeGain(gain, 0.06, 1.2);

  ambientState = { gain, filter, osc: [osc1, osc2, lfo], lfoGain };
  return true;
}

// ===== Hook
export function useGameAudio() {
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [bgTrack, setBgTrack] = useState<BackgroundTrack>("energy");
  const [isBgPlaying, setIsBgPlaying] = useState(false);
  const [championPlaying, setChampionPlaying] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false); // user-gesture unlock

  const stateRef = useRef({ musicEnabled, isBgPlaying });
  stateRef.current.musicEnabled = musicEnabled;
  stateRef.current.isBgPlaying = isBgPlaying;

  // One-time unlock (call from any click/touch in your app)
  const unlock = useCallback(async () => {
    const ctx = await resumeCtx();
    if (!ctx) return false;
    setIsUnlocked(true);
    return true;
  }, []);

  // Small helper to play short effects and then disconnect
  const playEffect = useCallback((type: EffectType) => {
    if (!stateRef.current.musicEnabled) return;
    const ctx = getCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t0 = ctx.currentTime;
    switch (type) {
      case "question":
        osc.frequency.setValueAtTime(440, t0);
        osc.frequency.setValueAtTime(554.37, t0 + 0.1);
        osc.frequency.setValueAtTime(659.25, t0 + 0.2);
        gain.gain.setValueAtTime(0.3, t0);
        fadeGain(gain, 0, 0.5);
        osc.start(t0); osc.stop(t0 + 0.5);
        break;
      case "correct":
        osc.frequency.setValueAtTime(523.25, t0);
        osc.frequency.setValueAtTime(659.25, t0 + 0.1);
        osc.frequency.setValueAtTime(783.99, t0 + 0.2);
        gain.gain.setValueAtTime(0.4, t0);
        fadeGain(gain, 0, 0.8);
        osc.start(t0); osc.stop(t0 + 0.8);
        break;
      case "incorrect":
        osc.frequency.setValueAtTime(392, t0);
        osc.frequency.setValueAtTime(349.23, t0 + 0.2);
        osc.frequency.setValueAtTime(311.13, t0 + 0.4);
        gain.gain.setValueAtTime(0.3, t0);
        fadeGain(gain, 0, 0.6);
        osc.start(t0); osc.stop(t0 + 0.6);
        break;
      case "timeout":
        osc.frequency.setValueAtTime(800, t0);
        gain.gain.setValueAtTime(0.2, t0);
        [0.1, 0.2].forEach((dt) => {
          gain.gain.setValueAtTime(0.2, t0 + dt);
          gain.gain.setValueAtTime(0, t0 + dt + 0.1);
        });
        osc.start(t0); osc.stop(t0 + 0.3);
        break;
      case "tick":
        osc.frequency.setValueAtTime(1000, t0);
        gain.gain.setValueAtTime(0.1, t0);
        fadeGain(gain, 0, 0.1);
        osc.start(t0); osc.stop(t0 + 0.1);
        break;
    }

    osc.onended = () => {
      disconnectNode(osc);
      disconnectNode(gain);
    };
  }, []);

  const stopBackground = useCallback((quick = false) => {
    // Fade out ambient or <audio> first, then stop/cleanup
    if (bgAudioEl) {
      try {
        const el = bgAudioEl;
        const targetVol = 0.0001;
        const dur = quick ? 120 : 300; // ms
        const step = 16;
        const startVol = el.volume;
        let t = 0;
        const id = setInterval(() => {
          t += step;
          const p = Math.min(1, t / dur);
          el.volume = startVol + (targetVol - startVol) * p;
          if (p >= 1) {
            clearInterval(id);
            try { el.pause(); } catch {}
            try { el.currentTime = 0; } catch {}
            bgAudioEl = null;
            setIsBgPlaying(false);
          }
        }, step);
      } catch {
        try { bgAudioEl.pause(); } catch {}
        try { bgAudioEl.currentTime = 0; } catch {}
        bgAudioEl = null;
        setIsBgPlaying(false);
      }
    }

    // Ambient
    if (ambientState) {
      const { gain } = ambientState;
      fadeGain(gain, 0, quick ? 0.05 : 0.25);
      setTimeout(() => { stopAmbient(); setIsBgPlaying(false); }, quick ? 80 : 280);
    } else if (!bgAudioEl) {
      setIsBgPlaying(false);
    }
  }, []);

  const startBackground = useCallback(async () => {
    if (!musicEnabled || stateRef.current.isBgPlaying) return;
    // Try to ensure ctx is resumed (no-op if already)
    await resumeCtx();

    // 1) Try file-based music first
    try {
      const el = new Audio(`/sounds/${bgTrack}.mp3`);
      el.loop = true;
      el.volume = 0.08;
      // On iOS/macOS Safari this may still throw until a user gesture unlock
      await el.play();
      bgAudioEl = el;
      setIsBgPlaying(true);
      return;
    } catch {}

    // 2) Fallback to ambient WebAudio (will only work post-unlock)
    if (startAmbient()) {
      setIsBgPlaying(true);
    }
  }, [bgTrack, musicEnabled]);

  // replace existing stopChampionMusic with this
  const stopChampionMusic = useCallback((force: boolean = false) => {
    // Invalidate any ongoing start attempts
    championStartToken++;
    if (!championAudioEl) { setChampionPlaying(false); return; }

    try {
      // Always pause immediately (timers can be throttled on Safari/background)
      championAudioEl.muted = true;
      try { championAudioEl.volume = 0; } catch {}
      championAudioEl.pause();
    } catch {}

    try {
      // Reset playback head
      championAudioEl.currentTime = 0;
    } catch {}

    // Nuke the source so nothing can restart accidentally
    try {
      championAudioEl.removeAttribute('src');
      // Some browsers need load() after removing src to detach the stream
      championAudioEl.load();
    } catch {}

    // Drop reference
    championAudioEl = null;
    setChampionPlaying(false);
  }, []);

  const startChampionMusic = useCallback(async () => {
    if (!musicEnabled) return;
    await resumeCtx();
    // Ensure any existing element is fully stopped and detached
    stopChampionMusic();
    const myToken = ++championStartToken;
    try {
      const el = new Audio("/sounds/champion.mp3");
      el.loop = true;
      el.volume = 0.12;
      await el.play();
      // If another stop/start happened while awaiting, abort attaching
      if (myToken !== championStartToken || !musicEnabled) {
        try { el.pause(); } catch {}
        return;
      }
      championAudioEl = el;
      setChampionPlaying(true);
    } catch {}
  }, [musicEnabled, stopChampionMusic]);


  // React to musicEnabled toggles
  useEffect(() => {
    if (!musicEnabled) { stopBackground(true); stopChampionMusic(); }
  }, [musicEnabled, stopBackground, stopChampionMusic]);

  // Page visibility: pause background (HTMLAudio) when hidden; resume when visible
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        try { bgAudioEl?.pause(); } catch {}
      } else if (document.visibilityState === "visible") {
        if (bgAudioEl && stateRef.current.musicEnabled) {
          bgAudioEl.play().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      stopBackground(true);
      stopChampionMusic();
      // Do NOT close sharedAudioCtx; other hook users may still need it
    };
  }, [stopBackground, stopChampionMusic]);

  return {
    // state
    musicEnabled, setMusicEnabled,
    bgTrack, setBgTrack,
    isBgPlaying,
    championPlaying,
    isUnlocked,

    // actions
    unlock, // call this once on a user gesture (e.g., click) to unlock audio
    playEffect,
    startBackground,
    stopBackground,
    startChampionMusic,
    stopChampionMusic,
  };
}

export default useGameAudio;
