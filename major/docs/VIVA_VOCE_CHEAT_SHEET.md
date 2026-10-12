# AI CYBER GUARDIAN (2026–2027)
## Viva Voce Comprehensive Defense Cheat Sheet

**Project:** AI Cyber Guardian Enterprise Control Plane  
**Target:** Master Thesis Defense / Final Engineering Examination  
**Scope:** Architecture, Machine Learning, Deception Security, Concurrency, and Live Demonstration  

---

## Category 1: Architecture & Data Flow

### Q1: Why did you choose FastAPI for the Control Plane rather than Flask or Django?
**Answer:**
FastAPI is built on top of Starlette and Pydantic, providing native asynchronous non-blocking I/O (`async`/`await`) powered by `uvloop`. In a high-throughput cybersecurity control plane, synchronous frameworks (like standard Flask or Django) block worker threads while awaiting Redis lookups or database persistence, severely constraining concurrency. FastAPI allows thousands of concurrent request evaluations and WebSocket telemetry broadcasts per second on a single worker process with minimal memory footprint.

### Q2: What is the exact data path an incoming HTTP request takes through the system?
**Answer:**
1. **Edge Ingress**: Client request reaches Caddy reverse proxy on port 443/80. Caddy terminates TLS and forwards the request to the upstream target application (`sample-target-app`).
2. **SDK Middleware Interception**: The Guardian SDK (`@guardian/sdk-node` or `cyber-guardian`) intercepts the request before it reaches the application route handlers.
3. **Local Cache Check**: SDK checks its in-memory LRU cache with the request signature. If clean and within TTL, it passes through in **$0.04\text{ms}$**.
4. **Control Plane Ingestion**: On cache miss, the SDK issues a synchronous inspection call to `POST /api/v1/ingestion/evaluate`.
5. **Dual Evaluation**:
   - Rule Engine runs deterministic regexes and Shannon entropy checks $\to R \in [0, 100]$.
   - ML Engine extracts 80 features and evaluates the Random Forest and Isolation Forest models $\to M \in [0, 100]$.
6. **Threat Fusion**: The engine calculates the adaptive weight $\beta$ and produces composite score $S = \alpha R + \beta M$.
7. **Action Dispatch**:
   - If $S < 60$: Passed through.
   - If $60 \le S < 85$: Blocked with HTTP 403.
   - If $S \ge 85$: Diverted to Honeypot VFS.
8. **Real-Time Telemetry**: Broadcasted via WebSocket to React 19 SOC Dashboard in $< 100\text{ms}$.

### Q3: Why is Redis utilized alongside PostgreSQL in this architecture?
**Answer:**
PostgreSQL provides ACID-compliant, persistent relational storage for complex analytics (timeseries aggregation, incident reporting, tenant structures, and STIX logs via SQLAlchemy 2.0). However, evaluating rate limits or IP ban states requires sub-millisecond lookups. Redis operates entirely in-memory, handling atomic token bucket rate limiting and IP blacklisting in under $0.5\text{ms}$ without causing relational database lock contention.

---

## Category 2: Machine Learning & Feature Engineering

### Q4: Why combine Isolation Forest with Random Forest rather than using a Deep Neural Network?
**Answer:**
1. **Inference Latency**: Deep neural networks (e.g., Bi-LSTMs or Transformers) typically require 20ms to 150ms per forward pass, which violates our $< 5\text{ms}$ inline inspection budget. Our tree ensemble executes in **$1.56\text{ms}$**.
2. **Zero-Day Detection vs Classification**: Supervised models (Random Forest) excel at classifying known attack patterns (SQLi, XSS, Path Traversal) but struggle with previously unseen zero-day attacks. Isolation Forest is an unsupervised outlier detector that flags structural anomalies regardless of signature familiarity.
3. **Interpretability**: Tree models allow feature importance ranking and transparent decision auditing, which is critical for SOC compliance.

### Q5: Explain your 80-dimensional feature extraction pipeline.
**Answer:**
The feature vector $\mathbf{v} \in \mathbb{R}^{80}$ consists of two distinct groups:
1. **16 Domain & Statistical Features**:
   - String length and Shannon entropy ($H(X)$) to capture obfuscation and high-entropy base64 strings.
   - Punctuation, digit, and uppercase character density ratios.
   - Exact delimiter frequency counts: `'`, `"`, `<`, `>`, `;`, `/`, `\`, `-`.
   - Keyword density metrics representing specific attack vocabularies (SQL, XSS, Path Traversal, RCE, Recon).
2. **64 Character N-Gram TF-IDF Features**:
   - Extracted using character n-grams of size $(2, 3)$.
   - Captures sub-token syntactic fragments such as `' `, `or`, `--`, `<s`, `cr`, `..`, `/e` that survive word-boundary obfuscation.

