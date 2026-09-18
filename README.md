# 🛡️ AI Cyber Guardian

An AI-powered, real-time autonomous web application security platform that detects, blocks, and traps cyber attackers.

---
## 🚀 What It Does
AI Cyber Guardian acts as an intelligent zero-trust security layer that sits in front of any web application. Every incoming HTTP request passes through a two-stage detection pipeline:

1. **Stage 1 — Ingress Filter**: Instant IP blocklist/allowlist check and sliding-window Redis-based rate limiting (sub-millisecond evaluation with fail-open safety).
2. **Stage 2 — AI Decision Engine & Threat Fusion**: Combines a deterministic rule engine (covering SQLi, XSS, Command Injection, Path Traversal, Brute Force, and Vulnerability Scanners with double URL-decoding) with two trained Machine Learning models (Isolation Forest for zero-day anomaly detection + Random Forest for attack classification) to produce an authoritative unified threat score (0–100).

Based on the score, the platform automatically **logs**, **blocks**, **alerts**, or **deploys an adaptive honeypot trap** — returning a convincing virtual Linux shell and fake admin surface to keep attackers trapped while recording complete forensic telemetry.

---
## ✨ Key Features

- **🔍 Real-Time Autonomous Defense**: Immediate mitigation against SQLi, XSS, Command Injection, Brute Force, Path Traversal, and Automated Scanners (`sqlmap`, `nikto`, `hydra`, `nmap`).
- **🤖 Machine Learning Threat Fusion**: Combines deterministic signature matching with scikit-learn ML anomaly detection to minimize false positives and catch zero-day exploits.
- **🍯 Enterprise Deception Subsystem**:
  - **Stateful Virtual Linux Shell (VFS)**: Trap attackers in an interactive sandbox with simulated root privileges and commands (`id`, `ls`, `cat`, `whoami`, `uname`).
  - **Canary Honeytokens**: Seeded high-value targets (fake AWS credentials, `/etc/shadow`, database connection strings) with automated tripwires.
  - **Multi-Surface Lures**: Attractive decoy endpoints (`/.env`, `/.git`, `/wp-login.php`, `/actuator/env`).
  - **Adaptive Tarpit**: Dynamic artificial latency injection (500ms–5000ms) to throttle and exhaust attacker automation bandwidth.
  - **STIX 2.1 Threat Intelligence**: Auto-export attacker profiles directly into standard STIX 2.1 JSON bundle formats.
- **📊 SOC Live Analytics Dashboard**:
  - 10 interactive views: Overview, Live Threat Feed (Full Log), Analytics, Geo Threat Radar Map, Blocked IPs, Honeypot Sessions, Attacker Profiles Grid, Attacker Deep Dive Profile, Site Management, Reports & Settings.
  - Recharts-powered donut charts, 24-hour threat timelines, and ML model performance matrices.
- **🐍 3-Line Middleware SDK**: Lightweight Express / Python middleware to protect any application in minutes.
- **🐳 Full Docker Containerization**: Packaged with Docker Compose for single-command production deployment.

---

## 🏗️ System Architecture

```text
Incoming HTTP Request
        │
        ▼
┌──────────────────────────────────────┐
│  Stage 1: Ingress Filter             │  Redis Sliding Window Rate Limiter & CIDR Filter
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Stage 2: Threat Fusion Engine       │  Rule Engine (R1-R6) + Isolation Forest + Random Forest
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Stage 3: Autonomous Response        │  LOW (Log) | MEDIUM (Alert) | HIGH (Block) | CRITICAL (Honeypot)
└──────────────────┬───────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐     ┌────────────────────────────────────────────────┐
│ Postgres DB  │     │ Enterprise Deception Subsystem                 │
│ & Redis Data │     │ Virtual Shell · Canary Tokens · Adaptive Tarpit │
└───────┬──────┘     └────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ React 19 + Recharts SOC Dashboard (Dual Telemetry)     │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend API** | FastAPI (Python 3.11), Uvicorn, Pydantic |
| **Detection Engine** | Scikit-learn (Isolation Forest + Random Forest), NumPy |
| **Database & Cache** | PostgreSQL 15, Redis 7 (with SQLite & in-memory fallbacks) |
| **Deception Honeypot** | Virtual File System (VFS), Canary Honeytoken Engine, Adaptive Tarpit |
| **Threat Intel** | STIX 2.1 Cyber Threat Intelligence Exporter |
| **Frontend Dashboard** | React 19, Vite, Recharts, Custom Design System Tokens |
| **Client SDK** | Node.js / Express Middleware, Python Middleware |
| **Deployment** | Docker, Multi-Stage Dockerfile, Docker Compose, Nginx |

---

## 📁 Repository Structure

```text
├── docker-compose.yml              # Complete 4-tier Docker stack (DB, Redis, Backend, Frontend)
├── guardian-control-plane/         # FastAPI Backend Control Plane
│   ├── api/routers/                # API routes (decisions, honeypot, reporting, firewall)
│   ├── core/                       # Ingress filters, ML engine, rule engine, decision engine
│   ├── honeypot/                   # VFS shell, canary tokens, traps, tarpit, STIX export
│   ├── models/ & db/               # SQLAlchemy schema and database connections
│   ├── tests/                      # Automated Pytest suite
│   ├── Dockerfile                  # Production container definition
│   └── requirements.txt            # Python dependencies
├── cyberprep-app/                  # React 19 SOC Frontend Dashboard
│   ├── src/components/             # Master AICyberGuardianApp & sub-views
│   ├── src/services/               # Live API integration client
│   ├── Dockerfile                  # Multi-stage build + Nginx production server
│   ├── nginx.conf                  # Production reverse proxy config
│   └── package.json                # Frontend dependencies
├── guardian-sdk-node/              # Client SDK middleware for Node.js / Express
├── simulate_attacks.py             # Live attack stream generator (SQLi, XSS, Scanners)
├── simulate_honeypot.py            # Automated honeypot & tarpit verification tool
└── README.md
```

---

## ⚡ Quick Start

### 1. Run Everything with Docker Compose

```bash
docker compose up --build
```

- **Frontend Dashboard**: [http://localhost:80](http://localhost:80)
- **Backend API & Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### 2. Manual Local Development

#### Start Backend:
```bash
cd guardian-control-plane
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### Start Frontend:
```bash
cd cyberprep-app
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Automated Testing & Attack Simulations

### Run Backend Unit Tests:
```bash
cd guardian-control-plane
pytest tests/test_engines.py -v
```

### Run Attack Simulator:
```bash
python simulate_attacks.py
```

### Run Honeypot & Tarpit Simulator:
```bash
python simulate_honeypot.py
```

---

## 🎯 Threat Decision Matrix

| Score | Severity | Autonomous Defense Action |
|---|---|---|
| **0 – 29** | 🟢 **LOW** | Pass through & record audit log |
| **30 – 59** | 🟡 **MEDIUM** | Pass through + Alert team + Flag session |
| **60 – 84** | 🟠 **HIGH** | Immediate 403 Block + Temporary IP ban + Lock session |
| **85 – 100** | 🔴 **CRITICAL** | Silent route to Honeypot + Canary Tokens + Adaptive Tarpit |

---

## ⚠️ Ethical Use Notice

This software is designed exclusively for defensive research and web application protection. All attack simulation modules must only be executed against systems you own or have explicit written authorization to test.
