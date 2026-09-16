/**
 * Guardian Control Plane API Service
 * Connects to http://localhost:8000 when active, or gracefully provides mock fallbacks.
 */

const API_BASE = "http://localhost:8000/api/v1";

export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`http://localhost:8000/health`, { credentials: "omit", signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchLiveEvents() {
  try {
    const res = await fetch(`${API_BASE}/reporting/events?limit=50`);
    if (!res.ok) throw new Error("Failed to fetch events");
    return await res.json();
  } catch {
    return null; // Fallback to simulated events
  }
}

export async function fetchLiveTrends() {
  try {
    const res = await fetch(`${API_BASE}/reporting/trends`);
    if (!res.ok) throw new Error("Failed to fetch trends");
    return await res.json();
  } catch {
    return null;
  }
}

export async function blockIP(ip, reason) {
  try {
    const res = await fetch(`${API_BASE}/firewall/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, reason })
    });
    return res.ok;
  } catch {
    return true; // Local simulation success
  }
}

export async function unblockIP(ip) {
  try {
    const res = await fetch(`${API_BASE}/firewall/unblock/${encodeURIComponent(ip)}`, {
      method: "DELETE"
    });
    return res.ok;
  } catch {
    return true; // Local simulation success
  }
}
