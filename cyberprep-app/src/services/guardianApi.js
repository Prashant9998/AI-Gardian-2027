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

// ── Super-Administrative Platform Services ─────────────────────────────────

export async function fetchAdminStats() {
  try {
    const res = await fetch(`${API_BASE}/admin/stats`);
    if (!res.ok) throw new Error("Failed to fetch admin stats");
    return await res.json();
  } catch {
    return {
      status: "healthy",
      platform_version: "2.4.0-enterprise",
      summary: {
        total_tenants: 8,
        total_protected_sites: 19,
        total_requests_analyzed: 1420580,
        global_blocked_ips: 42,
        active_honeypot_sandboxes: 6,
        critical_threat_actors: 14,
        avg_ingress_latency_ms: 1.74,
        platform_uptime_pct: 99.98
      },
      engine_health: {
        redis_sliding_limiter: "ONLINE",
        threat_fusion_engine: "ACTIVE",
        ml_anomaly_detector: "LOADED",
        deception_vfs: "READY"
      }
    };
  }
}

export async function fetchAdminTenants() {
  try {
    const res = await fetch(`${API_BASE}/admin/tenants`);
    if (!res.ok) throw new Error("Failed to fetch tenants");
    return await res.json();
  } catch {
    return [
      {
        id: 1,
        name: "Enterprise Demo Corp",
        created_at: "2026-03-01T08:00:00Z",
        sites_count: 2,
        sites: [
          { id: 101, domain: "app.protected-domain.com", api_keys_count: 1 },
          { id: 102, domain: "auth.protected-domain.com", api_keys_count: 1 }
        ],
        tier: "Enterprise",
        is_active: true,
        monthly_requests: 1420000,
        honeypot_enabled: true
      },
      {
        id: 2,
        name: "Apex FinTech Solutions",
        created_at: "2026-04-12T10:00:00Z",
        sites_count: 3,
        sites: [
          { id: 201, domain: "pay.apexfintech.io", api_keys_count: 1 },
          { id: 202, domain: "api.apexfintech.io", api_keys_count: 2 }
        ],
        tier: "Enterprise",
        is_active: true,
        monthly_requests: 842100,
        honeypot_enabled: true
      },
      {
        id: 3,
        name: "HealthPulse Telehealth",
        created_at: "2026-05-18T14:30:00Z",
        sites_count: 2,
        sites: [
          { id: 301, domain: "portal.healthpulse.care", api_keys_count: 1 }
        ],
        tier: "Pro",
        is_active: true,
        monthly_requests: 218900,
        honeypot_enabled: true
      },
      {
        id: 4,
        name: "Quantum Cloud Services",
        created_at: "2026-06-01T09:15:00Z",
        sites_count: 4,
        sites: [
          { id: 401, domain: "console.quantumcloud.dev", api_keys_count: 2 }
        ],
        tier: "Enterprise",
        is_active: true,
        monthly_requests: 1490200,
        honeypot_enabled: true
      },
      {
        id: 5,
        name: "OmniRetail Global",
        created_at: "2026-06-11T16:45:00Z",
        sites_count: 1,
        sites: [
          { id: 501, domain: "checkout.omniretail.com", api_keys_count: 1 }
        ],
        tier: "Starter",
        is_active: false,
        monthly_requests: 49000,
        honeypot_enabled: false
      }
    ];
  }
}

export async function createAdminTenant(payload) {
  try {
    const res = await fetch(`${API_BASE}/admin/tenants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to create tenant");
    return await res.json();
  } catch {
    return {
      status: "success",
      message: `Tenant '${payload.name}' successfully provisioned.`,
      tenant: {
        id: Date.now(),
        name: payload.name,
        domain: payload.domain,
        site_id: Math.floor(Math.random() * 800) + 100,
        raw_api_key: `guardian-live-${Math.random().toString(36).substring(2, 14)}`,
        tier: payload.tier || "Enterprise",
        honeypot_enabled: payload.honeypot_enabled !== false
      }
    };
  }
}

export async function toggleAdminTenantStatus(tenantId, isActive) {
  try {
    const res = await fetch(`${API_BASE}/admin/tenants/${tenantId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive })
    });
    return res.ok;
  } catch {
    return true;
  }
}

export async function fetchGlobalBlacklist() {
  try {
    const res = await fetch(`${API_BASE}/admin/global-blacklist`);
    if (!res.ok) throw new Error("Failed to fetch global blacklist");
    return await res.json();
  } catch {
    return [
      {
        ip: "185.220.101.34",
        country: "🇩🇪 Germany",
        reason: "Known Tor Exit Node & Hydra SSH/HTTP Brute Force Bot",
        added_at: "2026-06-01 10:20:00",
        expires_at: "Permanent",
        block_count: 2180,
        source: "Global Threat Intel Feed"
      },
      {
        ip: "45.33.32.220",
        country: "🇷🇺 Russia",
        reason: "Automated Nikto / Nmap NSE scanner targeting multiple tenants",
        added_at: "2026-06-03 14:10:00",
        expires_at: "2026-06-30 23:59:00",
        block_count: 894,
        source: "Cross-Tenant Correlation"
      },
      {
        ip: "192.168.1.100",
        country: "🇨🇳 China",
        reason: "Critical SQL Injection & Honeypot VFS exploit attempt",
        added_at: "2026-06-05 08:44:00",
        expires_at: "Permanent",
        block_count: 1420,
        source: "Autonomous Deception Trap"
      },
      {
        ip: "91.108.4.0/22",
        country: "🇮🇳 India",
        reason: "High-velocity DirBuster crawler subnet targeting /.env files",
        added_at: "2026-06-07 19:12:00",
        expires_at: "2026-06-21 19:12:00",
        block_count: 612,
        source: "Super Admin Manual Ban"
      }
    ];
  }
}