### Q6: How does the Threat Fusion Engine calculate dynamic weights $\alpha$ and $\beta$?
**Answer:**
The fusion formula is:

$$S = \alpha \cdot R + \beta \cdot M$$

Where $\beta$ is dynamically computed from model prediction confidence:

$$\beta = 0.40 + 0.30 \cdot (2 \cdot |P(\text{Malicious}) - 0.5|)$$

$$\alpha = 1.0 - \beta$$

- If the ML model is highly confident ($P \approx 1.0$ or $P \approx 0.0$), $\beta$ increases to **$0.70$**, granting the statistical model authority over minor signature mismatches.
- If the ML model is ambiguous ($P \approx 0.50$), $\beta$ falls to **$0.40$**, guaranteeing that deterministic rules dominate ($\alpha = 0.60$) to prevent spurious false positives.

### Q7: On the 625 held-out test samples, your model achieved 100% accuracy and 0.00% FPR. How do you defend against claims of overfitting?
**Answer:**
1. **Independent Stratified Split**: The model was evaluated on an independent 25% test partition never seen during training.
2. **Regularization Parameters**: The Random Forest was strictly constrained to `max_depth=16`, preventing individual trees from memorizing leaf node samples.
3. **Bagging & Feature Subsampling**: Random Forest creates decorrelated decision trees by sampling random subsets of features at each split.
4. **Domain Realism**: Web injection attacks exhibit sharp syntactic boundaries (delimiters like single quotes, angle brackets, and path dots) that do not appear in normal web query parameters, making clean mathematical separation both achievable and valid.

---

## Category 3: Honeypot & Deception Security

### Q8: What makes the in-memory Virtual File System (VFS) immune to honeypot escape vulnerabilities?
**Answer:**
Traditional honeypots (like Cowrie or Docker-based decoys) run inside actual Linux operating system environments. If a zero-day Linux kernel privilege escalation or container escape exists (e.g., Dirty COW, CVE-2024-21626), an attacker could compromise the underlying host server.  
In AI Cyber Guardian, our VFS is a **pure Python in-memory state tree**. When an attacker runs `cat /etc/shadow`, the command is parsed by a Python dictionary lookup. We **never** invoke `subprocess.Popen`, `os.system`, or shell execution. It is mathematically impossible for an attacker to break out into the host OS kernel because no OS kernel calls are ever made on their behalf.

### Q9: How do Canary Honeytoken Tripwires work?
**Answer:**
Canary tokens are realistic, high-entropy deception credentials seeded inside fake configuration files in the VFS (e.g., `AWS_SECRET_ACCESS_KEY`, `DATABASE_URL`, `ADMIN_TOKEN`). When an attacker executes a command that accesses or reads these files (e.g., `cat /home/admin/.aws/credentials`), the honeypot session registers a `TRIPPED` state. This generates an irreversible high-priority security event, locks the attacker's IP profile in the database, and flags the session in STIX 2.1 intelligence.

### Q10: What is STIX 2.1 and why is it implemented?
**Answer:**
OASIS STIX (Structured Threat Information Expression) 2.1 is the global open standard for sharing cyber threat intelligence. Rather than outputting proprietary text logs, AI Cyber Guardian serializes attacker telemetry into standardized STIX 2.1 JSON objects (`indicator`, `attack-pattern`, `observed-data`). This allows enterprise SOC teams to ingest threat intelligence directly into SIEM/SOAR platforms such as Splunk, Microsoft Sentinel, or OpenCTI with zero transformation.

---

## Category 4: Concurrency, Performance & Edge Cases

### Q11: How do you prevent race conditions in your sliding-window rate limiter under concurrent burst attacks?
**Answer:**
In a distributed environment, standard "read-then-write" database queries produce race conditions where concurrent requests pass before the count increments. AI Cyber Guardian utilizes **Redis Atomic Pipelines**:
```python
pipe = redis.pipeline()
pipe.zremrangebyscore(key, 0, current_time - window)
pipe.zadd(key, {request_id: current_time})
pipe.zcard(key)
pipe.expire(key, window)
results = pipe.execute()
```
Because the pipeline executes as an atomic script in Redis's single-threaded event loop, all sliding-window checks are free of concurrency race conditions.

### Q12: What is the Fail-Open design, and why is it preferred over Fail-Closed?
**Answer:**
In enterprise mission-critical web applications, availability is paramount. If the Control Plane backend or Redis cluster suffers a catastrophic failure, a "Fail-Closed" WAF would block all incoming traffic, causing an immediate self-inflicted Denial of Service (DoS) for paying customers.  
Our Guardian SDK implements a **Fail-Open circuit breaker**. If the control plane fails to respond within a strict timeout (e.g., 200ms), the SDK catches the exception, emits an emergency system log, and allows the request through to the application backend.

