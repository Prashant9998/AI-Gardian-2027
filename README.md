🛡️ AI Cyber Guardian

An AI-powered, real-time web application security platform that detects, blocks, and traps attackers — built as a B.Tech Major Project at UCER Prayagraj (AKTU), 2026.


🚀 What It Does
AI Cyber Guardian acts as an intelligent security layer that sits in front of any web application. Every incoming HTTP request passes through a two-stage detection pipeline:

Stage 1 — Ingress Filter: Instant IP blocklist/allowlist check and Redis-based rate limiting (sub-1ms).
Stage 2 — AI Decision Engine: Combines a rule-based engine (6 attack rules) with two trained ML models (Isolation Forest + Random Forest) to produce a unified threat score (0–100).

Based on the score, the platform automatically logs, blocks, sends alerts, or deploys a honeypot — returning a convincing fake admin panel to trap the attacker while silently recording everything they do.

✨ Key Features

🔍 Real-time threat detection — SQLi, XSS, brute force, path traversal, and scanner detection
🤖 Dual ML models — Isolation Forest (anomaly) + Random Forest (classifier) trained on CSIC 2010 HTTP dataset
🍯 AI Honeypot — CRITICAL threats get a fake admin panel (HTTP 200 OK) instead of a block page
📊 Live analytics dashboard — 10 real-time panels with WebSocket-powered charts
🌍 Attacker intelligence — geo-location, tool fingerprinting, full session profiling
📄 PDF threat reports — export dashboard analytics as a downloadable report
🐍 Python SDK — pip-installable package, integrates any Python web app in under 15 minutes
🔐 Multi-client SaaS — each client manages their own websites, API keys, and threat history



🏗️ Architecture
Incoming HTTP Request
        │
        ▼
┌─────────────────────┐
│  Stage 1 — Ingress  │  Rate limiter (Redis) + IP blocklist/allowlist
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Stage 2 — AI Engine│  Rule Engine (P3) + ML Models (P2) → Combined Score
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Defence Engine    │  Log / Email Alert / Block / Honeypot
└─────────┬───────────┘
          │
          ▼
   PostgreSQL + Redis         ←→      React Dashboard (WebSocket)
Score Formula: combined_score = min(100, rule_score + (ml_score × 30))



🛠️ Tech Stack
LayerTechnologyBackend APIFastAPI (Python 3.11)ML Modelsscikit-learn — Isolation Forest + Random ForestDatabasePostgreSQL 15Cache / Rate LimitingRedis 7Frontend DashboardReact 18 + Chart.jsHoneypot TemplatesJinja2AuthenticationPyJWT (HS256) + bcryptGeolocationip-api.com (cached in Redis)NotificationsSMTP email alertsSDKPython (pip-installable)DeploymentDocker + Docker Compose + Caddy (TLS)Training DatasetCSIC 2010 HTTP Dataset (~100K+ samples after augmentation)Attack SimulationKali Linux + DVWA

📁 Project Structure
ai-cyber-guardian/
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── routes/               # API endpoint definitions
│   ├── engine/
│   │   ├── ingress.py        # Stage 1 — rate limiter + blocklist
│   │   ├── decision.py       # Stage 2 — ML + rules combined scoring
│   │   ├── defence.py        # Automated response actions
│   │   └── rules.py          # 6 attack detection rules (P3)
│   ├── models/               # SQLAlchemy DB models
│   ├── ml/
│   │   ├── isolation_forest.pkl
│   │   ├── random_forest.pkl
│   │   └── scaler.pkl
│   ├── honeypot/
│   │   └── templates/        # Jinja2 fake HTML pages
│   └── migrations/           # Alembic DB migrations
│
├── ml-training/
│   ├── notebooks/            # Jupyter training experiments
│   ├── dataset/              # CSIC 2010 + DVWA augmented data
│   ├── train.py              # Model training pipeline
│   └── evaluate.py           # Accuracy, F1, confusion matrix
│
├── sdk/
│   ├── cyber_guardian/       # Python SDK package
│   └── pyproject.toml        # pip-installable config
│
├── frontend/
│   ├── src/
│   │   ├── pages/            # Landing page, Dashboard, Docs
│   │   ├── components/       # Charts, AttackerCard, ThreatFeed
│   │   └── hooks/            # useWebSocket, useThreats
│   └── vite.config.js
│
├── docs/
│   ├── Resolution_v1.0.docx  # Conflict resolution spec
│   └── QuickRef_Card.docx    # Team quick reference
│
└── docker-compose.yml

⚡ Quick Start
Prerequisites

Python 3.11+
Node.js 18+
Docker + Docker Compose
Redis 7
PostgreSQL 15

Run with Docker
bashgit clone https://github.com/your-username/ai-cyber-guardian.git
cd ai-cyber-guardian
docker-compose up --build
API will be live at http://localhost:8000
Dashboard at http://localhost:5173
API docs at http://localhost:8000/docs
SDK Installation
bashpip install cyber-guardian
pythonfrom cyber_guardian import Guardian

guardian = Guardian(site_id="your-site-id", api_key="your-api-key")

# In your web app middleware:
result = await guardian.check(request)

if result.action == "block":
    return HTTPResponse(status=403)
elif result.action == "honeypot":
    return HTMLResponse(result.honeypot_content, status=200)

🎯 Detection Rules
RuleAttack TypeTriggerSeverityR1SQL InjectionOR/UNION/DROP/SELECT/-- in body or paramsCRITICALR2XSS<script>/onerror/javascript: in body or paramsHIGHR3Brute Force (user)> 5 POST /login from same IP in 120sHIGHR4Brute Force (platform)> 20 POST /login from same IP in 120sCRITICALR5Path Traversal../ / etc/passwd / win.ini in URLHIGHR6Scanner Detectedsqlmap/nikto/nmap/hydra in User-AgentMEDIUM

📊 Threat Score → Actions
ScoreLevelAutomated Action0 – 29🟢 LOWLog only30 – 59🟡 MEDIUMLog + Email alert + Flag account60 – 84🟠 HIGHLog + Block IP + Lock account + Email85 – 100🔴 CRITICALBlock + Kill sessions + Return honeypot

👥 Team
MemberRoleResponsibilityP1AI EngineerFastAPI backend, decision engine, deployment, SDKP2ML EngineerModel training, feature engineering, dataset preparationP3Cybersecurity ExpertAttack rules, DVWA simulation, honeypot templatesP4Data ScientistDashboard, analytics, visualisation, PDF reports

📈 Model Performance Targets

Detection accuracy on CSIC 2010 test set: > 90%
False positive rate on clean traffic: < 10% (target < 5%)
Attack detection rate (sqlmap, XSStrike, nikto, hydra, ZAP): ≥ 85%
API response latency (p95): < 3 seconds end-to-end
Stage 1 ingress filter latency: < 1 ms


⚠️ Ethical Use
This project is built for defensive purposes only. All attack simulations were performed in an isolated, authorised lab environment using DVWA. This tool must only be deployed to protect websites you own or have explicit permission to protect. Misuse of any component of this system is strictly prohibited.