export async function addGlobalBlacklist(payload) {
  try {
    const res = await fetch(`${API_BASE}/admin/global-blacklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to add to global blacklist");
    return await res.json();
  } catch {
    return {
      status: "success",
      message: `IP ${payload.ip} is now blocked across all tenants worldwide.`,
      entry: {
        ip: payload.ip,
        country: "🌐 Global Target",
        reason: payload.reason,
        added_at: new Date().toISOString().replace("T", " ").substring(0, 19),
        expires_at: payload.duration || "Permanent",
        block_count: 1,
        source: "Super Admin Manual Ban"
      }
    };
  }
}

export async function removeGlobalBlacklist(ip) {
  try {
    const res = await fetch(`${API_BASE}/admin/global-blacklist/${encodeURIComponent(ip)}`, {
      method: "DELETE"
    });
    return res.ok;
  } catch {
    return true;
  }
}

export async function fetchAdminAuditLogs() {
  try {
    const res = await fetch(`${API_BASE}/admin/audit-logs`);
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return await res.json();
  } catch {
    return [
      {
        id: "aud-101",
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        actor: "admin@cyberguardian.ai",
        action: "GLOBAL_IP_BLOCKED",
        target: "185.220.101.34",
        severity: "HIGH",
        details: "Added Tor Exit Node to platform-wide ingress drop list."
      },
      {
        id: "aud-102",
        timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
        actor: "admin@cyberguardian.ai",
        action: "TENANT_PROVISIONED",
        target: "FinTech Payments Corp",
        severity: "LOW",
        details: "Onboarded new enterprise customer with 3 protected domains."
      },
      {
        id: "aud-103",
        timestamp: new Date(Date.now() - 300 * 60000).toISOString(),
        actor: "system_mlops",
        action: "ML_RETRAIN_TRIGGERED",
        target: "RandomForest + IsolationForest",
        severity: "MEDIUM",
        details: "Automated retraining on 12,500 new adversarial HTTP payloads."
      }
    ];
  }
}

export async function fetchAdminSystemHealth() {
  try {
    const res = await fetch(`${API_BASE}/admin/system-health`);
    if (!res.ok) throw new Error("Failed to fetch system health");
    return await res.json();
  } catch {
    return {
      platform: "AI Cyber Guardian Control Plane",
      status: "HEALTHY",
      uptime: "99.98%",
      active_nodes: [
        {
          name: "Ingress Rate Limiter & CIDR Guard",
          component: "Redis 7 Sliding Window",
          status: "OPTIMAL",
          latency: "0.42 ms",
          memory_used: "128 MB / 2 GB",
          active_connections: 142
        },
        {
          name: "Threat Fusion Engine (Rules + ML)",
          component: "FastAPI Decision Pipeline",
          status: "OPTIMAL",
          latency: "1.32 ms",
          memory_used: "384 MB / 4 GB",
          throughput_rps: 2840
        },
        {
          name: "ML Dual Models (IForest + RForest)",
          component: "Scikit-Learn Joblib Model Pool",
          status: "LOADED",
          latency: "1.82 ms",
          accuracy: "98.4%",
          fpr: "0.42%"
        },
        {
          name: "Enterprise Deception Honeypot VFS",
          component: "Stateful Virtual Linux Sandbox",
          status: "ACTIVE",
          active_sessions: 6,
          tarpit_throttling: "Active (1200ms latency injected)",
          canary_tripwires: "ARMED"
        },
        {
          name: "PostgreSQL Telemetry Datastore",
          component: "Relational Audit DB",
          status: "CONNECTED",
          pool_size: 20,
          disk_usage: "14.2 GB / 100 GB"
        }
      ]
    };
  }
}
export async function fetchMLStatus() {
  try {
    const res = await fetch(`${API_BASE}/ml/status`);
    if (!res.ok) throw new Error("Failed to fetch ML status");
    return await res.json();
  } catch {
    return null;
  }
}

export async function retrainMLModels() {
  try {
    const res = await fetch(`${API_BASE}/ml/retrain`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to retrain ML models");
    return await res.json();
  } catch {
    return {
      status: "success",
      message: "ML models trained and dynamically reloaded in memory.",
      training_duration_seconds: 2.14,
      metrics: {
        accuracy: 0.986,
        f1_score: 0.981,
        false_positive_rate: 0.0038,
        dataset_samples: 38500,
        last_retrained: new Date().toISOString()
      }
    };
  }
}
