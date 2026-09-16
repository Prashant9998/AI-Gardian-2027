// ── ENHANCED FLASHCARDS: 120+ cards with category filtering ──
import { useState, useMemo } from "react";
import { FLASHCARDS_DATA, FLASHCARD_CATEGORIES } from "../data/flashcardsData";

export default function FlashcardsPage() {
  const [activeCat, setActiveCat] = useState("All");
  const [ci, setCi] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(new Set());
  const [mode, setMode] = useState("browse"); // browse | quiz

  const cards = useMemo(() => {
    if (activeCat === "All") return FLASHCARDS_DATA;
    return FLASHCARDS_DATA.filter(c => c.cat === activeCat);
  }, [activeCat]);

  const card = cards[ci] || cards[0];

  const flipCard = () => setFlipped(f => !f);
  const nextCard = () => { setCi(c => (c + 1) % cards.length); setFlipped(false); };
  const prevCard = () => { setCi(c => (c - 1 + cards.length) % cards.length); setFlipped(false); };
  const markKnown = () => {
    const key = card.f;
    setKnown(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
    nextCard();
  };
  const resetCategory = (cat) => { setActiveCat(cat); setCi(0); setFlipped(false); };
  const progress = cards.length > 0 ? Math.round((cards.filter(c => known.has(c.f)).length / cards.length) * 100) : 0;

  const catCounts = useMemo(() => {
    const counts = { All: FLASHCARDS_DATA.length };
    FLASHCARD_CATEGORIES.forEach(cat => {
      counts[cat] = FLASHCARDS_DATA.filter(c => c.cat === cat).length;
    });
    return counts;
  }, []);

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h2 className="display" style={{ fontSize: 28, color: "#fff", lineHeight: 1 }}>
          <span style={{ color: "#00bfff", marginRight: 8 }}>🃏</span>FLASHCARDS — {FLASHCARDS_DATA.length}+ CARDS
        </h2>
        <p className="mono" style={{ color: "#445", fontSize: 11, marginTop: 4 }}># Click card to flip · Mark as known to track progress</p>
      </div>

      {/* Category Selector */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {["All", ...FLASHCARD_CATEGORIES].map(cat => (
          <button key={cat}
            className={`btn ${activeCat === cat ? "btn-primary" : "btn-ghost"}`}
            onClick={() => resetCategory(cat)}
            style={{ fontSize: 11, padding: "6px 14px" }}>
            {cat} <span style={{ opacity: 0.5, marginLeft: 4 }}>({catCounts[cat] || 0})</span>
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="card" style={{ padding: 12, marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span className="mono" style={{ fontSize: 10, color: "#556" }}>PROGRESS: {activeCat}</span>
            <span className="mono" style={{ fontSize: 10, color: "#00ff88" }}>{progress}% mastered</span>
          </div>
          <div className="skill-bar" style={{ height: 6 }}>
            <div className="skill-fill" style={{ width: progress + "%" }} />
          </div>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "#556" }}>
          Card {ci + 1} / {cards.length}
        </div>
        <div className="mono" style={{ fontSize: 11, color: "#00ff88" }}>
          ✓ {cards.filter(c => known.has(c.f)).length} known
        </div>
      </div>

      {/* Flashcard */}
      {cards.length > 0 && (
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="fc" onClick={flipCard}
            style={{
              borderColor: flipped ? "#00bfff50" : known.has(card.f) ? "#00ff8850" : "#1e2a3a",
              marginBottom: 16, minHeight: 200, position: "relative"
            }}>
            {known.has(card.f) && (
              <div style={{ position: "absolute", top: 10, right: 12, fontSize: 10, color: "#00ff88" }}>✓ KNOWN</div>
            )}
            <div style={{ position: "absolute", top: 10, left: 12 }}>
              <span className="tag" style={{ background: "#00bfff15", color: "#00bfff", border: "1px solid #00bfff30", fontSize: 9 }}>
                {card.cat}
              </span>
            </div>
            {!flipped ? (
              <div style={{ marginTop: 12 }}>
                <div className="display" style={{ fontSize: 32, color: "#00bfff", marginBottom: 8 }}>{card.f}</div>
                <div className="mono" style={{ fontSize: 10, color: "#334" }}>tap to reveal answer</div>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <div className="mono" style={{ fontSize: 10, color: "#00bfff80", marginBottom: 12 }}>ANSWER</div>
                <pre style={{
                  fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#c8d6e5",
                  whiteSpace: "pre-wrap", textAlign: "center", lineHeight: 1.8, margin: 0
                }}>
                  {card.b}
                </pre>
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16 }}>
            <button className="btn btn-ghost" onClick={prevCard}>← PREV</button>
            <button className="btn" onClick={markKnown}
              style={{
                background: known.has(card.f) ? "#ff444420" : "#00ff8820",
                color: known.has(card.f) ? "#ff6666" : "#00ff88",
                border: `1px solid ${known.has(card.f) ? "#ff444440" : "#00ff8840"}`,
                padding: "9px 22px", borderRadius: 5, cursor: "pointer",
                fontFamily: "'Share Tech Mono', monospace", fontSize: 12
              }}>
              {known.has(card.f) ? "✗ UNMARK" : "✓ MARK KNOWN"}
            </button>
            <button className="btn btn-primary" onClick={nextCard}>NEXT →</button>
          </div>

          {/* Dot Navigation */}
          <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap", maxHeight: 60, overflow: "hidden" }}>
            {cards.slice(0, 60).map((c, i) => (
              <div key={i}
                onClick={() => { setCi(i); setFlipped(false); }}
                style={{
                  width: 8, height: 8, borderRadius: "50%", cursor: "pointer", transition: "all .2s",
                  background: i === ci ? "#00bfff" : known.has(c.f) ? "#00ff88" : "#1e2a3a",
                }} />
            ))}
            {cards.length > 60 && <span className="mono" style={{ fontSize: 9, color: "#334", alignSelf: "center" }}>+{cards.length - 60} more</span>}
          </div>
        </div>
      )}

      {/* Category Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 28 }}>
        {FLASHCARD_CATEGORIES.map(cat => {
          const total = FLASHCARDS_DATA.filter(c => c.cat === cat).length;
          const knownCount = FLASHCARDS_DATA.filter(c => c.cat === cat && known.has(c.f)).length;
          const pct = total > 0 ? Math.round((knownCount / total) * 100) : 0;
          return (
            <div key={cat} className="card" style={{ padding: 12, textAlign: "center", cursor: "pointer" }}
              onClick={() => resetCategory(cat)}>
              <div className="mono" style={{ fontSize: 9, color: "#556", marginBottom: 4 }}>{cat.toUpperCase()}</div>
              <div className="display" style={{ fontSize: 20, color: pct === 100 ? "#00ff88" : "#00bfff" }}>{total}</div>
              <div className="skill-bar" style={{ height: 3, marginTop: 6 }}>
                <div className="skill-fill" style={{ width: pct + "%" }} />
              </div>
              <div className="mono" style={{ fontSize: 9, color: "#334", marginTop: 4 }}>{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
