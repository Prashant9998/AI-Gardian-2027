# 🛡️ NovaTech Enterprise — Vulnerable Web Application
### Real-Time Cyber Attack Lab & Demonstration Target for AI Cyber Guardian

This web application simulates an enterprise portal with intentional OWASP Top 10 vulnerabilities. It is purpose-built for **Major Project Presentations, Viva Voce Examinations, and Research Benchmarking** to demonstrate how **AI Cyber Guardian** detects, intercepts, and mitigates threats in real time.

---

## 🌟 Key Features

1. **Dual Defense Modes**:
   - 🔴 **Unprotected Mode**: Attack payloads succeed, dumping database records, triggering stored XSS, and leaking system files.
   - 🟢 **AI Guardian Protected Mode**: Requests are inspected in real time by the AI Threat Fusion engine (CSIC 2010 trained ML model + Signature Rules). Attacks with Risk Score $\ge 75$ are immediately blocked with forensic proof.
2. **Built-in 1-Click Exploit Lab**:
   - Ready-made buttons for viva examiners to trigger SQL Injection, XSS, Path Traversal, and Automated Scanner Probes without needing external penetration tools like Burp Suite.
3. **Live Telemetry & Forensic Stream**:
   - Real-time event log with Risk Scores ($0 - 100$), Detection Confidence, Triggered Signatures, Decision Latency ($\approx 12\text{ms}$), and Action (`ALLOW`, `BLOCK`, `DECEIVE_HONEYPOT`).
4. **Vercel & Cloud Ready**:
   - Configured with `vercel.json` and serverless functions in `/api` for 1-click cloud hosting.
   - Zero-dependency static frontend (`/public/index.html`) using enterprise slate UI tokens.

---

## 🎯 Vulnerability Surface & Attack Scenarios

| Vulnerability Type | Vulnerable Endpoint | Example Viva Test Payload | Unprotected Outcome | Protected Outcome (AI Guardian) |
|---|---|---|---|---|
| **SQL Injection (Search)** | `GET /api/search?q=...` | `' UNION SELECT user, password_hash FROM admin_users--` | Dumps admin credentials & hashed passwords | 🛑 `403 FORBIDDEN` — SQLi signature flagged (Score: 96) |
| **Authentication Bypass** | `POST /api/login` | Username: `admin' OR '1'='1` / Pass: `any` | Bypasses auth and logs in as Administrator | 🛑 `403 FORBIDDEN` — Auth bypass pattern intercepted (Score: 94) |
| **Stored XSS** | `POST /api/reviews` | `<script>alert('Stealing session token: ' + document.cookie)</script>` | Injects script into DOM and executes in victim browser | 🛑 `403 FORBIDDEN` — Script tag execution blocked (Score: 91) |
| **Path Traversal / LFI** | `GET /api/files?file=...` | `../../../../etc/passwd` | Leaks simulated server `/etc/passwd` configuration | 🛑 `403 FORBIDDEN` — Directory traversal sequence halted (Score: 88) |
| **Recon Probing** | `GET /.env`, `GET /wp-config.php` | Probing hidden configuration files | Reveals system environment variables | 🪤 `200 HONEYPOT` — Redirected to synthetic fake deception layer |

---

## 🚀 Quick Start (Local Run)

### Prerequisites
- Node.js (v18 or higher)
- (Optional) AI Cyber Guardian Control Plane running on `http://localhost:8000`

### Step 1: Install Dependencies
```bash
cd vulnerable-web-app
npm install
```

### Step 2: Start the Web App
```bash
npm start
```
The application will launch at: **`http://localhost:3002`**

*(Note: If the AI Cyber Guardian FastAPI backend on `http://localhost:8000` is running, the app automatically relays payloads to it. If it is offline, the app utilizes an embedded threat scoring engine with the identical CSIC 2010 weights so demonstrations always run smoothly without interruption).*

---

## ☁️ 1-Click Deployment to Vercel

You can deploy this vulnerable test lab to Vercel in less than 2 minutes:

### Option 1: Via Vercel Web Dashboard (Recommended)
1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository (`AI-Gardian-2027`).
4. In the configuration screen:
   - **Root Directory**: Click edit and select `vulnerable-web-app`.
   - **Framework Preset**: `Other`.
5. Click **Deploy**. Vercel will provide a live HTTPS link (e.g. `https://novatech-lab-demo.vercel.app`).

### Option 2: Via Vercel CLI
```bash
cd vulnerable-web-app
npm install -g vercel
vercel --prod
```

---

## 🔗 Connecting to AI Cyber Guardian

There are two primary ways to route traffic from this website to AI Cyber Guardian:

### Method A: Direct Cloud / Client-Side Relay (Zero Setup)
In the top navigation bar of `http://localhost:3002`, ensure the toggle is set to **"🛡️ AI Cyber Guardian SHIELD: ON"**.  
Every action in the catalog, login form, reviews, and file viewer will be validated against the AI Decision Gateway before reaching the database.

### Method B: Zero-Code Reverse Proxy Gateway (Enterprise Architecture)
If you run the AI Cyber Guardian Control Plane (`guardian-control-plane`):
1. Start the control plane:
   ```bash
   cd guardian-control-plane
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. Send requests to the Guardian Reverse Proxy endpoint pointing to the vulnerable app:
   ```
   http://localhost:8000/proxy?target=http://localhost:3002/api/search?q=' UNION SELECT 1,2,3--
   ```
3. Watch the attack get analyzed in the AI Cyber Guardian Dashboard (`http://localhost:5173`) with live websocket alerts, feature vector graphs, and ML anomaly scores!

---

## 📋 Viva Voce / Presentation Demonstration Script

When presenting to the examination committee:

1. **Show Normal Operation**:
   - Turn **Shield: OFF**.
   - Search for `Gateway`. Show that normal products appear.
   - Point to the Telemetry Stream showing low risk score ($<10\%$) and `200 ALLOW`.

2. **Demonstrate Vulnerability (The Problem)**:
   - Click the test chip: **`' UNION SELECT ...`**.
   - Show the panel that the website dumped the admin password hashes and 2FA secret keys.
   - Explain: *"Without intelligent protection, conventional web apps are susceptible to data breaches."*

3. **Demonstrate AI Cyber Guardian (The Solution)**:
   - Turn **Shield: ON**.
   - Click the same chip: **`' UNION SELECT ...`**.
   - Show the **AI Defense Intercept Modal**:
     - Risk Score: **96 / 100**
     - Classification: **CRITICAL / SQL_INJECTION**
     - Latency: **~12ms**
     - Action: **BLOCKED (403 Forbidden)**
   - Show that no sensitive database records were disclosed.

4. **Demonstrate Honeypot Deception**:
   - Click the chip: **`Recon Scanner Probe`**.
   - Show how the system deploys synthetic deception to waste the attacker's resources and gather threat intelligence without alerting the intruder.
