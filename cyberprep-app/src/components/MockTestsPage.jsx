// ── MOCK TESTS PAGE: 5 tests with timer, scoring, review ──
import { useState, useEffect, useRef } from "react";
import { MOCK_TESTS } from "../data/mockTestsData";

export default function MockTestsPage() {
  const [activeTest, setActiveTest] = useState(null);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [history, setHistory] = useState([]);
  const timerRef = useRef(null);

  const test = activeTest !== null ? MOCK_TESTS[activeTest] : null;
  const question = test ? test.questions[qi] : null;

  // Timer
  useEffect(() => {
    if (activeTest === null || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); submitTest(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [activeTest, submitted]);

  const startTest = (idx) => {
    setActiveTest(idx);
    setQi(0);
    setAnswers({});
    setSubmitted(false);
    setReviewMode(false);
    setTimeLeft(MOCK_TESTS[idx].time * 60);
  };

  const selectAnswer = (optIdx) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qi]: optIdx }));
  };

  const submitTest = () => {
    clearInterval(timerRef.current);
    setSubmitted(true);
    if (test) {
      const score = test.questions.reduce((acc, q, i) => acc + (answers[i] === q.ans ? 1 : 0), 0);
      setHistory(prev => [...prev, { testId: test.id, title: test.title, score, total: test.questions.length, date: new Date().toLocaleString() }]);
    }
  };

  const goBack = () => {
    clearInterval(timerRef.current);
    setActiveTest(null); setSubmitted(false); setReviewMode(false);
  };

  const score = test ? test.questions.reduce((acc, q, i) => acc + (answers[i] === q.ans ? 1 : 0), 0) : 0;
  const pct = test ? Math.round((score / test.questions.length) * 100) : 0;
  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Test Selection Screen ──
  if (activeTest === null) {
    return (
      <div className="fade-up">
        <div style={{ marginBottom: 24 }}>
          <h2 className="display" style={{ fontSize: 28, color: "#fff", lineHeight: 1 }}>
            <span style={{ color: "#ff8800", marginRight: 8 }}>📝</span>MOCK TESTS — {MOCK_TESTS.length} EXAMS
          </h2>
          <p className="mono" style={{ color: "#445", fontSize: 11, marginTop: 4 }}># Timed exams · Instant scoring · Detailed review with explanations</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {MOCK_TESTS.map((t, i) => (
            <div key={i} className="card-glow" style={{ padding: 24, cursor: "pointer", borderColor: t.color + "25" }}
              onClick={() => startTest(i)}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <span style={{ fontSize: 32 }}>{t.icon}</span>
                <div>
                  <div className="display" style={{ fontSize: 18, color: t.color }}>{t.title}</div>
                  <div className="mono" style={{ fontSize: 10, color: "#556" }}>Test #{t.id}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div className="tag" style={{ background: t.color + "15", color: t.color, border: `1px solid ${t.color}30` }}>
                  {t.questions.length} Questions
                </div>
                <div className="tag" style={{ background: "#00bfff15", color: "#00bfff", border: "1px solid #00bfff30" }}>
                  ⏱ {t.time} min
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: "100%" }}>START TEST →</button>
            </div>
          ))}
        </div>

        {/* Test History */}
        {history.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <div className="mono" style={{ color: "#00ff88", fontSize: 11, marginBottom: 14 }}>&gt; TEST_HISTORY.log</div>
            <table className="table-style">
              <thead>
                <tr><th>TEST</th><th>SCORE</th><th>%</th><th>DATE</th></tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td style={{ color: "#a8bcc8" }}>{h.title}</td>
                    <td className="mono" style={{ color: "#00ff88" }}>{h.score}/{h.total}</td>
                    <td className="mono" style={{ color: Math.round((h.score / h.total) * 100) >= 70 ? "#00ff88" : "#ff4444" }}>
                      {Math.round((h.score / h.total) * 100)}%
                    </td>
                    <td className="mono" style={{ color: "#556", fontSize: 10 }}>{h.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Results Screen ──
  if (submitted && !reviewMode) {
    return (
      <div className="fade-up">
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
          <div className="display" style={{ fontSize: 20, color: test.color, marginBottom: 8 }}>{test.title}</div>
          <div className="display" style={{ fontSize: 64, color: pct >= 80 ? "#00ff88" : pct >= 50 ? "#ffaa00" : "#ff4444", lineHeight: 1 }}>
            {score}/{test.questions.length}
          </div>
          <div className="display" style={{ fontSize: 28, color: pct >= 80 ? "#00ff88" : pct >= 50 ? "#ffaa00" : "#ff4444", margin: "8px 0 20px" }}>
            {pct}%
          </div>
          <div style={{ fontSize: 16, color: "#a8bcc8", marginBottom: 24, lineHeight: 1.6 }}>
            {pct >= 80 ? "🔥 Excellent! You're well-prepared!" : pct >= 50 ? "👍 Good effort — review wrong answers" : "📚 Keep studying — review all explanations below"}
          </div>

          {/* Per-question breakdown */}
          <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
            {test.questions.map((q, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: 4,
                background: answers[i] === q.ans ? "#00ff8825" : "#ff444425",
                border: `1px solid ${answers[i] === q.ans ? "#00ff8860" : "#ff444460"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, color: answers[i] === q.ans ? "#00ff88" : "#ff4444",
                fontFamily: "'Share Tech Mono', monospace"
              }}>
                {i + 1}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => setReviewMode(true)}>REVIEW ANSWERS</button>
            <button className="btn btn-ghost" onClick={() => startTest(activeTest)}>RETRY TEST</button>
            <button className="btn btn-danger" onClick={goBack}>← ALL TESTS</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Review Mode ──
  if (reviewMode) {
    return (
      <div className="fade-up">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="display" style={{ fontSize: 22, color: test.color }}>
            {test.icon} {test.title} — REVIEW
          </h2>
          <button className="btn btn-ghost" onClick={goBack}>← BACK TO TESTS</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {test.questions.map((q, i) => {
            const correct = answers[i] === q.ans;
            return (
              <div key={i} className="card" style={{ padding: 18, borderLeft: `3px solid ${correct ? "#00ff88" : "#ff4444"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span className="mono" style={{ color: correct ? "#00ff88" : "#ff4444", fontSize: 12 }}>
                    Q{i + 1} {correct ? "✓ CORRECT" : "✗ WRONG"}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: "#e8eef5", lineHeight: 1.5, marginBottom: 10 }}>{q.q}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                  {q.opts.map((o, j) => (
                    <div key={j} style={{
                      padding: "6px 10px", borderRadius: 4, fontSize: 12,
                      background: j === q.ans ? "#00ff8815" : j === answers[i] && !correct ? "#ff444415" : "#0d1117",
                      border: `1px solid ${j === q.ans ? "#00ff8840" : j === answers[i] && !correct ? "#ff444440" : "#1e2a3a"}`,
                      color: j === q.ans ? "#00ff88" : j === answers[i] && !correct ? "#ff6666" : "#778"
                    }}>
                      <span className="mono" style={{ marginRight: 6, fontSize: 10 }}>{String.fromCharCode(65 + j)}.</span>
                      {o} {j === q.ans && " ✓"} {j === answers[i] && !correct && " ✗"}
                    </div>
                  ))}
                </div>
                <div style={{ padding: "8px 12px", background: "#00ff8808", borderRadius: 4, border: "1px solid #00ff8820" }}>
                  <span className="mono" style={{ fontSize: 9, color: "#00ff8880" }}>EXPLANATION: </span>
                  <span style={{ fontSize: 12, color: "#8a9ba8" }}>{q.exp}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Active Test Screen ──
  return (
    <div className="fade-up">
      {/* Header with timer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <span style={{ fontSize: 18 }}>{test.icon}</span>
          <span className="display" style={{ fontSize: 18, color: test.color, marginLeft: 8 }}>{test.title}</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div className="mono" style={{ fontSize: 14, color: timeLeft < 60 ? "#ff4444" : timeLeft < 180 ? "#ffaa00" : "#00ff88" }}>
            ⏱ {formatTime(timeLeft)}
          </div>
          <button className="btn btn-danger" style={{ fontSize: 10 }} onClick={submitTest}>SUBMIT TEST</button>
        </div>
      </div>

      {/* Question navigation dots */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {test.questions.map((_, i) => (
          <div key={i} onClick={() => setQi(i)}
            style={{
              width: 28, height: 28, borderRadius: 4, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontFamily: "'Share Tech Mono', monospace",
              background: i === qi ? test.color + "30" : answers[i] !== undefined ? "#00ff8815" : "#0d1117",
              border: `1px solid ${i === qi ? test.color : answers[i] !== undefined ? "#00ff8830" : "#1e2a3a"}`,
              color: i === qi ? test.color : answers[i] !== undefined ? "#00ff88" : "#445",
            }}>
            {i + 1}
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{ height: 3, background: "#1e2a3a", borderRadius: 2, marginBottom: 20 }}>
        <div style={{ height: "100%", background: test.color, borderRadius: 2, width: `${((qi + 1) / test.questions.length) * 100}%`, transition: "width .4s" }} />
      </div>

      {/* Question */}
      <div className="card" style={{ padding: 28, maxWidth: 720, marginBottom: 20 }}>
        <div className="mono" style={{ color: test.color, fontSize: 12, marginBottom: 16 }}>
          QUESTION {qi + 1} OF {test.questions.length}
        </div>
        <h3 style={{ fontSize: 17, color: "#e8eef5", marginBottom: 20, lineHeight: 1.5 }}>{question.q}</h3>
        {question.opts.map((o, i) => (
          <div key={i}
            className="mcq-opt"
            onClick={() => selectAnswer(i)}
            style={{
              cursor: "pointer",
              borderColor: answers[qi] === i ? test.color + "60" : "#1e2a3a",
              background: answers[qi] === i ? test.color + "12" : "transparent",
              color: answers[qi] === i ? test.color : "#c8d6e5"
            }}>
            <span className="mono" style={{ color: answers[qi] === i ? test.color : "#334", marginRight: 10, fontSize: 12 }}>
              {String.fromCharCode(65 + i)}.
            </span>{o}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", maxWidth: 720 }}>
        <button className="btn btn-ghost" onClick={() => setQi(q => Math.max(0, q - 1))} disabled={qi === 0}>← PREVIOUS</button>
        <span className="mono" style={{ color: "#556", fontSize: 11, alignSelf: "center" }}>
          {Object.keys(answers).length}/{test.questions.length} answered
        </span>
        {qi < test.questions.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setQi(q => q + 1)}>NEXT →</button>
        ) : (
          <button className="btn btn-primary" onClick={submitTest}>SUBMIT TEST ✓</button>
        )}
      </div>
    </div>
  );
}
