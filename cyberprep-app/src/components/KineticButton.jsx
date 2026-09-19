import { playHoverSound, playClickSound } from "../utils/soundEngine";

export default function KineticButton({
  children,
  onClick,
  icon,
  variant = "primary",
  disabled = false,
  style = {},
  className = "",
  title,
}) {
  const handleMouseEnter = () => {
    if (!disabled) {
      playHoverSound();
    }
  };

  const handleClick = (e) => {
    if (!disabled) {
      playClickSound();
      if (onClick) onClick(e);
    }
  };

  const getVariantStyles = () => {
    if (variant === "outline") {
      return {
        background: "transparent",
        color: "var(--foreground)",
        border: "1px solid var(--border)",
      };
    }
    if (variant === "danger") {
      return {
        background: "#ff3b30",
        color: "#fff",
        border: "1px solid rgba(255, 59, 48, 0.4)",
      };
    }
    if (variant === "secondary") {
      return {
        background: "rgba(144, 71, 255, 0.12)",
        color: "#9047ff",
        border: "1px solid rgba(144, 71, 255, 0.3)",
      };
    }
    // Default primary
    return {
      background: "linear-gradient(135deg, #9047ff 0%, #7114ff 100%)",
      color: "#ffffff",
      border: "1px solid rgba(255, 255, 255, 0.25)",
      boxShadow: "0 4px 16px rgba(144, 71, 255, 0.35)",
    };
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      disabled={disabled}
      title={title}
      className={`kinetic-btn group ${className}`}
      style={{
        padding: "0.625rem 1.25rem",
        fontSize: "0.8125rem",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...getVariantStyles(),
        ...style,
      }}
    >
      <div className="kinetic-btn__content">
        <span className="kinetic-btn__sub-1">
          {icon && <span>{icon}</span>}
          <span>{children}</span>
        </span>
        <span className="kinetic-btn__sub-2">
          {icon && <span>{icon}</span>}
          <span>{children}</span>
        </span>
      </div>
      <div className="kinetic-btn__shadow" />
    </button>
  );
}
