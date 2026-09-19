import { useState, useEffect } from "react";
import { playChirpSound } from "../utils/soundEngine";

export default function EmotionPreloader({ onComplete }) {
  const [percent, setPercent] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [statusText, setStatusText] = useState("Initializing neural threat matrix");

  useEffect(() => {
    const statuses = [
      "Hydrating dual-engine models (Random Forest + Isolation Forest)",
      "Syncing in-memory Linux VFS & Canary Honeytokens",
      "Connecting real-time WebSocket telemetry stream",
      "Perimeter defense grid online",
    ];

    let currentPercent = 0;
    const interval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 8) + 4;
      if (currentPercent >= 100) {
        currentPercent = 100;
        setPercent(100);
        setStatusText("Defense matrix ready");
        clearInterval(interval);
        playChirpSound();

        setTimeout(() => {
          setHidden(true);
          if (onComplete) onComplete();
        }, 500);
      } else {
        setPercent(currentPercent);
        const idx = Math.min(
          Math.floor((currentPercent / 100) * statuses.length),
          statuses.length - 1
        );
        setStatusText(statuses[idx]);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [onComplete]);

  if (hidden) return null;

  return (
    <div
      className={`emotion-preloader ${percent === 100 ? "emotion-preloader--hidden" : ""}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "#080511",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "380px", width: "100%", textAlign: "center" }}>
        {/* Brand Shield Icon */}
        <div
          style={{
            width: "56px",
            height: "56px",
            margin: "0 auto 1.5rem auto",
            borderRadius: "16px",
            background: "radial-gradient(circle at 40% 30%, #c084fc, #9047ff 60%, #581c87)",
            boxShadow: "0 0 35px rgba(144, 71, 255, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "26px",
          }}
        >
          🛡️
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: "'PP Neue Montreal', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: "1.25rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#ffffff",
            marginBottom: "0.5rem",
          }}
        >
          AI CYBER GUARDIAN
        </div>

        {/* Progress percent counter (Emotion Agency style) */}
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "2.5rem",
            fontWeight: 700,
            color: "#9047ff",
            letterSpacing: "0.05em",
            margin: "1rem 0",
          }}
        >
          {String(percent).padStart(3, "0")}%
        </div>

        {/* Linear progress bar */}
        <div
          style={{
            width: "100%",
            height: "3px",
            backgroundColor: "rgba(144, 71, 255, 0.2)",
            borderRadius: "2px",
            overflow: "hidden",
            position: "relative",
            margin: "1rem 0",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${percent}%`,
              background: "linear-gradient(90deg, #9047ff, #00e5ff)",
              boxShadow: "0 0 10px #9047ff",
              transition: "width 0.1s linear",
            }}
          />
        </div>

        {/* Status text */}
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.75rem",
            color: "rgba(224, 212, 252, 0.75)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            minHeight: "1.5em",
          }}
        >
          {statusText}...
        </div>
      </div>
    </div>
  );
}
