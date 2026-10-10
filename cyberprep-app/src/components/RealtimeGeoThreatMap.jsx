import { useState, useMemo, useEffect, useRef } from "react";
import { WORLD_PATHS } from "./worldMapData";
import "./RealtimeGeoThreatMap.css";

// Geographic Threat Nodes mapped to the SVG coordinate space (2000 x 857)
const BASE_GEO_NODES = [
  {
    id: "beijing",
    city: "Beijing",
    country: "China",
    flag: "🇨🇳",
    x: 1560,
    y: 225,
    baseCount: 47,
    defaultCol: "#ff3b30",
    level: "CRITICAL",
    vector: "SQL Injection",
    ip: "103.21.244.1",
    lat: "39.90° N",
    lon: "116.40° E",
  },
  {
    id: "moscow",
    city: "Moscow",
    country: "Russia",
    flag: "🇷🇺",
    x: 1180,
    y: 155,
    baseCount: 31,
    defaultCol: "#ff7a00",
    level: "HIGH",
    vector: "Vulnerability Scanners",
    ip: "91.108.4.0",
    lat: "55.75° N",
    lon: "37.61° E",
  },
  {
    id: "saopaulo",
    city: "São Paulo",
    country: "Brazil",
    flag: "🇧🇷",
    x: 740,
    y: 610,
    baseCount: 28,
    defaultCol: "#ff7a00",
    level: "HIGH",
    vector: "Cross-Site Scripting",
    ip: "185.220.101.34",
    lat: "23.55° S",
    lon: "46.63° W",
  },
  {
    id: "frankfurt",
    city: "Frankfurt",
    country: "Germany",
    flag: "🇩🇪",
    x: 1045,
    y: 195,
    baseCount: 19,
    defaultCol: "#f59e0b",
    level: "MEDIUM",
    vector: "Credential Brute Force",
    ip: "45.33.32.220",
    lat: "50.11° N",
    lon: "8.68° E",
  },
  {
    id: "mumbai",
    city: "Mumbai",
    country: "India",
    flag: "🇮🇳",
    x: 1400,
    y: 360,
    baseCount: 14,
    defaultCol: "#f59e0b",
    level: "MEDIUM",
    vector: "Path Traversal",
    ip: "198.51.100.5",
    lat: "19.07° N",
    lon: "72.87° E",
  },
  {
    id: "ashburn",
    city: "Ashburn",
    country: "USA",
    flag: "🇺🇸",
    x: 575,
    y: 225,
    baseCount: 9,
    defaultCol: "#319f43",
    level: "LOW",
    vector: "Automated Bot Probe",
    ip: "192.168.1.100",
    lat: "39.04° N",
    lon: "77.49° W",
  },
  {
    id: "tokyo",
    city: "Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    x: 1715,
    y: 250,
    baseCount: 12,
    defaultCol: "#ff7a00",
    level: "HIGH",
    vector: "API Rate Abuse",
    ip: "133.242.18.5",
    lat: "35.67° N",
    lon: "139.65° E",
  },
  {
    id: "london",
    city: "London",
    country: "United Kingdom",
    flag: "🇬🇧",
    x: 975,
    y: 165,
    baseCount: 15,
    defaultCol: "#f59e0b",
    level: "MEDIUM",
    vector: "Header Injection",
    ip: "51.15.42.19",
    lat: "51.50° N",
    lon: "0.12° W",
  },
  {
    id: "sydney",
    city: "Sydney",
    country: "Australia",
    flag: "🇦🇺",
    x: 1780,
    y: 700,
    baseCount: 6,
    defaultCol: "#319f43",
    level: "LOW",
    vector: "Port Scan",
    ip: "139.130.4.5",
    lat: "33.86° S",
    lon: "151.20° E",
  },
];

// Target Protected Data Center
const TARGET_HUB = {
  id: "target_core",
  city: "Ashburn SOC Core",
  country: "USA (Protected Asset)",
  flag: "🛡️",
  x: 575,
  y: 225,
  label: "PRIMARY DATACENTER [US-EAST]",
};

