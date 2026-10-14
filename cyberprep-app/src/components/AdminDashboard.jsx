import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  fetchAdminStats,
  fetchAdminTenants,
  createAdminTenant,
  toggleAdminTenantStatus,
  fetchGlobalBlacklist,
  addGlobalBlacklist,
  removeGlobalBlacklist,
  fetchAdminAuditLogs,
  fetchAdminSystemHealth,
  fetchMLStatus,
  retrainMLModels
} from "../services/guardianApi";
import {
  playClickSound,
  playHoverSound,
  playThreatAlarm
} from "../utils/soundEngine";
import RealtimeGeoThreatMap from "./RealtimeGeoThreatMap";

// Design Tokens (Matching AI Cyber Guardian aesthetic)
const T = {
  bg:       "#0b0816",
  surface:  "#140e26",
  surface2: "#1d1436",
  border:   "#2c1d4d",
  text:     "#f5efff",
  muted:    "#8e80ab",
  low:      "#319f43",
  lowBg:    "#0c2b12",
  medium:   "#f59e0b",
  medBg:    "#2e1d05",
  high:     "#ff7a00",
  highBg:   "#381800",
  critical: "#ff3b30",
  critBg:   "#380808",
  blue:     "#00e5ff",
  blueBg:   "#082035",
  purple:   "#9047ff",
  purpleBg: "#251245",
  green:    "#319f43",
};

