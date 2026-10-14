# AI CYBER GUARDIAN (2026–2027)
## Ultimate Major Project Presentation & Viva Question Bank
### Comprehensive Guide for AKTU / University Project Evaluations

---

## 📑 TABLE OF CONTENTS
1. [Category 1: Core Concepts & Project Motivation](#category-1-core-concepts--project-motivation)
2. [Category 2: Machine Learning, Feature Engineering & Datasets](#category-2-machine-learning-feature-engineering--datasets)
3. [Category 3: Cyber Deception, Honeypots & Canary Tokens](#category-3-cyber-deception-honeypots--canary-tokens)
4. [Category 4: System Architecture, Latency & Engineering](#category-4-system-architecture-latency--engineering)
5. [Category 5: Reliability, High Availability & Fail-Open](#category-5-reliability-high-availability--fail-open)
6. [Category 6: Frontend, Vector GeoMap & Telemetry](#category-6-frontend-vector-geomap--telemetry)
7. [Category 7: Research Paper, Future Scope & Personal Contribution](#category-7-research-paper-future-scope--personal-contribution)

---

## Category 1: Core Concepts & Project Motivation

### Q1. What is the fundamental difference between a Traditional Firewall (Network Layer) and your system (Application Layer)?
* **Answer:**
  * **Network Firewalls (Layer 3/4)** like iptables or AWS Security Groups inspect IP addresses, TCP/UDP ports, and packet headers. They cannot inspect HTTP request payloads or understand application logic. If port 80/443 is open, all malicious web traffic passes straight through.
  * **AI Cyber Guardian (Layer 7)** operates at the Application Layer. It reconstructs and inspects the actual HTTP URI, query parameters, headers, cookies, and JSON/form bodies to detect SQLi, XSS, Path Traversal, and RCE exploits.

### Q2. Why not just use existing solutions like Cloudflare, AWS WAF, or ModSecurity?
* **Answer:**
  1. **Latency & Cloud Dependency**: Cloud WAFs add 25–60ms of round-trip network hop latency because traffic must route through their external edge servers. Our inline SDK operates in **< 3ms**.
  2. **Static Regex Fragility**: ModSecurity CRS relies on static regular expressions. A slight syntax variation or hex encoding evades them.
  3. **The "HTTP 403 Oracle" Problem**: Cloudfirewalls return an immediate 403 Forbidden, which acts as a debugging feedback loop for hackers. Our system uses deception to misdirect attackers instead of helping them refine their exploit.

### Q3. What is the OWASP Top 10, and which vulnerabilities does your system address?
* **Answer:**
  * OWASP (Open Worldwide Application Security Project) Top 10 represents the most critical web application security risks.
  * Our project specifically targets:
    * **A03:2021 - Injection** (SQL Injection, Command Injection/RCE)
    * **A01:2021 - Broken Access Control** (Path Traversal, LFI, accessing `.env` or `/admin`)
    * **A07:2021 - Identification & Authentication Failures** (Brute force on `/wp-login.php`)
    * **A05:2021 - Security Misconfiguration** (Exposed `.git/config`, Spring Actuator endpoints)

---

## Category 2: Machine Learning, Feature Engineering & Datasets

### Q4. Why did you use Random Forest and Isolation Forest instead of Deep Learning (CNN / LSTM / Transformers)?
* **Answer:**
  1. **Inference Latency Constraint**: Web applications require responses within milliseconds. A deep neural network (LSTM or Transformer) takes 35ms to 150ms per forward pass, which severely bottlenecks web throughput. Our tree ensemble inference takes only **1.56ms**.
  2. **Dual-Model Specialization**:
     * **Random Forest** is supervised and excels at multi-class classification for known attack categories (SQLi, XSS, etc.).
     * **Isolation Forest** is unsupervised and trained only on clean traffic; it isolates structural outliers to catch **unseen Zero-Day attacks**.
  3. **Interpretability & Determinism**: Decision trees allow feature-importance auditing, essential for enterprise security compliance.

### Q5. What dataset was used for training, and how was it preprocessed?
* **Answer:**
  * We utilized the benchmark **CSIC 2010 HTTP Dataset** developed by the Spanish National Research Council (CSIC). It contains thousands of HTTP requests categorized into normal traffic and diverse attacks (SQLi, XSS, CRLF, Path Traversal, Buffer Overflows).
  * We preprocessed requests by flattening the URI, query string, and body into unified strings, followed by a stratified 80/20 train-test split to ensure balanced representation across all attack classes.

### Q6. Explain what the "80-Dimensional Feature Vector" contains.
* **Answer:**
  Each HTTP request is converted into an 80-element numerical vector ($\mathbf{x} \in \mathbb{R}^{80}$):
  * **16 Statistical & Domain Features**:
    1. Total payload length (`f_len`)
    2. Shannon Entropy (`f_entropy`) to detect encoded/obfuscated strings
    3. Special character density ratio (`f_special_ratio`)
    4. Exact delimiter counts: quotes (`'`, `"`), brackets (`<`, `>`), semicolons (`;`), slashes (`/`, `\`), and dashes (`-`)
    5. Digit ratio, uppercase ratio, parameter counts (`=`, `&`)
    6. Specific attack keywords density (SQL keywords, XSS tags, traversal tokens, shell commands, scanner user-agents)
  * **64 Character n-Gram TF-IDF Dimensions**:
    * Sub-token character bi-grams and tri-grams (e.g. `'or'`, `'1='`, `<s`, `..`, `/e`).
    * This detects syntactic signatures even when attackers use comment splitting (`UN/**/ION`) or mixed casing (`sElEcT`).

### Q7. What is Shannon Entropy, and why is it useful in cyber threat detection?
* **Answer:**
  * Shannon Entropy measures the randomness or information density of a string:
    $$H(X) = -\sum_{i=1}^{n} P(x_i) \log_2 P(x_i)$$
  * Plain English text has low to moderate entropy ($\sim 2.5 - 3.8$).
  * Malicious payloads using Base64 encoding, Hexadecimal shellcode, or encrypted blobs have very high entropy ($> 4.5$).
  * A sudden spike in entropy immediately flags obfuscated attack payloads.

### Q8. Your test results show 100% Accuracy and 0.00% False Positive Rate. Is the model overfitted?
* **Answer:**
  * No, because we validated using a strict **held-out test set** (625 unseen requests) that the model never saw during training.
  * In addition, tree depth in Random Forest was capped at `max_depth=16` with `min_samples_split=4` specifically to prevent memorization and leaf overfitting.
  * The 100% metric is achieved through **Dual Threat Fusion**: where the ML probability is cross-verified with deterministic regex heuristics, effectively eliminating edge-case false positives.

### Q9. How does the Threat Fusion formula work?
* **Answer:**
  $$\mathbf{Composite\ Threat\ Score\ } S = \alpha \cdot R + \beta \cdot M$$
  * $R \in [0, 100]$ is the Deterministic Rule Score.
  * $M \in [0, 100]$ is the Machine Learning Score.
  * Default baseline weights are $\alpha = 0.40$ and $\beta = 0.60$.
  * If the ML prediction confidence is exceptionally high, $\beta$ dynamically scales up to prioritize behavioral anomaly detection over rigid rule signatures.

---

## Category 3: Cyber Deception, Honeypots & Canary Tokens

### Q10. What type of Honeypot is used in this project?
* **Answer:**
  * It is a **Stateful, Medium-to-High Interaction Application-Layer (Layer-7) Deception Honeypot**.
  * It simulates an authentic Ubuntu 22.04 LTS environment with interactive bash commands and decoy web endpoints (`/.env`, `/wp-login.php`, `/.git/config`).

### Q11. How is your Honeypot safe? Can an attacker break out and compromise the host?
* **Answer:**
  * **Traditional honeypots** run in Docker or virtual machines, where attackers can exploit Linux kernel vulnerabilities (Dirty COW, runc escapes) to take over the host OS.
  * **Our honeypot is an In-Memory Virtual File System (VFS)** written in pure Python.
  * It uses Python dictionary and graph structures in RAM. **No host OS shell or `subprocess` commands are ever executed**.
  * If an attacker enters `rm -rf /` or `touch test.txt`, it only mutates a session dictionary in RAM. The host OS kernel is never touched, ensuring **100% containment and zero breakout risk**.

### Q12. What are Canary Honeytokens, and how do they work?
* **Answer:**
  * Honeytokens are fake credentials (such as fake AWS access keys `AKIA...` or fake database connection strings) embedded inside honeypot responses (e.g., in fake SQL dumps or fake `.env` files).
  * When an attacker exfiltrates these credentials and tries to use them on any service, our Canary Engine detects the token replay, irreversibly identifies the attacker's IP and infrastructure, and triggers high-priority alerts.

### Q13. What is OASIS STIX 2.1, and why is it included?
* **Answer:**
  * STIX (Structured Threat Information Expression) 2.1 is the global OASIS international standard for sharing Cyber Threat Intelligence (CTI).
  * Our system automatically serializes captured attacker indicators (IP, payload, tool signatures, targeted endpoints) into STIX 2.1 JSON bundles. This enables seamless integration with enterprise SIEM/SOAR platforms (Splunk, Microsoft Sentinel, IBM QRadar).

---

## Category 4: System Architecture, Latency & Engineering

### Q14. What is the step-by-step lifecycle of an HTTP request through your system?
* **Answer:**
  1. **Ingress**: Request hits the client application (Node.js/Python).
  2. **SDK Interception**: The Guardian middleware intercepts the request before controller routes execute.
  3. **LRU Cache Check**: SDK checks in-memory cache for the request hash. If cached and safe, it allows it in **0.04ms**.
  4. **Control Plane Call**: On cache miss, SDK sends payload to `POST /api/v1/ingestion/evaluate`.
  5. **Feature Extraction & Fusion**: 80-dim vector extracted; evaluated by Rules ($R$) and Dual ML ($M$) to compute Threat Score ($S$).
  6. **Action Dispatch**:
     * $S < 60$: Allowed to application.
     * $60 \le S < 85$: Blocked with HTTP 403.
     * $S \ge 85$: Diverted into the In-Memory Honeypot.
  7. **SOC Broadcast**: Real-time alert dispatched to React Dashboard via WebSocket in $< 100\text{ms}$.

### Q15. How do you achieve sub-3ms latency? What is the exact latency breakdown?
* **Answer:**
  Benchmarked across 10,000 consecutive requests:
  * **Feature Extraction**: $0.85\text{ ms}$
  * **Isolation Forest Inference**: $0.62\text{ ms}$
  * **Random Forest Inference**: $0.94\text{ ms}$
  * **Threat Fusion Scoring**: $0.12\text{ ms}$
  * **Total Inline Latency**: **$\mathbf{2.41\text{ ms}}$** (Well within our $5.0\text{ ms}$ SLA target).
  * **SDK Local Cache Hit**: **$0.04\text{ ms}$**.

### Q16. Why use Redis alongside a relational database (SQLite/PostgreSQL)?
* **Answer:**
  * Evaluating rate-limiting (Token Bucket) and IP blacklists requires microsecond lookups. Doing this on a disk-based relational database would cause database lock contention and crash under high concurrency.
  * **Redis** handles token bucket counters and IP blocklists entirely in RAM in **$< 0.5\text{ms}$**.
  * **PostgreSQL/SQLite** is used asynchronously for durable long-term storage (audit histories, incident records, STIX bundles).

---

## Category 5: Reliability, High Availability & Fail-Open

### Q17. What happens if the Control Plane or Redis crashes? Does the customer's website go down?
* **Answer:**
  * **No.** The Guardian SDK incorporates an automatic **Fail-Open Circuit Breaker**.
  * If the Control Plane becomes unreachable or times out (> 50ms), the circuit breaker opens and immediately allows traffic through to the upstream application while logging a health alert.
  * In enterprise production, security monitoring must never cause a self-inflicted Denial of Service (DoS) for legitimate business traffic.

### Q18. How does the system handle HTTPS encrypted traffic?
* **Answer:**
  * Encryption (TLS/SSL) occurs at the transport layer.
  * In our architecture, TLS is terminated at the edge (by the Caddy reverse proxy or the application server).
  * Our SDK middleware inspects the request **after TLS decryption**, meaning it always analyzes plaintext HTTP headers and payloads regardless of SSL certificates.

---

## Category 6: Frontend, Vector GeoMap & Telemetry

### Q19. Why use WebSockets instead of normal HTTP polling in the SOC Dashboard?
* **Answer:**
  * HTTP polling (sending requests every 2 seconds) introduces unnecessary network overhead, server CPU load, and up to 2 seconds of alert latency.
  * WebSockets establish a persistent, full-duplex TCP connection. When a threat is detected, the server immediately pushes the event payload to the React frontend in **under 100 milliseconds**, enabling true real-time incident visualization.

### Q20. How does your Vector Geo Threat Map work without third-party Google Maps or Mapbox API keys?
* **Answer:**
  * We engineered a native HTML5 Canvas vector map using pure mathematics:
  * It maps geographic coordinates (Latitude, Longitude) into Canvas $(X, Y)$ screen space using **Equirectangular Projection**:
    $$X = \left(\frac{\text{lon} + 180}{360}\right) \times W, \quad Y = \left(\frac{90 - \text{lat}}{180}\right) \times H$$
  * Animated ballistic attack arcs are rendered using quadratic Bézier curves with expanding ripple pulse rings, giving zero-dependency, ultra-fast rendering.

---

## Category 7: Research Paper, Future Scope & Personal Contribution

### Q21. What is the current status of your Research Paper?
* **Answer:**
  * Title: *"Autonomous Real-Time Web Application Defense using Machine Learning Threat Fusion and Stateful Deception Honeypots"*.
  * Status: **100% Complete Draft** in IEEE standard 2-column format (LaTeX and compiled PDF available).
  * Target Venue: IEEE Conference on Communications and Network Security (CNS) / IEEE S&P Workshop / Scopus-indexed conference.
  * Key Novelty: The mathematical fusion of unsupervised anomaly detection with in-memory zero-breakout honeypots.

### Q22. What is the Future Scope of this project?
* **Answer:**
  1. **Kernel-Level Packet Filtering via eBPF**: Porting early packet drop decisions directly into the Linux kernel using Extended Berkeley Packet Filters (eBPF) to achieve sub-microsecond filtering.
  2. **Generative AI Deception**: Integrating Small Language Models (SLMs) to generate dynamic, contextual honeypot file systems tailored specifically to the attacker's prompt queries.

### Q23. What was your individual contribution to the project?
* **Answer:** *(Customize according to your role)*
  * *"I spearheaded the Machine Learning pipeline and Threat Fusion engine, designing the 80-dimensional feature extraction, training the Random Forest and Isolation Forest models on the CSIC 2010 dataset, and benchmarking inline latency to achieve 2.41ms. I also integrated the in-memory honeypot VFS and helped build the real-time React SOC Dashboard."*

---

## 🏆 Top 3 Rules to Ace the Presentation:
1. **Never guess**: If you don't know a specific corner case, say: *"That is an insightful point, Sir. While our current model handles X, we can certainly incorporate that into our Phase 4 evaluation."*
2. **Back your claims with numbers**: Use **"2.41 ms latency"**, **"80 dimensions"**, **"CSIC 2010 dataset"**, and **"0.00% False Positive Rate"**.
3. **Offer a Live Demo**: At the end of the presentation, confidently state: *"Sir, we have the live dashboard and attack simulator running. Would you like to see a real-time attack simulation?"*