export default function RealtimeGeoThreatMap({
  events = [],
  newId = null,
  onNodeClick,
  isWsConnected = false,
}) {
  const [showArcs, setShowArcs] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [activePulseNodeId, setActivePulseNodeId] = useState(null);
  const containerRef = useRef(null);

  // Dynamic aggregation from real-time events stream
  const nodeStats = useMemo(() => {
    const stats = {};
    for (const node of BASE_GEO_NODES) {
      stats[node.id] = {
        ...node,
        count: node.baseCount,
        latestEvent: null,
      };
    }

    for (const e of events) {
      const match = BASE_GEO_NODES.find(
        (n) =>
          (e.city && e.city.toLowerCase() === n.city.toLowerCase()) ||
          (e.countryName && e.countryName.toLowerCase() === n.country.toLowerCase()) ||
          (e.country && e.country.toLowerCase().includes(n.country.toLowerCase()))
      );

      if (match && stats[match.id]) {
        stats[match.id].count += 1;
        if (!stats[match.id].latestEvent) {
          stats[match.id].latestEvent = e;
        }
      }
    }

    return Object.values(stats);
  }, [events]);

  // Trigger ping wave whenever a new attack event is received
  useEffect(() => {
    if (!newId || events.length === 0) return;
    const latest = events[0];
    if (!latest) return;

    const matched = BASE_GEO_NODES.find(
      (n) =>
        (latest.city && latest.city.toLowerCase() === n.city.toLowerCase()) ||
        (latest.countryName && latest.countryName.toLowerCase() === n.country.toLowerCase()) ||
        (latest.country && latest.country.toLowerCase().includes(n.country.toLowerCase()))
    );

    if (matched) {
      setActivePulseNodeId(matched.id);
      const timer = setTimeout(() => setActivePulseNodeId(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [newId, events]);

  // Filter nodes based on user severity filter
  const visibleNodes = useMemo(() => {
    if (filterSeverity === "ALL") return nodeStats;
    return nodeStats.filter((n) => n.level === filterSeverity);
  }, [nodeStats, filterSeverity]);

  // Compute curved trajectory arcs from origin nodes to target hub
  const attackArcs = useMemo(() => {
    return visibleNodes
      .filter((n) => n.id !== "ashburn") // Exclude target hub location
      .map((n) => {
        const x1 = n.x;
        const y1 = n.y;
        const x2 = TARGET_HUB.x;
        const y2 = TARGET_HUB.y;

        // Quadratic Bezier control point elevated over the earth
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const arcHeight = Math.min(220, Math.max(70, dist * 0.24));
        const cx = mx;
        const cy = my - arcHeight;

        const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

        return {
          id: `arc-${n.id}`,
          nodeId: n.id,
          d: pathD,
          color: n.defaultCol,
          level: n.level,
        };
      });
  }, [visibleNodes]);

  // Most recent intercepted threat for the bottom ticker
  const latestThreat = events[0] || null;

  return (
    <div
      ref={containerRef}
      className="geo-map-container"
      style={{ height: isExpanded ? 380 : 250 }}
    >
      {/* High-Tech Radar Sweep */}
      {showRadar && <div className="geo-radar-sweep" />}

      {/* CRT Scanline Overlay */}
      <div className="geo-scanlines" />

      {/* Top HUD Controls & Telemetry */}
      <div className="geo-hud-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="geo-hud-badge">
            <span
              className="geo-live-dot"
              style={{ background: isWsConnected ? "#2fe07d" : "#00e5ff" }}
            />
            <span>{isWsConnected ? "LIVE WEBSOCKET STREAM" : "LIVE SENSOR FEEDS"}</span>
          </div>

          <span
            style={{
              fontSize: 11,
              fontFamily: "'Geist Mono', monospace",
              color: "rgba(245, 239, 255, 0.7)",
            }}
          >
            {nodeStats.reduce((acc, n) => acc + n.count, 0)} Total Detected Attacks
          </span>
        </div>

        <div className="geo-controls">
          {/* Severity Filters */}
          {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`geo-btn-control ${filterSeverity === lvl ? "active" : ""}`}
              onClick={() => setFilterSeverity(lvl)}
            >
              {lvl}
            </button>
          ))}

          {/* Trajectories Toggle */}
          <button
            type="button"
            className={`geo-btn-control ${showArcs ? "active" : ""}`}
            onClick={() => setShowArcs(!showArcs)}
            title="Toggle attack trajectory missile arcs"
          >
            ⚡ {showArcs ? "ARCS ON" : "ARCS OFF"}
          </button>

          {/* Radar Sweep Toggle */}
          <button
            type="button"
            className={`geo-btn-control ${showRadar ? "active" : ""}`}
            onClick={() => setShowRadar(!showRadar)}
            title="Toggle radar sweep effect"
          >
            📡 RADAR
          </button>

          {/* Height Expand Toggle */}
          <button
            type="button"
            className={`geo-btn-control ${isExpanded ? "active" : ""}`}
            onClick={() => setIsExpanded(!isExpanded)}
            title="Expand / Contract map view"
          >
            {isExpanded ? "▲ CONTRACT" : "▼ EXPAND"}
          </button>
        </div>
      </div>

      {/* Main SVG Vector Map */}
      <svg
        viewBox="0 0 2000 857"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", position: "relative", zIndex: 2 }}
      >
        <defs>
          {/* Cyberpunk Map Glow Filter */}
          <filter id="geoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Target Shield Defense Glow */}
          <filter id="shieldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Subtle Grid Pattern for Oceans */}
          <pattern id="geoGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="0.75" fill="rgba(0, 229, 255, 0.2)" />
          </pattern>
        </defs>

        {/* Ocean Grid Background */}
        <rect width="2000" height="857" fill="url(#geoGrid)" opacity="0.7" />

        {/* Latitude & Longitude Graticule Coordinate Lines */}
        <g stroke="rgba(0, 229, 255, 0.08)" stroke-width="0.8" stroke-dasharray="4 6">
          <line x1="0" y1="200" x2="2000" y2="200" />
          <line x1="0" y1="428" x2="2000" y2="428" stroke="rgba(0, 229, 255, 0.18)" stroke-dasharray="6 6" />
          <line x1="0" y1="650" x2="2000" y2="650" />
          <line x1="500" y1="0" x2="500" y2="857" />
          <line x1="975" y1="0" x2="975" y2="857" stroke="rgba(0, 229, 255, 0.18)" />
          <line x1="1500" y1="0" x2="1500" y2="857" />
        </g>

        {/* Equator & Meridian Coordinate Labels */}
        <text x="20" y="424" fill="rgba(0, 229, 255, 0.4)" fontSize="13" fontFamily="'Geist Mono', monospace">
          EQUATOR 0°00'00"
        </text>
        <text x="980" y="30" fill="rgba(0, 229, 255, 0.35)" fontSize="13" fontFamily="'Geist Mono', monospace">
          PRIME MERIDIAN 0°00'E
        </text>

        {/* Continents & Countries Vector Paths */}
        <g id="worldContinents">
          {WORLD_PATHS.map((p, idx) => (
            <path
              key={p.id || idx}
              d={p.d}
              className="geo-country-path"
              title={p.name || p.id}
            />
          ))}
        </g>

        {/* Attack Trajectory Arcs with Real-Time Photon Stream */}
        {showArcs && (
          <g id="attackArcs">
            {attackArcs.map((arc) => (
              <g key={arc.id}>
                {/* Background Shadow Line */}
                <path
                  d={arc.d}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="1.5"
                  strokeOpacity="0.25"
                />

                {/* Animated Glowing Stream */}
                <path
                  d={arc.d}
                  className="geo-attack-arc"
                  stroke={arc.color}
                  strokeWidth="2"
                  strokeDasharray="6 8"
                  style={{ color: arc.color }}
                />

                {/* Traveling Photon Missile Particle */}
                <circle r="3.5" fill="#ffffff" filter="url(#geoGlow)">
                  <animateMotion
                    path={arc.d}
                    dur="2.4s"
                    repeatCount="indefinite"
                    keyPoints="0;1"
                    keyTimes="0;1"
                  />
                </circle>
              </g>
            ))}
          </g>
        )}

        {/* Target Core Hub (Ashburn SOC Datacenter) */}
        <g id="targetCore" transform={`translate(${TARGET_HUB.x}, ${TARGET_HUB.y})`}>
          {/* Defensive Shield Forcefield */}
          <circle
            r="18"
            fill="rgba(0, 229, 255, 0.12)"
            stroke="#00e5ff"
            strokeWidth="1.8"
            strokeDasharray="4 4"
            className="geo-target-ring"
            filter="url(#shieldGlow)"
          />
          <circle r="7" fill="#00e5ff" />
          <circle r="3.5" fill="#ffffff" />

          {/* Target Hub Plate */}
          <g transform="translate(0, 28)">
            <rect
              x="-85"
              y="-12"
              width="170"
              height="22"
              rx="4"
              fill="rgba(10, 18, 30, 0.9)"
              stroke="#00e5ff"
              strokeWidth="1"
            />
            <text
              textAnchor="middle"
              y="3"
              fill="#00e5ff"
              fontSize="11"
              fontWeight="600"
              fontFamily="'Geist Mono', monospace"
            >
              🛡️ TARGET: US-EAST CORE
            </text>
          </g>
        </g>

        {/* Origin Threat Nodes */}
        <g id="threatNodes">
          {visibleNodes.map((n) => {
            const isPulsing = activePulseNodeId === n.id;
            const isHovered = hoveredNode?.id === n.id;

            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredNode(n)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onNodeClick && onNodeClick(n)}
              >
                {/* Expanding Shockwave Waves */}
                <circle
                  r="12"
                  fill="none"
                  stroke={n.defaultCol}
                  strokeWidth="1.5"
                  className="geo-pulse-ring"
                />

                {isPulsing && (
                  <circle
                    r="28"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    style={{ animation: "pulseRipple 1s ease-out infinite" }}
                  />
                )}

                {/* Core Threat Circle */}
                <circle
                  r={isHovered ? 8 : 6}
                  fill={n.defaultCol}
                  filter="url(#geoGlow)"
                  style={{ transition: "r 0.2s ease" }}
                />
                <circle r="2.5" fill="#ffffff" />

                {/* Tactical Node Label Plate */}
                <g transform="translate(0, 18)">
                  <rect
                    x="-48"
                    y="-10"
                    width="96"
                    height="19"
                    rx="3"
                    fill="rgba(9, 14, 24, 0.88)"
                    stroke={n.defaultCol}
                    strokeWidth="0.8"
                  />
                  <text
                    textAnchor="middle"
                    y="3"
                    fill="#f5efff"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="'Geist Mono', monospace"
                  >
                    {n.city} ({n.count})
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Tactical Node Info Tooltip */}
      {hoveredNode && (
        <div
          className="geo-tooltip"
          style={{
            left: `${(hoveredNode.x / 2000) * 100}%`,
            top: `${(hoveredNode.y / 857) * 100}%`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#f5efff" }}>
              {hoveredNode.flag} {hoveredNode.city}, {hoveredNode.country}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: hoveredNode.defaultCol,
                border: `1px solid ${hoveredNode.defaultCol}`,
                padding: "1px 5px",
                borderRadius: 3,
                textTransform: "uppercase",
              }}
            >
              {hoveredNode.level}
            </span>
          </div>

          <div style={{ fontSize: 11, color: "#8e80ab", lineHeight: 1.5, marginBottom: 8 }}>
            <div>
              <span style={{ color: "rgba(245,239,255,0.6)" }}>Coordinates: </span>
              <span style={{ color: "#00e5ff" }}>{hoveredNode.lat}, {hoveredNode.lon}</span>
            </div>
            <div>
              <span style={{ color: "rgba(245,239,255,0.6)" }}>Total Attacks: </span>
              <span style={{ color: "#ffffff", fontWeight: 600 }}>{hoveredNode.count}</span>
            </div>
            <div>
              <span style={{ color: "rgba(245,239,255,0.6)" }}>Primary Vector: </span>
              <span style={{ color: "#f5efff" }}>
                {hoveredNode.latestEvent?.type || hoveredNode.vector}
              </span>
            </div>
            <div>
              <span style={{ color: "rgba(245,239,255,0.6)" }}>Latest IP: </span>
              <span style={{ color: "#c9b4f7", fontFamily: "monospace" }}>
                {hoveredNode.latestEvent?.ip || hoveredNode.ip}
              </span>
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(0, 229, 255, 0.2)",
              paddingTop: 6,
              fontSize: 10,
              color: "#00e5ff",
              textAlign: "right",
              cursor: "pointer",
            }}
            onClick={() => onNodeClick && onNodeClick(hoveredNode)}
          >
            Inspect in Attackers View →
          </div>
        </div>
      )}

      {/* Bottom Telemetry Live Ticker */}
      <div className="geo-ticker">
        <div className="geo-ticker-latest">
          <span style={{ color: "#ff3b30", fontWeight: 700 }}>[INTERCEPT]</span>
          {latestThreat ? (
            <span>
              {latestThreat.time || "NOW"} — {latestThreat.ip} ({latestThreat.countryName || latestThreat.country}) ➔{" "}
              <span style={{ color: "#00e5ff" }}>{latestThreat.type}</span> on{" "}
              <code>{latestThreat.path}</code> [
              <span style={{ color: "#319f43" }}>{latestThreat.status || "BLOCKED"}</span>]
            </span>
          ) : (
            <span>All perimeter defenses stable — 0 active breaches</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          <span>
            Target: <strong style={{ color: "#00e5ff" }}>US-East WAF</strong>
          </span>
          <span>
            Protection: <strong style={{ color: "#319f43" }}>99.98%</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
