import { playClickSound } from "../utils/soundEngine";

export default function EmotionSettingsModal({
  isOpen,
  onClose,
  theme,
  setTheme,
  soundEnabled,
  setSoundEnabled,
  gridVisible,
  setGridVisible,
}) {
  if (!isOpen) return null;

  const handleThemeChange = (newTheme) => {
    playClickSound();
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleSoundToggle = () => {
    playClickSound();
    setSoundEnabled(!soundEnabled);
  };

  const handleGridToggle = () => {
    playClickSound();
    setGridVisible(!gridVisible);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "flex-start",
        padding: "4.5rem 1.5rem 1.5rem 1.5rem",
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="apple-spring-open"
        style={{
          width: "320px",
          backgroundColor: "var(--card)",
          border: "1px solid rgba(144, 71, 255, 0.35)",
          borderRadius: "1.5rem",
          padding: "1.25rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(144, 71, 255, 0.2)",
          backdropFilter: "blur(20px)",
          color: "var(--foreground)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
            paddingBottom: "0.75rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "16px" }}>⚙️</span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              EXPERIENCE SETTINGS
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "16px",
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Setting 1: Theme Switcher */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
            }}
          >
            Theme Aesthetic
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            {[
              { id: "emotion", name: "Violet", color: "#9047ff" },
              { id: "dark", name: "Obsidian", color: "#21262d" },
              { id: "light", name: "Light", color: "#ffffff" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeChange(t.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  padding: "0.5rem",
                  borderRadius: "0.75rem",
                  border:
                    theme === t.id
                      ? "2px solid var(--primary)"
                      : "1px solid var(--border)",
                  backgroundColor:
                    theme === t.id
                      ? "rgba(144, 71, 255, 0.18)"
                      : "rgba(255, 255, 255, 0.04)",
                  cursor: "pointer",
                  color: "var(--foreground)",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    backgroundColor: t.color,
                    border: "1px solid rgba(255, 255, 255, 0.4)",
                  }}
                />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Setting 2: Interactive Sound Engine */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 0",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Sound Synthesis (SFX)
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
              Web Audio clicks & threat chimes
            </div>
          </div>
          <button
            type="button"
            onClick={handleSoundToggle}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "9999px",
              border: soundEnabled
                ? "1px solid #9047ff"
                : "1px solid var(--border)",
              backgroundColor: soundEnabled
                ? "rgba(144, 71, 255, 0.25)"
                : "transparent",
              color: soundEnabled ? "#9047ff" : "var(--muted)",
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            {soundEnabled ? "ENABLED" : "MUTED"}
          </button>
        </div>

        {/* Setting 3: 12-Column Architectural Grid */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 0",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              12-Col Design Grid
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
              Emotion Agency alignment overlay
            </div>
          </div>
          <button
            type="button"
            onClick={handleGridToggle}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "9999px",
              border: gridVisible
                ? "1px solid #9047ff"
                : "1px solid var(--border)",
              backgroundColor: gridVisible
                ? "rgba(144, 71, 255, 0.25)"
                : "transparent",
              color: gridVisible ? "#9047ff" : "var(--muted)",
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            {gridVisible ? "SHOWN" : "HIDDEN"}
          </button>
        </div>

        {/* Footer info */}
        <div
          style={{
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px dashed var(--border)",
            textAlign: "center",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "10px",
            color: "var(--muted)",
          }}
        >
          EMOTION AGENCY DESIGN ARCHITECTURE v2.0
        </div>
      </div>
    </div>
  );
}
