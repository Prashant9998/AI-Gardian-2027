import { useEffect, useRef, useState, useCallback } from "react";
import { playChirpSound } from "../utils/soundEngine";
import "./EmotionPreloader.css";

const TICKS = 56;
const MARK_EVERY = 8;

const KF = [
  [0, 0],
  [0.045, 9],
  [0.115, 9.6],
  [0.16, 22],
  [0.205, 23],
  [0.30, 38],
  [0.345, 39.5],
  [0.40, 53],
  [0.475, 54],
  [0.545, 68],
  [0.60, 69],
  [0.665, 81],
  [0.735, 82],
  [0.80, 92],
  [0.855, 93],
  [0.925, 99],
  [0.985, 99.4],
  [1.0, 100],
];

const RUN = 8600;
const HOLD = 1600;

const PHASES = [
  [0, "INITIALIZING CORE SYSTEMS"],
  [24, "ESTABLISHING SECURE UPLINK"],
  [52, "SYNCHRONIZING NODE ARRAY"],
  [78, "DECRYPTING PAYLOAD STREAM"],
  [100, "UPLINK ESTABLISHED"],
];

const easeOut = (x) => 1 - Math.pow(1 - x, 2.1);

const valueAt = (u) => {
  if (u >= 1) return 100;
  for (let i = 0; i < KF.length - 1; i++) {
    const [t0, v0] = KF[i];
    const [t1, v1] = KF[i + 1];
    if (u <= t1) return v0 + (v1 - v0) * easeOut((u - t0) / (t1 - t0));
  }
  return 100;
};

const phaseFor = (p) => {
  let t = PHASES[0][1];
  for (const [k, v] of PHASES) {
    if (p >= k) t = v;
  }
  return t;
};

