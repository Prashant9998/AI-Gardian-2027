import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Native Web Audio API sound synthesizer for critical SOC threat alerts.
 * Generates an instant high-tech dual chime without external audio files.
 */
export function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: High alert harmonic
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Tone 2: Tactical second chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318.51, now + 0.1); // E6
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.25); // A6
    gain2.gain.setValueAtTime(0.25, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);
  } catch (err) {
    console.warn("Audio chime playback error:", err);
  }
}

/**
 * useThreatStream
 * Connects directly to the FastAPI WebSocket server (/api/v1/ws/threats).
 * Provides sub-100ms real-time attack event streaming with auto-reconnection and exponential backoff.
 */
export function useThreatStream({
  onEvent,
  enabled = true,
  url = "ws://localhost:8000/api/v1/ws/threats",
} = {}) {
  const [status, setStatus] = useState("disconnected"); // 'connected' | 'connecting' | 'disconnected'
  const [lastPing, setLastPing] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const backoffRef = useRef(1000); // Start with 1s
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!enabled) return;

    // Avoid duplicate connection attempts
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus("connecting");

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        backoffRef.current = 1000; // Reset backoff on success
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "PONG") {
            setLastPing(Date.now());
            return;
          }

          if (data.type === "CONNECTION_ESTABLISHED") {
            return;
          }

          if (data.event_type === "THREAT_EVENT" || data.type === "THREAT_EVENT" || data.score !== undefined) {
            if (onEventRef.current) {
              onEventRef.current(data);
            }
          }
        } catch (e) {
          console.error("Error parsing WebSocket threat frame:", e);
        }
      };

      ws.onerror = (err) => {
        console.warn("Threat WebSocket error:", err);
        // Will trigger onclose next
      };

      ws.onclose = (evt) => {
        setStatus("disconnected");
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        if (enabled) {
          const nextBackoff = Math.min(backoffRef.current * 1.5, 10000);
          backoffRef.current = nextBackoff;
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, nextBackoff);
        }
      };
    } catch (e) {
      console.warn("Failed to initiate WebSocket connection:", e);
      setStatus("disconnected");
    }
  }, [enabled, url]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else if (wsRef.current) {
      wsRef.current.close();
      setStatus("disconnected");
    }

    // Ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 15000);

    return () => {
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect]);

  return {
    status,
    isConnected: status === "connected",
    lastPing,
    reconnect: () => {
      backoffRef.current = 1000;
      if (wsRef.current) wsRef.current.close();
      connect();
    }
  };
}

export default useThreatStream;