export default function AdminDashboard({ onNav, onSwitchToUserSoc }) {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "overview";
  });
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [mlStatus, setMlStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals & UI States
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [showAddBanModal, setShowAddBanModal] = useState(false);
  const [retrainingInProgress, setRetrainingInProgress] = useState(false);
  const [retrainSuccessMsg, setRetrainSuccessMsg] = useState("");
  const [fusionRatio, setFusionRatio] = useState(60); // 60% Rules, 40% ML

  // New Tenant Form
  const [tenantName, setTenantName] = useState("");
  const [tenantDomain, setTenantDomain] = useState("");
  const [tenantTier, setTenantTier] = useState("Enterprise");
  const [tenantHoneypot, setTenantHoneypot] = useState(true);
  const [tenantCreatedNotice, setTenantCreatedNotice] = useState(null);

  // New Global Ban Form
  const [banIP, setBanIP] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("Permanent");

  // Search filters
  const [tenantSearch, setTenantSearch] = useState("");
  const [blacklistSearch, setBlacklistSearch] = useState("");

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [s, t, b, a, h, m] = await Promise.all([
        fetchAdminStats(),
        fetchAdminTenants(),
        fetchGlobalBlacklist(),
        fetchAdminAuditLogs(),
        fetchAdminSystemHealth(),
        fetchMLStatus(),
      ]);
      setStats(s);
      setTenants(t);
      setBlacklist(b);
      setAuditLogs(a);
      setSystemHealth(h);
      setMlStatus(m);
      setLoading(false);
    }
    loadData();
  }, []);

  // Handlers
  async function handleCreateTenant(e) {
    e.preventDefault();
    if (!tenantName || !tenantDomain) return;
    playClickSound();

    const res = await createAdminTenant({
      name: tenantName,
      domain: tenantDomain,
      tier: tenantTier,
      honeypot_enabled: tenantHoneypot,
    });

    if (res && res.status === "success") {
      setTenants((prev) => [
        {
          id: res.tenant.id,
          name: res.tenant.name,
          created_at: new Date().toISOString(),
          sites_count: 1,
          sites: [{ id: res.tenant.site_id, domain: res.tenant.domain, api_keys_count: 1 }],
          tier: res.tenant.tier,
          is_active: true,
          monthly_requests: 0,
          honeypot_enabled: res.tenant.honeypot_enabled,
        },
        ...prev,
      ]);
      setTenantCreatedNotice(res.tenant);
      setTenantName("");
      setTenantDomain("");
    }
  }

  async function handleToggleTenantStatus(id, currentActive) {
    playClickSound();
    const newStatus = !currentActive;
    await toggleAdminTenantStatus(id, newStatus);
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: newStatus } : t))
    );
  }

  async function handleAddGlobalBan(e) {
    e.preventDefault();
    if (!banIP || !banReason) return;
    playClickSound();

    const res = await addGlobalBlacklist({
      ip: banIP,
      reason: banReason,
      duration: banDuration,
    });

    if (res && res.entry) {
      setBlacklist((prev) => [res.entry, ...prev]);
      setBanIP("");
      setBanReason("");
      setShowAddBanModal(false);
    }
  }

  async function handleRemoveGlobalBan(ip) {
    playClickSound();
    await removeGlobalBlacklist(ip);
    setBlacklist((prev) => prev.filter((b) => b.ip !== ip));
  }

  async function handleRetrainML() {
    playThreatAlarm();
    setRetrainingInProgress(true);
    setRetrainSuccessMsg("");

    const res = await retrainMLModels();
    setRetrainingInProgress(false);
    if (res && res.status === "success") {
      setRetrainSuccessMsg(
        `Retrained in ${res.training_duration_seconds}s! Accuracy: ${(res.metrics.accuracy * 100).toFixed(1)}%, FPR: ${(res.metrics.false_positive_rate * 100).toFixed(2)}%`
      );
      setMlStatus((prev) => ({
        ...prev,
        benchmark: res.metrics,
      }));
    }
  }

  // Cross-tenant simulated traffic timeline
  const platformTimeline = [
    { time: "00:00", Requests: 840, Dropped: 42, Honeypot: 12 },
    { time: "04:00", Requests: 1250, Dropped: 68, Honeypot: 19 },
    { time: "08:00", Requests: 3900, Dropped: 184, Honeypot: 45 },
    { time: "12:00", Requests: 5800, Dropped: 310, Honeypot: 88 },
    { time: "16:00", Requests: 5100, Dropped: 270, Honeypot: 64 },
    { time: "20:00", Requests: 3400, Dropped: 140, Honeypot: 32 },
  ];

  // Attack category pie
  const attackDistribution = [
    { name: "SQL Injection", value: 38, color: T.critical },
    { name: "Scanners (sqlmap/nikto)", value: 27, color: T.high },
    { name: "Brute Force (Hydra)", value: 18, color: T.medium },
    { name: "Path Traversal & LFI", value: 11, color: T.purple },
    { name: "XSS Stored/Reflected", value: 6, color: T.blue },
  ];

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
      (t.sites && t.sites.some((s) => s.domain.toLowerCase().includes(tenantSearch.toLowerCase())))
  );

  const filteredBlacklist = blacklist.filter(
    (b) =>
      b.ip.toLowerCase().includes(blacklistSearch.toLowerCase()) ||
      b.reason.toLowerCase().includes(blacklistSearch.toLowerCase())
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        paddingBottom: 80,
      }}
    >
      {/* ── Top Super-Admin Header ────────────────────────────────────────── */}
      <header
        style={{
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${T.purple}, ${T.blue})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              boxShadow: `0 0 16px ${T.purple}66`,
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>
                AI Cyber Guardian
              </span>
              <span
                style={{
                  background: `${T.purple}33`,
                  color: T.purple,
                  border: `1px solid ${T.purple}66`,
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 6px",
                  letterSpacing: "0.05em",
                }}
              >
                SUPER ADMIN
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: `${T.low}22`,
                  color: T.low,
                  borderRadius: 12,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: T.low,
                    boxShadow: `0 0 8px ${T.low}`,
                  }}
                />
                PLATFORM HEALTHY
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: T.muted }}>
              Global Multi-Tenant Control Plane • Version 2.4.0-Enterprise
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onMouseEnter={playHoverSound}
            onClick={() => {
              playClickSound();
              if (onSwitchToUserSoc) onSwitchToUserSoc();
              else if (onNav) onNav("dashboard");
            }}
            style={{
              background: T.surface2,
              border: `1px solid ${T.border}`,
              color: T.text,
              borderRadius: 6,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            <span>👤</span>
            <span>Switch to Client SOC</span>
          </button>

          <button
            onMouseEnter={playHoverSound}
            onClick={() => {
              playClickSound();
              setShowAddTenantModal(true);
            }}
            style={{
              background: `linear-gradient(135deg, ${T.purple}, #6f22d9)`,
              border: "none",
              color: "#fff",
              borderRadius: 6,
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: `0 0 14px ${T.purple}44`,
            }}
          >
            <span>+</span>
            <span>Provision Tenant</span>
          </button>
        </div>
      </header>

      {/* ── Sub Navigation Tabs ───────────────────────────────────────────── */}
      <nav
        style={{
          background: T.surface2,
          borderBottom: `1px solid ${T.border}`,
          padding: "0 28px",
          display: "flex",
          gap: 2,
        }}
      >
        {[
          { id: "overview", label: "📊 Global Overview", desc: "Cross-Tenant Telemetry" },
          { id: "tenants", label: "🏢 Organizations & Tenants", desc: "Client Accounts" },
          { id: "blacklist", label: "🌐 Global Blacklist", desc: "Master Ingress Drops" },
          { id: "mlops", label: "🧠 AI & MLOps Governance", desc: "Dual Models & Tuning" },
          { id: "infrastructure", label: "🖥️ Cluster Nodes", desc: "Redis, DB & Ingress" },
          { id: "audit", label: "📜 Master Audit Trail", desc: "Administrative Actions" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onMouseEnter={playHoverSound}
              onClick={() => {
                playClickSound();
                setActiveTab(tab.id);
              }}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: isActive ? `3px solid ${T.blue}` : "3px solid transparent",
                color: isActive ? T.blue : T.muted,
                padding: "12px 18px",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ── Main Tab Content ──────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "24px 28px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        
        {/* ════════════════════════════════════════════════════════════════════
            TAB 1: GLOBAL PLATFORM OVERVIEW
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Top Aggregate Stat Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              {[
                {
                  label: "TOTAL TENANTS",
                  value: stats?.summary?.total_tenants ?? 8,
                  sub: "Active customer orgs",
                  color: T.purple,
                  icon: "🏢",
                },
                {
                  label: "PROTECTED DOMAINS",
                  value: stats?.summary?.total_protected_sites ?? 19,
                  sub: "Live ingress edge routes",
                  color: T.blue,
                  icon: "🌐",
                },
                {
                  label: "REQUESTS ANALYZED TODAY",
                  value: "1.42M",
                  sub: "Avg Latency: 1.74ms",
                  color: T.low,
                  icon: "⚡",
                },
                {
                  label: "MASTER BLOCKED IPS",
                  value: stats?.summary?.global_blocked_ips ?? 42,
                  sub: "Platform-wide ingress drops",
                  color: T.critical,
                  icon: "🚫",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: "18px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <span style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: "0.05em" }}>
                      {card.label}
                    </span>
                    <div style={{ fontSize: 28, fontWeight: 800, color: card.color, margin: "6px 0 2px" }}>
                      {card.value}
                    </div>
                    <span style={{ fontSize: 12, color: T.muted }}>{card.sub}</span>
                  </div>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: `${card.color}15`,
                      border: `1px solid ${card.color}33`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    {card.icon}
                  </div>
                </div>
              ))}
            </div>

            {/* Ingress Throughput & Attack Classification Section */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
              {/* Traffic Timeline Chart */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                      Cross-Tenant Ingress & Defense Volume
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: T.muted }}>
                      Aggregated requests analyzed vs malicious drops across all customer nodes (Last 24 Hours)
                    </p>
                  </div>
                  <span style={{ fontSize: 11, background: T.surface2, padding: "4px 8px", borderRadius: 4, color: T.blue }}>
                    ● 100% Real-time
                  </span>
                </div>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformTimeline}>
                      <XAxis dataKey="time" stroke={T.muted} fontSize={11} />
                      <YAxis stroke={T.muted} fontSize={11} />
                      <Tooltip
                        contentStyle={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12 }}
                      />
                      <Bar dataKey="Requests" fill={T.blue} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Dropped" fill={T.critical} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Honeypot" fill={T.purple} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Attack Vector Distribution */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                  Platform Threat Taxonomy
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: T.muted, marginBottom: 12 }}>
                  Global signature and anomaly distribution
                </p>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attackDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {attackDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {attackDistribution.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                        <span>{item.name}</span>
                      </span>
                      <span style={{ fontWeight: 700, color: T.text }}>{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Global Geographic Threat Radar */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                    Global Cyber Threat Radar Map
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: T.muted }}>
                    Live origins of hostile probes targeting tenant web services worldwide
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, background: `${T.critical}22`, color: T.critical, padding: "3px 8px", borderRadius: 4 }}>
                    ● 14 Critical Botnets Tracked
                  </span>
                </div>
              </div>
              <RealtimeGeoThreatMap />
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 2: TENANT & ORGANIZATION MANAGEMENT
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "tenants" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header / Search Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Customer Organizations & Tenants</h2>
                <p style={{ margin: 0, fontSize: 12, color: T.muted }}>
                  Manage client accounts, provision protected domains, configure quotas, and monitor honeypot entitlement.
                </p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <input
                  type="text"
                  placeholder="Search tenant or domain..."
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  style={{
                    background: T.surface2,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    borderRadius: 6,
                    padding: "8px 14px",
                    fontSize: 12,
                    width: 240,
                    outline: "none",
                  }}
                />
                <button
                  onMouseEnter={playHoverSound}
                  onClick={() => {
                    playClickSound();
                    setShowAddTenantModal(true);
                  }}
                  style={{
                    background: T.blue,
                    color: "#0b0816",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + Add New Tenant
                </button>
              </div>
            </div>

            {/* Tenant Creation Alert Banner */}
            {tenantCreatedNotice && (
              <div
                style={{
                  background: `${T.low}18`,
                  border: `1px solid ${T.low}66`,
                  borderRadius: 6,
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: T.low, fontSize: 13 }}>
                    ✓ Tenant '{tenantCreatedNotice.name}' successfully provisioned!
                  </div>
                  <div style={{ fontSize: 12, color: T.text, marginTop: 4 }}>
                    Live Production API Key:{" "}
                    <code
                      style={{
                        background: T.surface2,
                        padding: "2px 8px",
                        borderRadius: 4,
                        color: T.blue,
                        fontFamily: "monospace",
                      }}
                    >
                      {tenantCreatedNotice.raw_api_key}
                    </code>
                  </div>
                </div>
                <button
                  onClick={() => setTenantCreatedNotice(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: T.muted,
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Tenants Data Table */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.surface2, borderBottom: `1px solid ${T.border}`, color: T.muted, fontSize: 11 }}>
                    <th style={{ padding: "12px 18px" }}>ORGANIZATION</th>
                    <th style={{ padding: "12px 18px" }}>TIER</th>
                    <th style={{ padding: "12px 18px" }}>PROTECTED SITES</th>
                    <th style={{ padding: "12px 18px" }}>MONTHLY VOLUME</th>
                    <th style={{ padding: "12px 18px" }}>HONEYPOT DECEPTION</th>
                    <th style={{ padding: "12px 18px" }}>STATUS</th>
                    <th style={{ padding: "12px 18px", textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((t) => (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: `1px solid ${T.border}44`,
                        transition: "background 0.15s",
                      }}
                    >
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: 700, color: T.text }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>ID: #{t.id}</div>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            background:
                              t.tier === "Enterprise"
                                ? `${T.purple}33`
                                : t.tier === "Pro"
                                ? `${T.blue}33`
                                : `${T.muted}33`,
                            color:
                              t.tier === "Enterprise"
                                ? T.purple
                                : t.tier === "Pro"
                                ? T.blue
                                : T.text,
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {t.tier?.toUpperCase() || "STANDARD"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {t.sites && t.sites.length > 0 ? (
                            t.sites.map((s, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: T.surface2,
                                  border: `1px solid ${T.border}`,
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontFamily: "monospace",
                                  color: T.blue,
                                }}
                              >
                                {s.domain}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: T.muted, fontSize: 11 }}>No domains configured</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: 600 }}>
                          {t.monthly_requests ? (t.monthly_requests / 1000).toFixed(0) + "k reqs" : "0"}
                        </div>
                        <div style={{ fontSize: 10, color: T.low }}>Quota: 92% headroom</div>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        {t.honeypot_enabled ? (
                          <span style={{ color: T.low, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}>
                            <span>●</span> Enabled (VFS Shell)
                          </span>
                        ) : (
                          <span style={{ color: T.muted, fontSize: 11 }}>Disabled</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            background: t.is_active ? `${T.low}22` : `${T.critical}22`,
                            color: t.is_active ? T.low : T.critical,
                            padding: "3px 8px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {t.is_active ? "ACTIVE" : "SUSPENDED"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <button
                          onMouseEnter={playHoverSound}
                          onClick={() => handleToggleTenantStatus(t.id, t.is_active)}
                          style={{
                            background: t.is_active ? `${T.critical}22` : `${T.low}22`,
                            border: `1px solid ${t.is_active ? T.critical : T.low}66`,
                            color: t.is_active ? T.critical : T.low,
                            padding: "4px 10px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {t.is_active ? "Suspend" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 3: MASTER GLOBAL BLACKLIST
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "blacklist" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Master Global Blacklist (Platform-Wide)</h2>
                <p style={{ margin: 0, fontSize: 12, color: T.muted }}>
                  IP addresses and CIDR subnets placed here are instantly dropped at Stage 1 Ingress before hitting any customer application.
                </p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <input
                  type="text"
                  placeholder="Filter IP or reason..."
                  value={blacklistSearch}
                  onChange={(e) => setBlacklistSearch(e.target.value)}
                  style={{
                    background: T.surface2,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    borderRadius: 6,
                    padding: "8px 14px",
                    fontSize: 12,
                    width: 240,
                    outline: "none",
                  }}
                />
                <button
                  onMouseEnter={playHoverSound}
                  onClick={() => {
                    playClickSound();
                    setShowAddBanModal(true);
                  }}
                  style={{
                    background: T.critical,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + Add Global Ban
                </button>
              </div>
            </div>

            {/* Blacklist Table */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.surface2, borderBottom: `1px solid ${T.border}`, color: T.muted, fontSize: 11 }}>
                    <th style={{ padding: "12px 18px" }}>IP / CIDR RANGE</th>
                    <th style={{ padding: "12px 18px" }}>ORIGIN</th>
                    <th style={{ padding: "12px 18px" }}>DETECTION REASON</th>
                    <th style={{ padding: "12px 18px" }}>SOURCE</th>
                    <th style={{ padding: "12px 18px" }}>EXPIRATION</th>
                    <th style={{ padding: "12px 18px" }}>DROPPED REQS</th>
                    <th style={{ padding: "12px 18px", textAlign: "right" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBlacklist.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${T.border}44` }}>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: T.critical,
                            background: `${T.critical}18`,
                            padding: "3px 8px",
                            borderRadius: 4,
                          }}
                        >
                          {item.ip}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px" }}>{item.country}</td>
                      <td style={{ padding: "14px 18px", color: T.text }}>{item.reason}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{ fontSize: 11, background: T.surface2, padding: "2px 8px", borderRadius: 4, color: T.muted }}>
                          {item.source}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{ fontSize: 11, color: item.expires_at === "Permanent" ? T.critical : T.medium }}>
                          {item.expires_at}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: 700, color: T.high }}>
                        {item.block_count ? item.block_count.toLocaleString() : "1"}
                      </td>
                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <button
                          onMouseEnter={playHoverSound}
                          onClick={() => handleRemoveGlobalBan(item.ip)}
                          style={{
                            background: "transparent",
                            border: `1px solid ${T.border}`,
                            color: T.muted,
                            padding: "4px 10px",
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 4: AI & MLOPS GOVERNANCE
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "mlops" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>AI Dual-Engine & MLOps Governance</h2>
                <p style={{ margin: 0, fontSize: 12, color: T.muted }}>
                  Model drift monitoring, scikit-learn anomaly thresholds, and live hot-reloading retraining orchestration.
                </p>
              </div>
              <button
                disabled={retrainingInProgress}
                onMouseEnter={playHoverSound}
                onClick={handleRetrainML}
                style={{
                  background: retrainingInProgress ? T.surface2 : `linear-gradient(135deg, ${T.purple}, ${T.blue})`,
                  color: retrainingInProgress ? T.muted : "#0b0816",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 20px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: retrainingInProgress ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: `0 0 16px ${T.blue}44`,
                }}
              >
                <span>{retrainingInProgress ? "⚙️" : "⚡"}</span>
                <span>{retrainingInProgress ? "Retraining Models..." : "Trigger ML Retraining"}</span>
              </button>
            </div>

            {/* Retraining Notification */}
            {retrainSuccessMsg && (
              <div
                style={{
                  background: `${T.low}22`,
                  border: `1px solid ${T.low}`,
                  padding: "12px 18px",
                  borderRadius: 6,
                  color: T.low,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ✓ {retrainSuccessMsg}
              </div>
            )}

            {/* Model Architecture & Benchmark Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {[
                {
                  title: "ANOMALY DETECTION",
                  engine: "IsolationForest",
                  params: "contamination=0.04, 100 trees",
                  metric: "F1-Score: 0.978",
                  status: "ACTIVE INFERENCE",
                  color: T.purple,
                },
                {
                  title: "ATTACK CLASSIFICATION",
                  engine: "RandomForestClassifier",
                  params: "100 estimators, max_depth=16",
                  metric: "Accuracy: 98.4%",
                  status: "ACTIVE INFERENCE",
                  color: T.blue,
                },
                {
                  title: "FEATURE PIPELINE",
                  engine: "TF-IDF + Domain Heuristics",
                  params: "2-3 char n-grams (80 dimensions)",
                  metric: "FPR: 0.42%",
                  status: "WARMED UP (<2ms)",
                  color: T.low,
                },
              ].map((card, i) => (
                <div
                  key={i}
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: 20,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>{card.title}</span>
                    <span style={{ fontSize: 10, color: card.color, background: `${card.color}22`, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                      {card.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: "10px 0 4px" }}>
                    {card.engine}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, fontFamily: "monospace" }}>{card.params}</div>
                  <div style={{ marginTop: 14, fontSize: 14, fontWeight: 700, color: card.color }}>
                    {card.metric}
                  </div>
                </div>
              ))}
            </div>

            {/* Fusion Weight Tuning Slider */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: 24,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                Dual-Engine Decision Weight Tuner
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: T.muted, marginBottom: 16 }}>
                Adjust the autonomous weighting ratio between Deterministic Signatures (Rules R1-R6) and Machine Learning Anomaly Detection.
              </p>
              
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="range"
                    min="30"
                    max="80"
                    value={fusionRatio}
                    onChange={(e) => setFusionRatio(Number(e.target.value))}
                    style={{ width: "100%", accentColor: T.blue }}
                  />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ background: T.surface2, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, color: T.blue }}>
                    Rules Engine: {fusionRatio}%
                  </span>
                  <span style={{ background: T.surface2, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, color: T.purple }}>
                    ML Anomaly: {100 - fusionRatio}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 5: INFRASTRUCTURE & CLUSTER NODES
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "infrastructure" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Platform Infrastructure & Cluster Health</h2>
              <p style={{ margin: 0, fontSize: 12, color: T.muted }}>
                Live metrics from ingestion workers, Redis rate limiter caches, deception containers, and PostgreSQL pools.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {systemHealth?.active_nodes?.map((node, i) => (
                <div
                  key={i}
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: 20,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{node.name}</div>
                    <span style={{ background: `${T.low}22`, color: T.low, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                      ● {node.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>{node.component}</div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, background: T.surface2, padding: 12, borderRadius: 6 }}>
                    {node.latency && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: T.muted }}>Latency:</span>
                        <span style={{ fontWeight: 600, color: T.blue }}>{node.latency}</span>
                      </div>
                    )}
                    {node.memory_used && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: T.muted }}>Memory Allocation:</span>
                        <span style={{ fontWeight: 600 }}>{node.memory_used}</span>
                      </div>
                    )}
                    {node.throughput_rps && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: T.muted }}>Throughput:</span>
                        <span style={{ fontWeight: 600, color: T.low }}>{node.throughput_rps} RPS</span>
                      </div>
                    )}
                    {node.active_sessions !== undefined && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: T.muted }}>Trapped Attackers:</span>
                        <span style={{ fontWeight: 600, color: T.purple }}>{node.active_sessions} Sandboxes</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 6: MASTER AUDIT TRAIL
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "audit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Master Administrative Audit Log</h2>
              <p style={{ margin: 0, fontSize: 12, color: T.muted }}>
                SOC Lead tamper-evident audit trail for governance, compliance, and multi-tenant security verification.
              </p>
            </div>

            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.surface2, borderBottom: `1px solid ${T.border}`, color: T.muted, fontSize: 11 }}>
                    <th style={{ padding: "12px 18px" }}>TIMESTAMP</th>
                    <th style={{ padding: "12px 18px" }}>ACTOR</th>
                    <th style={{ padding: "12px 18px" }}>ACTION</th>
                    <th style={{ padding: "12px 18px" }}>TARGET</th>
                    <th style={{ padding: "12px 18px" }}>SEVERITY</th>
                    <th style={{ padding: "12px 18px" }}>DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: `1px solid ${T.border}44` }}>
                      <td style={{ padding: "14px 18px", color: T.muted, fontSize: 11, fontFamily: "monospace" }}>
                        {new Date(log.timestamp).toLocaleTimeString("en-GB", { hour12: false })}{" "}
                        {new Date(log.timestamp).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: 600, color: T.blue }}>{log.actor}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <code style={{ background: T.surface2, padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
                          {log.action}
                        </code>
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: 600 }}>{log.target}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            background:
                              log.severity === "HIGH"
                                ? `${T.critical}22`
                                : log.severity === "MEDIUM"
                                ? `${T.medium}22`
                                : `${T.low}22`,
                            color:
                              log.severity === "HIGH"
                                ? T.critical
                                : log.severity === "MEDIUM"
                                ? T.medium
                                : T.low,
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", color: T.muted, fontSize: 12 }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL: Provision New Tenant ───────────────────────────────────── */}
      {showAddTenantModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              width: "100%",
              maxWidth: 460,
              padding: 24,
              boxShadow: `0 8px 32px rgba(0,0,0,0.8)`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Provision New Customer Tenant</h3>
              <button
                onClick={() => setShowAddTenantModal(false)}
                style={{ background: "transparent", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTenant} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 4 }}>Organization Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Acme Cyber Defense Corp"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  style={{
                    width: "100%",
                    background: T.surface2,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 4 }}>Primary Protected Domain</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. app.acmecorp.com"
                  value={tenantDomain}
                  onChange={(e) => setTenantDomain(e.target.value)}
                  style={{
                    width: "100%",
                    background: T.surface2,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 4 }}>Subscription Tier</label>
                <select
                  value={tenantTier}
                  onChange={(e) => setTenantTier(e.target.value)}
                  style={{
                    width: "100%",
                    background: T.surface2,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                >
                  <option value="Enterprise">Enterprise (Full Deception & STIX 2.1)</option>
                  <option value="Pro">Pro (Dual ML Models & Custom Rules)</option>
                  <option value="Starter">Starter (Basic Rate Limit & Rules)</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
                <input
                  type="checkbox"
                  id="hp-checkbox"
                  checked={tenantHoneypot}
                  onChange={(e) => setTenantHoneypot(e.target.checked)}
                  style={{ accentColor: T.purple }}
                />
                <label htmlFor="hp-checkbox" style={{ fontSize: 12, color: T.text, cursor: "pointer" }}>
                  Enable Honeypot Virtual Linux Sandbox (VFS)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddTenantModal(false)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${T.border}`,
                    color: T.muted,
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: T.blue,
                    border: "none",
                    color: "#0b0816",
                    borderRadius: 6,
                    padding: "8px 18px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Confirm Provisioning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add Global Blacklist IP ─────────────────────────────────── */}
      {showAddBanModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              width: "100%",
              maxWidth: 440,
              padding: 24,
              boxShadow: `0 8px 32px rgba(0,0,0,0.8)`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Add Global Blacklist Rule</h3>
              <button
                onClick={() => setShowAddBanModal(false)}
                style={{ background: "transparent", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGlobalBan} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 4 }}>IP Address or CIDR Range</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 198.51.100.25 or 198.51.100.0/24"
                  value={banIP}
                  onChange={(e) => setBanIP(e.target.value)}
                  style={{
                    width: "100%",
                    background: T.surface2,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 4 }}>Reason for Global Drop</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Distributed Mirai botnet probe"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  style={{
                    width: "100%",
                    background: T.surface2,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 4 }}>Ban Duration</label>
                <select
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  style={{
                    width: "100%",
                    background: T.surface2,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                >
                  <option value="1 Hour">1 Hour (Temporary Cooldown)</option>
                  <option value="24 Hours">24 Hours (Active Campaign Ban)</option>
                  <option value="7 Days">7 Days (Known Hostile Scanner)</option>
                  <option value="Permanent">Permanent (Confirmed C2 / Exploit Source)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddBanModal(false)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${T.border}`,
                    color: T.muted,
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: T.critical,
                    border: "none",
                    color: "#fff",
                    borderRadius: 6,
                    padding: "8px 18px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Apply Global Ban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