export default function EmotionPreloader({ onComplete }) {
  const [isClosing, setIsClosing] = useState(false);
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const plateRef = useRef(null);
  const numRef = useRef(null);
  const readoutRef = useRef(null);
  const dotsRef = useRef(null);
  const hazeRef = useRef(null);
  const statRef = useRef(null);
  const grainRef = useRef(null);
  const grain2Ref = useRef(null);
  const tickRefs = useRef([]);
  const hasFinishedRef = useRef(false);
  const chirpPlayedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    if (!chirpPlayedRef.current) {
      chirpPlayedRef.current = true;
      try {
        playChirpSound();
      } catch {
        // audio context suppressed
      }
    }
    setIsClosing(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 500);
  }, [onComplete]);

  useEffect(() => {
    // ── 1. Scale fitting ──
    const fit = () => {
      if (rootRef.current) {
        const s = Math.min(window.innerWidth / 1200, window.innerHeight / 800);
        rootRef.current.style.setProperty("--s", String(s));
      }
    };
    window.addEventListener("resize", fit, { passive: true });
    fit();

    // ── 2. ESC key skip handler ──
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleFinish();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // ── 3. Noise Grain generation ──
    try {
      const N = 160;
      const make = (fn) => {
        const c = document.createElement("canvas");
        c.width = c.height = N;
        const ctx = c.getContext("2d");
        if (!ctx) return "";
        const img = ctx.createImageData(N, N);
        const d = img.data;
        for (let i = 0; i < N * N; i++) fn(d, i * 4);
        ctx.putImageData(img, 0, 0);
        return c.toDataURL();
      };
      const g = () =>
        (Math.random() + Math.random() + Math.random() + Math.random()) / 4;

      if (grainRef.current) {
        grainRef.current.style.backgroundImage = `url(${make((d, o) => {
          const v = 128 + (g() - 0.5) * 300;
          d[o] = d[o + 1] = d[o + 2] = Math.max(0, Math.min(255, v));
          d[o + 3] = 255;
        })})`;
      }
      if (grain2Ref.current) {
        grain2Ref.current.style.backgroundImage = `url(${make((d, o) => {
          const v = Math.random();
          d[o] = d[o + 1] = d[o + 2] = 255;
          d[o + 3] = v < 0.86 ? 0 : Math.round(((v - 0.86) / 0.14) * 190);
        })})`;
      }
    } catch {
      // Canvas generation fallback
    }

    // ── 4. Progress timeline loop ──
    const FREEZE =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("p")
        : null;

    const barW = 604;
    const tickW = 5.4;
    const gap = (barW - TICKS * tickW) / (TICKS - 1);
    const pitch = tickW + gap;

    const start = performance.now();
    let lastLit = -1;
    let lastPct = -1;
    let lastDots = -1;
    let lastPhase = "";
    let animId = null;

    function frame(now) {
      if (hasFinishedRef.current) return;

      const elapsed = now - start;

      let pct = 0;
      let visible = true;

      if (elapsed < RUN) {
        pct = valueAt(elapsed / RUN);
      } else if (elapsed < RUN + HOLD) {
        pct = 100;
        if (!chirpPlayedRef.current) {
          chirpPlayedRef.current = true;
          try {
            playChirpSound();
          } catch {
            // Audio error suppressed
          }
        }
      } else {
        // Sequence completed successfully
        handleFinish();
        return;
      }

      if (FREEZE !== null) {
        pct = +FREEZE;
        visible = true;
      }

      const shown = Math.round(pct);
      if (shown !== lastPct) {
        if (numRef.current) numRef.current.textContent = String(shown);
        lastPct = shown;

        const ph = phaseFor(shown);
        if (ph !== lastPhase) {
          lastPhase = ph;
          if (statRef.current && statRef.current.firstChild) {
            statRef.current.firstChild.nodeValue = ph;
          }
        }
      }

      if (readoutRef.current) {
        readoutRef.current.style.opacity = visible ? "" : "0.22";
      }

      const lit = Math.round((pct / 100) * TICKS);
      if (lit !== lastLit) {
        for (let i = 0; i < TICKS; i++) {
          const t = tickRefs.current[i];
          if (!t) continue;
          const on = i < lit;
          if (t.classList.contains("on") !== on) {
            t.classList.toggle("on", on);
          }
        }

        if (lit > lastLit && lastLit >= 0 && lit > 0) {
          const h = tickRefs.current[lit - 1];
          if (h) {
            h.classList.remove("flash");
            void h.offsetWidth;
            h.classList.add("flash");
          }
          if (hazeRef.current) {
            hazeRef.current.classList.remove("pulse");
            void hazeRef.current.offsetWidth;
            hazeRef.current.classList.add("pulse");
          }
        }

        if (hazeRef.current) {
          hazeRef.current.style.setProperty(
            "--lit-w",
            `${lit > 0 ? (lit - 1) * pitch + tickW + gap / 2 : 0}px`
          );
        }

        if (lit === TICKS && plateRef.current) {
          plateRef.current.classList.remove("hit");
          void plateRef.current.offsetWidth;
          plateRef.current.classList.add("hit");
        }

        lastLit = lit;
      }

      const d =
        shown >= 100
          ? 0
          : FREEZE !== null
          ? 3
          : Math.floor(((now - start) / 380) % 4);

      if (d !== lastDots) {
        if (dotsRef.current) {
          dotsRef.current.textContent = "...".slice(0, d);
        }
        lastDots = d;
      }

      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleFinish]);

  return (
    <div
      className={`sys-link-loader ${isClosing ? "closing" : ""}`}
      ref={rootRef}
      role="progressbar"
      aria-label="System Link Uplink Sequence"
    >
      <div className="pool" />

      {/* Skip button for rapid access */}
      <button
        type="button"
        className="sys-link-skip-btn"
        onClick={handleFinish}
        title="Skip uplink sequence (Press Esc)"
      >
        SKIP [ESC]
      </button>

      <div className="scene">
        <div className="stage" ref={stageRef} id="stage">
          <div className="haze">
            <i ref={hazeRef} id="haze" />
          </div>

          <div className="plate" ref={plateRef} id="plate" />
          <div className="brk tr" />
          <div className="brk bl" />
          <div className="readout" ref={readoutRef}>
            <b ref={numRef} id="num">
              0
            </b>
            <u>%</u>
          </div>

          <div className="barlabel">UPLINK</div>
          <div className="bar" ref={barRef} id="bar">
            {Array.from({ length: TICKS }).map((_, i) => (
              <i
                key={i}
                ref={(el) => (tickRefs.current[i] = el)}
                className={`tick ${(i + 1) % MARK_EVERY === 0 ? "mk" : ""}`}
              />
            ))}
          </div>
          <div className="status" ref={statRef}>
            INITIALIZING CORE SYSTEMS
            <span className="dots" ref={dotsRef} id="dots">
              ...
            </span>
          </div>

          <div className="marker m-tl">
            <i className="h a-h" />
            <i className="v a-v" />
            <i className="h b-h" />
            <i className="v b-v" />
            <i className="h c-h" />
            <i className="v c-v" />
            <i className="h d-h" />
            <i className="v d-v" />
            <i className="dia" />
          </div>
          <div className="marker m-tr">
            <i className="h a-h" />
            <i className="v a-v" />
            <i className="h b-h" />
            <i className="v b-v" />
            <i className="h c-h" />
            <i className="v c-v" />
            <i className="h d-h" />
            <i className="v d-v" />
            <i className="dia" />
          </div>
          <div className="marker m-bl">
            <i className="h a-h" />
            <i className="v a-v" />
            <i className="h b-h" />
            <i className="v b-v" />
            <i className="h c-h" />
            <i className="v c-v" />
            <i className="h d-h" />
            <i className="v d-v" />
            <i className="dia" />
          </div>
          <div className="marker m-br">
            <i className="h a-h" />
            <i className="v a-v" />
            <i className="h b-h" />
            <i className="v b-v" />
            <i className="h c-h" />
            <i className="v c-v" />
            <i className="h d-h" />
            <i className="v d-v" />
            <i className="dia" />
          </div>

          <div className="rail left">
            <div className="wire" />
            <div className="cap a" />
            <div className="cap b" />
            <div className="mod">
              <div className="hatch" />
              <div className="ret" />
              <div className="dot" />
              <div className="slab" />
              <i className="led" />
              <i className="led" />
              <i className="led" />
              <i className="led" />
            </div>
          </div>
          <div className="rail right">
            <div className="wire" />
            <div className="cap a" />
            <div className="cap b" />
            <div className="mod">
              <div className="hatch" />
              <div className="ret" />
              <div className="dot" />
              <div className="slab" />
              <i className="led" />
              <i className="led" />
              <i className="led" />
              <i className="led" />
            </div>
          </div>
        </div>
      </div>

      <div className="scan" />
      <div className="grain mul" ref={grainRef} id="grain" />
      <div className="grain add" ref={grain2Ref} id="grain2" />
    </div>
  );
}
