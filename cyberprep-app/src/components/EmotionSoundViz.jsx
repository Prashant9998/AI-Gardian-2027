import { useEffect, useRef, useState } from "react";
import { isSoundEnabled, toggleSound, playClickSound } from "../utils/soundEngine";

export default function EmotionSoundViz() {
  const canvasRef = useRef(null);
  const [enabled, setEnabled] = useState(isSoundEnabled());
  const animFrameId = useRef(null);

  const handleToggle = () => {
    playClickSound();
    const next = toggleSound();
    setEnabled(next);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;
    const barCount = 4;
    const barWidth = 3;
    const gap = 2;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < barCount; i++) {
        let height = 3;
        if (enabled) {
          // Dynamic wave oscillation
          const s = Math.sin(phase + i * 1.2);
          const c = Math.cos(phase * 1.5 + i * 0.8);
          height = Math.max(3, Math.abs(s * 7 + c * 4) + 3);
        }

        const x = i * (barWidth + gap) + 2;
        const y = canvas.height - height;

        ctx.fillStyle = enabled ? "#9047ff" : "rgba(144, 71, 255, 0.35)";
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 1.5);
        ctx.fill();
      }

      phase += 0.12;
      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [enabled]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="sound-viz-container group"
      title={enabled ? "Mute Sound (Web Audio FX)" : "Unmute Sound (Web Audio FX)"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        outline: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        width={24}
        height={16}
        style={{ display: "block" }}
      />
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace, sans-serif",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: enabled ? "#9047ff" : "var(--muted)",
          transition: "color 0.2s ease",
        }}
      >
        {enabled ? "SFX ON" : "MUTED"}
      </span>
    </button>
  );
}
