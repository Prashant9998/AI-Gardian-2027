export default function EmotionGridOverlay({ visible = false }) {
  if (!visible) return null;

  return (
    <div className="app-grid" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="app-grid__col relative">
          <span
            style={{
              position: "absolute",
              top: "12px",
              left: "6px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "9px",
              fontWeight: 700,
              color: "rgba(144, 71, 255, 0.45)",
              letterSpacing: "0.1em",
            }}
          >
            COL {String(i + 1).padStart(2, "0")}
          </span>
        </div>
      ))}
    </div>
  );
}
