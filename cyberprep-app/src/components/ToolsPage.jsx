// ── ENHANCED TOOLS PAGE: Basic → Advanced Commands with Explanations ──
import { useState } from "react";
import { TOOLS_DATA } from "../data/toolsData";

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState(0);
  const [levelFilter, setLevelFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const tool = TOOLS_DATA[activeTool];
  const levels = ["All", "Basic", "Intermediate", "Advanced"];

  const filteredCmds = tool.commands.filter(c => {
    const matchLevel = levelFilter === "All" || c.level === levelFilter;
    const matchSearch = searchTerm === "" || c.cmd.toLowerCase().includes(searchTerm.toLowerCase()) || c.explain.toLowerCase().includes(searchTerm.toLowerCase());
    return matchLevel && matchSearch;
  });

  const levelColor = { Basic: "#00ff88", Intermediate: "#ffaa00", Advanced: "#ff4444" };

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h2 className="display" style={{ fontSize: 28, color: "#fff", lineHeight: 1 }}>
          <span style={{ color: "#00ff88", marginRight: 8 }}>🛠</span>CYBERSECURITY TOOLS — COMMAND REFERENCE
        </h2>
        <p className="mono" style={{ color: "#445", fontSize: 11, marginTop: 4 }}># Basic → Intermediate → Advanced commands with detailed explanations</p>
      </div>

      {/* Tool Selector Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 24 }}>
        {TOOLS_DATA.map((t, i) => (
          <div key={i}
            className="card-glow"
            onClick={() => { setActiveTool(i); setLevelFilter("All"); setSearchTerm(""); }}
            style={{
              padding: "10px 12px", cursor: "pointer", textAlign: "center",
              borderColor: activeTool === i ? t.color + "70" : t.color + "18",
              background: activeTool === i ? t.color + "10" : "transparent",
            }}>
            <div style={{ fontSize: 20 }}>{t.icon}</div>
            <div className="mono" style={{ fontSize: 10, color: activeTool === i ? t.color : "#556", marginTop: 4 }}>{t.name}</div>
          </div>
        ))}
      </div>

      {/* Active Tool Header */}
      <div className="card" style={{ padding: 20, marginBottom: 16, borderLeft: `3px solid ${tool.color}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 36 }}>{tool.icon}</span>
          <div style={{ flex: 1 }}>
            <div className="display" style={{ fontSize: 24, color: tool.color }}>{tool.name}</div>
            <div style={{ fontSize: 12, color: "#778", marginTop: 2 }}>{tool.cat}</div>
            <p style={{ fontSize: 13, color: "#8a9ba8", marginTop: 6, lineHeight: 1.6 }}>{tool.desc}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="display" style={{ fontSize: 32, color: tool.color }}>{tool.commands.length}</div>
            <div className="mono" style={{ fontSize: 10, color: "#556" }}>COMMANDS</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {levels.map(l => (
          <button key={l}
            className={`btn ${levelFilter === l ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setLevelFilter(l)}
            style={{ fontSize: 11 }}>
            {l === "All" ? "📋 All Levels" : l === "Basic" ? "🟢 Basic" : l === "Intermediate" ? "🟡 Intermediate" : "🔴 Advanced"}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <input
          className="cyber-input"
          placeholder="🔍 Search commands..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ maxWidth: 280, fontSize: 12 }}
        />
      </div>

      {/* Commands List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filteredCmds.map((c, i) => (
          <div key={i} className="card-glow" style={{ padding: 16, borderColor: levelColor[c.level] + "25" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span className="tag" style={{
                background: levelColor[c.level] + "18",
                color: levelColor[c.level],
                border: `1px solid ${levelColor[c.level]}40`,
                minWidth: 85, textAlign: "center", fontSize: 10
              }}>{c.level}</span>
              <div style={{ flex: 1 }}>
                <div className="card" style={{ padding: "8px 12px", marginBottom: 8, borderColor: "#0d1117", background: "#080c10" }}>
                  <code className="mono" style={{ fontSize: 12, color: tool.color, wordBreak: "break-all" }}>
                    {c.cmd}
                  </code>
                </div>
                <p style={{ fontSize: 13, color: "#8a9ba8", lineHeight: 1.6, margin: 0 }}>
                  <span style={{ color: "#00ff8880", marginRight: 6 }}>→</span>{c.explain}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCmds.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <p style={{ color: "#556" }}>No commands match your filter. Try adjusting the level or search term.</p>
        </div>
      )}

      {/* Stats footer */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 24 }}>
        {[
          { label: "Total Tools", val: TOOLS_DATA.length, color: "#00ff88", icon: "🛠" },
          { label: "Total Commands", val: TOOLS_DATA.reduce((a, t) => a + t.commands.length, 0), color: "#00bfff", icon: "⌨️" },
          { label: "Basic Commands", val: TOOLS_DATA.reduce((a, t) => a + t.commands.filter(c => c.level === "Basic").length, 0), color: "#00ff88", icon: "🟢" },
          { label: "Advanced Commands", val: TOOLS_DATA.reduce((a, t) => a + t.commands.filter(c => c.level === "Advanced").length, 0), color: "#ff4444", icon: "🔴" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 16, textAlign: "center", borderBottom: `2px solid ${s.color}` }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div className="display" style={{ fontSize: 28, color: s.color }}>{s.val}</div>
            <div className="mono" style={{ fontSize: 10, color: "#556" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