### Q13: How does the SDK's local LRU decision cache ensure consistency if a previously benign user suddenly launches an attack?
**Answer:**
1. **Short TTL**: Cached clean decisions expire after a brief TTL (e.g., 30 to 60 seconds).
2. **Payload Differentiation**: The cache key is a cryptographic hash of both the `Client IP` AND the `Normalized URL Path`. If the user submits query parameters or a body payload, the cache key changes, triggering inline evaluation.
3. **Decoy Isolation**: Requests targeting known decoy paths (e.g., `/.env`) completely bypass the cache and route directly into the honeypot.

---

## Category 5: Industry Comparison & Enterprise Positioning

### Q14: How does AI Cyber Guardian compare to Cloudflare WAF?
**Answer:**
- **Cloudflare**: Operates as an external DNS reverse proxy. All traffic must route through Cloudflare's servers, creating vendor lock-in and potential data residency/compliance issues. Cloudflare does not offer in-application stateful Linux honeypots or custom Canary honeytokens.
- **AI Cyber Guardian**: Runs on-premise or within private cloud infrastructure as a lightweight SDK and microservice control plane. Data never leaves the enterprise boundary. It provides active in-memory deception honeypots that trap adversaries rather than simply dropping their packets.

### Q15: How does AI Cyber Guardian compare to ModSecurity?
**Answer:**
- **ModSecurity**: Relies purely on thousands of regular expression patterns (OWASP CRS). It cannot detect zero-day attacks without new rules, suffers from high false-positive rates on complex JSON inputs, and causes notable latency degradation as rules expand.
- **AI Cyber Guardian**: Combines rules with an 80-dimensional machine learning pipeline that identifies unknown structural anomalies in $< 3\text{ms}$ with 0% FPR, backed by active honeypots and real-time WebSocket telemetry.

---

## Category 6: 1-Click Live Demonstration Script

Follow this step-by-step checklist to conduct a live demonstration for the examiners:

### Step 1: Pre-Flight Verification
Open PowerShell and verify that all test suites are green:
```powershell
cd "guardian-control-plane"
py -m pytest -v
```
*Expected Result: 55 / 55 tests pass cleanly.*

### Step 2: Launch the Ecosystem
Start the Control Plane, Target App, and React Dashboard:
1. **Control Plane Backend** (Port 8000):
   ```powershell
   cd "guardian-control-plane"
   py -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **React SOC Dashboard** (Port 5173):
   ```powershell
   cd "cyberprep-app"
   npm run dev
   ```
3. **Protected Target App** (Port 3001):
   ```powershell
   cd "sample-target-app"
   node server.js
   ```

### Step 3: Demonstrate Benign Traffic (Score < 30)
In a new terminal or browser:
```powershell
curl -i "http://localhost:3001/api/products?q=laptop"
```
*Examiner Observation:*
- Returns HTTP 200 OK with product list.
- React SOC Dashboard shows green "LOW" event (Score: 5–15).
- Audio remains silent; request passes untouched.

### Step 4: Demonstrate SQL Injection Block (Score > 85, HTTP 403)
Execute an injection payload:
```powershell
curl -i "http://localhost:3001/api/products?q=' UNION SELECT null, username, password FROM users --"
```
*Examiner Observation:*
- Target App returns immediate **HTTP 403 Forbidden** with JSON alert: `{"error": "Forbidden: Request blocked by AI Cyber Guardian"}`.
- React Dashboard triggers a high-pitched audio alert chime and flashes a red "CRITICAL / HIGH" row.
- ML Feature breakdown displays elevated single quote density and SQL keyword matches.

### Step 5: Demonstrate Decoy Honeypot Trap & Canary Exfiltration
Probe a hidden decoy file:
```powershell
curl -i "http://localhost:3001/.env"
```
*Examiner Observation:*
- Attacker receives a synthetic `.env` file containing fake credentials (`AWS_SECRET_ACCESS_KEY=AKIA_CANARY...`).
- React SOC Dashboard logs a **Honeypot Trap Event**.
- Attacker IP is permanently flagged with `TRIPPED` status.

### Step 6: Demonstrate STIX 2.1 Export & Executive PDF Generation
1. On the React SOC Dashboard, click **"STIX 2.1 Export"** $\to$ Examiner views formal OASIS STIX JSON threat bundle.
2. Click **"Export PDF"** in the top navigation bar $\to$ Browser downloads `AI_Cyber_Guardian_Threat_Report_YYYY-MM-DD.pdf`.
3. Open the PDF $\to$ Show examiners the two-pass running header ("Page X of Y"), scorecard, top attacking IPs, honeypot command logs, and cryptographic sign-off block.

---
