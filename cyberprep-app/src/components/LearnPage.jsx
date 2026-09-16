// ── LEARN PAGE: Beginner-friendly learning hub ──
import { useState } from "react";
import { LEARNING_PATHS, BEGINNER_CONCEPTS, GLOSSARY } from "../data/learningData";

export default function LearnPage() {
  const [tab, setTab] = useState("concepts");
  const [activeConcept, setActiveConcept] = useState(0);
  const [activePath, setActivePath] = useState(0);
  const [glossarySearch, setGlossarySearch] = useState("");
  const [expandedGlossary, setExpandedGlossary] = useState(null);

  const filteredGlossary = GLOSSARY.filter(g =>
    g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
    g.def.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <h2 className="display" style={{ fontSize: 28, color: "var(--text-primary)", lineHeight: 1 }}>
          <span style={{ color: "var(--accent)", marginRight: 8 }}>📚</span>LEARN FROM ZERO
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
          Never hacked before? Perfect. Start here. Every concept is explained like you're hearing it for the first time.
        </p>
      </div>

      {/* Tab Selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        {[["concepts", "🧠 Core Concepts"], ["paths", "🗺️ Learning Roadmap"], ["glossary", "📖 Glossary (A-Z)"]].map(([t, l]) => (
          <button key={t} className={`btn ${tab === t ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {/* ── CORE CONCEPTS ── */}
      {tab === "concepts" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "flex-start" }}>
          {/* Concept list sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 6, padding: "0 12px" }}>
              SELECT A TOPIC ({BEGINNER_CONCEPTS.length} lessons)
            </div>
            {BEGINNER_CONCEPTS.map((c, i) => (
              <div key={i}
                onClick={() => setActiveConcept(i)}
                className="learn-sidebar-item"
                style={{
                  padding: "12px 14px", borderRadius: 8, cursor: "pointer", transition: "all .2s",
                  background: activeConcept === i ? c.color + "15" : "transparent",
                  border: `1px solid ${activeConcept === i ? c.color + "40" : "transparent"}`,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{c.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: activeConcept === i ? 600 : 400, color: activeConcept === i ? c.color : "var(--text-secondary)" }}>
                    {c.title}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Concept content */}
          <div className="card" style={{ padding: 32, borderLeft: `3px solid ${BEGINNER_CONCEPTS[activeConcept].color}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 32 }}>{BEGINNER_CONCEPTS[activeConcept].icon}</span>
              <div>
                <h3 style={{ fontSize: 22, color: "var(--text-primary)", fontWeight: 600, margin: 0 }}>
                  {BEGINNER_CONCEPTS[activeConcept].title}
                </h3>
                <span className="tag" style={{ background: BEGINNER_CONCEPTS[activeConcept].color + "18", color: BEGINNER_CONCEPTS[activeConcept].color, border: `1px solid ${BEGINNER_CONCEPTS[activeConcept].color}40`, marginTop: 4 }}>
                  BEGINNER FRIENDLY
                </span>
              </div>
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
              {BEGINNER_CONCEPTS[activeConcept].content.split("\n").map((line, i) => {
                if (line.startsWith("**") && line.endsWith("**")) {
                  const text = line.slice(2, -2);
                  return <div key={i} style={{ fontSize: 16, fontWeight: 700, color: BEGINNER_CONCEPTS[activeConcept].color, margin: "16px 0 6px" }}>{text}</div>;
                }
                if (line.startsWith("**")) {
                  const parts = line.split("**");
                  return (
                    <div key={i} style={{ margin: "3px 0" }}>
                      {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "var(--text-primary)" }}>{p}</strong> : <span key={j}>{p}</span>)}
                    </div>
                  );
                }
                if (line.startsWith("→")) return <div key={i} style={{ paddingLeft: 8, borderLeft: `2px solid ${BEGINNER_CONCEPTS[activeConcept].color}30`, margin: "4px 0 4px 4px", color: "var(--text-secondary)" }}>{line}</div>;
                if (line.startsWith("•")) return <div key={i} style={{ margin: "4px 0 4px 8px" }}>{line}</div>;
                return <div key={i}>{line}</div>;
              })}
            </div>
            {/* Navigation */}
            <div style={{ display: "flex", gap: 10, marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-ghost" onClick={() => setActiveConcept(c => Math.max(0, c - 1))} disabled={activeConcept === 0}>← Previous Lesson</button>
              <div style={{ flex: 1 }} />
              <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)", alignSelf: "center" }}>
                {activeConcept + 1} / {BEGINNER_CONCEPTS.length}
              </span>
              <button className="btn btn-primary" onClick={() => setActiveConcept(c => Math.min(BEGINNER_CONCEPTS.length - 1, c + 1))} disabled={activeConcept === BEGINNER_CONCEPTS.length - 1}>
                Next Lesson →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEARNING ROADMAPS ── */}
      {tab === "paths" && (
        <div>
          {/* Path selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
            {LEARNING_PATHS.map((p, i) => (
              <div key={i} className="card-glow" onClick={() => setActivePath(i)}
                style={{
                  padding: 20, cursor: "pointer", textAlign: "center",
                  borderColor: activePath === i ? p.color + "60" : p.color + "20",
                  background: activePath === i ? p.color + "08" : "transparent"
                }}>
                <span style={{ fontSize: 32 }}>{p.icon}</span>
                <div style={{ fontSize: 16, fontWeight: 600, color: activePath === i ? p.color : "var(--text-primary)", marginTop: 8 }}>{p.title}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4 }}>{p.duration}</div>
              </div>
            ))}
          </div>

          {/* Active path roadmap */}
          {(() => {
            const path = LEARNING_PATHS[activePath];
            return (
              <div>
                <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: `3px solid ${path.color}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 28 }}>{path.icon}</span>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>{path.title} — Learning Path</div>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{path.desc}</p>
                    </div>
                    <div style={{ marginLeft: "auto", textAlign: "center" }}>
                      <div className="display" style={{ fontSize: 28, color: path.color }}>{path.steps.length}</div>
                      <div className="mono" style={{ fontSize: 9, color: "var(--text-dim)" }}>STEPS</div>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div style={{ position: "relative", paddingLeft: 32 }}>
                  {/* Vertical line */}
                  <div style={{ position: "absolute", left: 15, top: 0, bottom: 0, width: 2, background: `linear-gradient(${path.color}40, var(--border))` }} />

                  {path.steps.map((step, i) => (
                    <div key={i} style={{ position: "relative", marginBottom: 12 }}>
                      {/* Circle */}
                      <div style={{
                        position: "absolute", left: -25, top: 18, width: 18, height: 18, borderRadius: "50%",
                        background: i <= 1 ? path.color : "var(--bg-card)", border: `2px solid ${i <= 1 ? path.color : "var(--border)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, color: i <= 1 ? "#fff" : "var(--text-dim)"
                      }}>
                        {i <= 1 ? "✓" : i + 1}
                      </div>

                      <div className="card" style={{
                        padding: 18, borderColor: i <= 1 ? path.color + "30" : "var(--border)",
                        opacity: i > 5 ? 0.7 : 1
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span className="mono" style={{ fontSize: 10, color: i <= 1 ? path.color : "var(--text-dim)" }}>
                            STEP {i + 1}
                          </span>
                          {i <= 1 && <span className="tag" style={{ background: path.color + "20", color: path.color, border: `1px solid ${path.color}40`, fontSize: 9 }}>START HERE</span>}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{step.title}</div>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── GLOSSARY ── */}
      {tab === "glossary" && (
        <div>
          <input
            className="cyber-input"
            placeholder="🔍 Search terms... (e.g., firewall, malware, VPN)"
            value={glossarySearch}
            onChange={e => setGlossarySearch(e.target.value)}
            style={{ marginBottom: 20, maxWidth: 500, fontSize: 14 }}
          />
          <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 14 }}>
            {filteredGlossary.length} terms found
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {filteredGlossary.map((g, i) => (
              <div key={i} className="card-glow"
                onClick={() => setExpandedGlossary(expandedGlossary === i ? null : i)}
                style={{ padding: 16, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>{g.term}</span>
                  <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{expandedGlossary === i ? "▲" : "▼"}</span>
                </div>
                {expandedGlossary === i && (
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.7 }}>{g.def}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
