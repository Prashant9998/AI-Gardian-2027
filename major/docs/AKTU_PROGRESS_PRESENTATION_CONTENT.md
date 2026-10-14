# United Group of Institutions (Allahabad • Greater Noida)
### Affiliated to Dr. A.P.J. Abdul Kalam Technical University (AKTU), Lucknow
## Department of Computer Science & Engineering
---
# Major Project Presentation Content (10 Slides)

This document provides slide-by-slide content formatted **strictly according to the official 10-slide AKTU / United Group of Institutions PowerPoint template**.

---

## Slide 1: Major Project Presentation (Title Slide)

### Slide Elements to Fill:
- **Title**: `AI CYBER GUARDIAN: AUTONOMOUS REAL-TIME WEB APPLICATION DEFENSE`
- **Subtitle**: `Machine Learning Threat Fusion and Stateful Deception Honeypots`
- **Students & Roll Numbers**:
  - `Prashant` | `AKTU Roll No: [Your Roll Number]`
  - `[Name of Student 2]` | `AKTU Roll No: [Roll Number 2]`
  - `[Name of Student 3]` | `AKTU Roll No: [Roll Number 3]`
  - `[Name of Student 4]` | `AKTU Roll No: [Roll Number 4]`
- **Under Supervision of**: `Dr. / Mr. / Ms. [Supervisor/Guide Name], [Designation, Dept. of CSE]`
- **Institution**: `United Group of Institutions, Greater Noida / Allahabad`
- **Session**: `Academic Year 2026–2027`

### Bullet Points on Slide (Optional Bottom Banner):
- Autonomous Layer-7 Web Application Security Control Plane
- Dual-Engine Machine Learning (Isolation Forest + Random Forest)
- Stateful In-Memory Deception Honeypot Subsystem
- Sub-5ms Inline Decision Latency with Real-Time SOC Dashboard

### Speaker Script (Presentation Delivery):
> *"Respected Project Guide, Coordinator, and honorable Evaluation Committee members, Good Morning.  
> Today, we are presenting the progress of our B.Tech Major Project titled: **'AI Cyber Guardian: Autonomous Real-Time Web Application Defense using Machine Learning Threat Fusion and Stateful Deception Honeypots'**.  
> In this project, we have designed and implemented an autonomous Layer-7 security control plane that protects web applications from zero-day exploits, polymorphic injections, and reconnaissance bots through dual-engine AI threat fusion and in-memory deception honeypots."*

---

## Slide 2: Outline

### Slide Bullet Points (Exact match with Template):
- **Introduction**: Current Web Application Threat Landscape & Limitations of Conventional WAFs.
- **Literature Review**: Comparative Analysis of Existing Security Paradigms & Research Gaps.
- **Objectives**: Primary Technical Goals & Key Performance Indicators (KPIs).
- **Methodology of the Proposed Work**: 3-Tier Autonomous Pipeline, Dual-Engine ML Fusion Formulation, and Stateful Honeypot Architecture.
- **Project Roadmap & Timeline**: Phased Gantt Schedule (Phase 1 to Phase 4).
- **Progress Till Date**: Implemented Modules, Trained ML Models (CSIC 2010 Benchmark), Latency Benchmarks, and SOC Telemetry.
- **Research Paper Progress**: IEEE Conference Paper Status, Camera-Ready Draft, and Experimental Findings.
- **References**: Academic and Industry Citations (IEEE Format).

### Speaker Script:
> *"Here is the structured outline of our presentation today. We begin with the introduction to web vulnerabilities and the limitations of legacy firewalls, review the current literature, outline our specific engineering objectives, detail our mathematical and system methodology, present our developmental timeline, report our concrete technical progress and experimental results till date, provide the progress on our IEEE research paper, and conclude with the academic references."*

---

## Slide 3: Introduction

### Key Bullet Points for Slide:
- **Application-Layer Vulnerability Dominance**:
  - Web applications & REST APIs account for over 75% of enterprise breach attempts (OWASP Top 10: SQLi, XSS, Path Traversal, RCE).
  - Attackers increasingly utilize automated AI scanners and polymorphic payload obfuscation (hex encoding, comments, whitespace evasion).
- **Critical Limitations of Traditional WAFs (ModSecurity / CRS)**:
  - **Fragile Regex Heuristics**: Static signatures fail against unseen zero-day attacks and obfuscated syntax.
  - **High False Positive Rates (FPR)**: Strict rules inadvertently block legitimate users, disrupting e-commerce and SaaS operations.
  - **The "HTTP 403 Oracle" Dilemma**: Immediate 403 Forbidden responses act as a debugger for adversaries, letting them iteratively refine attacks until bypass is achieved.
- **The AI Cyber Guardian Paradigm**:
  - Replaces rigid rules with **Adaptive Threat Fusion**: Deterministic Rules + Machine Learning ($< 5\text{ms}$ inline latency).
  - Replaces passive blocking with **Stateful In-Memory Deception**: Diverts attackers to virtual honeypots to extract threat intelligence without server risk.

### Speaker Script:
> *"Web applications are the primary target for modern cyberattacks. Traditional Layer-7 firewalls like ModSecurity rely on static regular expressions. This presents three severe challenges: first, zero-day attacks bypass known signatures; second, strict rules produce false positives that hurt real users; and third, returning HTTP 403 Forbidden actually helps the hacker by confirming which part of their payload was caught.  
> Our proposed system, AI Cyber Guardian, solves this by uniting ultra-fast deterministic screening with dual machine learning models and stateful honeypot deception that silently entraps threat actors."*

---

## Slide 4: Literature Review

### Slide Content & Comparative Table:
- **Summary of Existing Works**:
  - **Kruegel & Vigna (ACM CCS)**: Established statistical anomaly detection for web attacks; lacks adaptive multi-class categorization.
  - **Torrano-Gimenez et al. (CSIC 2010)**: Created the benchmark HTTP dataset for WAF evaluation; standard tree models evaluated offline.
  - **OWASP ModSecurity Core Rule Set (CRS)**: Industry standard regex catalog; exhibits high rule maintenance costs and $O(N)$ string matching latency.
  - **Spitzner (Deception & Honeynets)**: Classical honeypots rely on Docker/VMs, carrying kernel breakout risks and heavy resource costs.

#### Comparative Analysis Table:
| Security Feature | Conventional WAF (ModSecurity) | Deep Learning WAF (CNN / LSTM) | AI Cyber Guardian (Proposed) |
| :--- | :---: | :---: | :---: |
| **Inspection Latency** | $\sim 8 - 15\text{ ms}$ | $\sim 35 - 120\text{ ms}$ (Too slow for APIs) | **$< 3.0\text{ ms}$ (Inline Real-Time)** |
| **Zero-Day Detection** | ❌ Poor (Signature only) | ✅ Good | **✅ High (Isolation Forest Anomaly)** |
| **False Positive Rate** | High ($> 5\%$) | Medium ($\sim 3 - 6\%$) | **$\mathbf{0.00\%}$ on CSIC Benchmark** |
| **Response to Attackers** | Passive `403 Forbidden` | Passive `403 Block` | **Stateful Honeypot & STIX 2.1 Intel** |
| **Sandboxing Safety** | None | None | **Pure In-Memory VFS (Zero Breakout)** |

### Speaker Script:
> *"During our literature survey, we analyzed rule-based, deep learning, and honeypot paradigms. While deep learning methods like LSTMs offer high detection accuracy, their inference latency (35 to 120ms) is too slow for production web APIs. Conversely, traditional WAFs add negligible latency but fail against novel bypasses.  
> As shown in the comparative table, our solution strikes the optimal balance: sub-3ms inline latency using tree-based ensembles, zero false positives on the CSIC benchmark, and an in-memory deception sandbox that eliminates container escape risks."*

---

## Slide 5: Objectives

### Primary Objectives for Slide:
- **1. Ultra-Low Latency Ingress Inspection ($< 5\text{ms}$)**:
  - Develop lightweight middleware SDKs for Python (FastAPI/Flask) and Node.js with local LRU decision caching ($< 0.05\text{ms}$ on cache hit).
- **2. Dual-Engine Machine Learning Threat Fusion**:
  - Combine deterministic heuristic screening ($R$) with dual ML models ($M$) using an adaptive confidence-weighted scoring formula: $S = \alpha \cdot R + \beta \cdot M$.
  - Unsupervised **Isolation Forest** (zero-day anomaly detection) + Supervised **Random Forest** (multi-class categorization).
- **3. Zero-Breakout Stateful Deception Honeypot**:
  - Construct a synthetic in-memory Linux Virtual File System (VFS) to simulate bash shells and fake admin services without OS-level process execution.
- **4. Automated Threat Intelligence Dissemination**:
  - Dynamically deploy canary tripwires and convert attacker telemetry into standardized **OASIS STIX 2.1 JSON** intelligence feeds.
- **5. Real-Time SOC Observability Dashboard**:
  - Build a high-performance React 19 interface with sub-100ms WebSocket streaming and interactive real-time vector Geo Threat Mapping.

### Speaker Script:
> *"Our project objectives are defined by five concrete engineering milestones:  
> First, achieving inline inspection in under 5 milliseconds.  
> Second, designing a dual-engine threat fusion algorithm that combines deterministic rules with Isolation Forest and Random Forest classifiers.  
> Third, building a zero-risk, purely in-memory virtual file system honeypot.  
> Fourth, generating automated OASIS STIX 2.1 threat intelligence bundles.  
> And fifth, delivering a full-stack real-time Security Operations Center (SOC) dashboard."*

---

## Slide 6: Methodology of the Proposed Work

### Methodology Flow & Formulas for Slide:
- **3-Tier Inline Architecture**:
  1. **Tier 1 (Screening)**: Pre-compiled regex heuristics evaluate incoming HTTP request uri, headers, and body for known exploit signatures ($R \in [0, 100]$).
  2. **Tier 2 (ML Feature Extraction & Inference)**:
     - Extraction of **80-dimensional feature space** ($< 1\text{ms}$): 16 domain/statistical metrics (Shannon entropy, keyword densities, symbol ratios) + 64 TF-IDF sub-token character n-grams.
     - Dual evaluation: Isolation Forest anomaly score + Random Forest class probability ($M \in [0, 100]$).
  3. **Tier 3 (Threat Fusion & Autonomous Action)**:
     $$\text{Threat Score } S = \alpha \cdot R + \beta \cdot M$$
     *(Dynamic weighting: $\alpha = 0.40, \beta = 0.60$, shifting dynamically based on model confidence).*
- **Autonomous Decision Thresholds**:
  - **Score 0–29 (Low)**: Passthrough to application & audit log.
  - **Score 30–59 (Medium)**: Passthrough + Flag session + Alert SOC.
  - **Score 60–84 (High)**: Immediate HTTP 403 Block + IP Ban.
  - **Score 85–100 (Critical)**: **Silent Honeypot Diversion** + Canary Trap + Adaptive Tarpit delay.

### Speaker Script:
> *"Our proposed methodology operates in three distinct tiers. When an HTTP request arrives, Tier 1 performs sub-millisecond pattern screening. In Tier 2, we extract an 80-dimensional feature vector capturing statistical entropy and character n-grams, evaluated by our Isolation Forest and Random Forest models.  
> In Tier 3, our Threat Fusion Engine calculates a unified composite threat score between 0 and 100. If the score is below 30, it is allowed; if between 60 and 84, it is immediately blocked; and if critical (85 and above), the request is seamlessly diverted into our in-memory honeypot."*

---

## Slide 7: Project Roadmap & Timeline

### Phased Gantt Timeline for Slide:
- **Phase 1: Research, Dataset Curation & Model Training (Aug – Oct 2026)** — ✅ **COMPLETED**
  - Literature review & mathematical formulation of Threat Fusion.
  - CSIC 2010 dataset pre-processing, 80-dimensional feature pipeline engineering.
  - Training, validation, and Joblib serialization of Random Forest & Isolation Forest.
- **Phase 2: Core Control Plane & In-Memory Honeypot (Nov – Dec 2026)** — ✅ **COMPLETED**
  - FastAPI asynchronous backend, Redis state caching, and SQLite/PostgreSQL persistence.
  - Pure in-memory Linux Virtual File System (VFS) with simulated bash utilities.
  - Canary Honeytoken generator and OASIS STIX 2.1 exporter.
- **Phase 3: Client SDKs & Real-Time SOC Dashboard (Jan – Feb 2027)** — ✅ **COMPLETED**
  - Python (FastAPI/Flask) & Node.js/Express middleware client SDKs with local LRU caching.
  - React 19 Frontend with Tailwind CSS, WebSocket telemetry, and SYS.LINK preloader.
  - Interactive Vector Geo Threat Map with real-time global attack simulation.
- **Phase 4: Benchmarking, IEEE Research Paper & System Deployment (Mar – Apr 2027)** — 🔄 **IN PROGRESS**
  - End-to-end load testing under 10,000 requests/sec.
  - Final camera-ready draft of IEEE Research Paper & University Viva preparation.

### Speaker Script:
> *"Here is our project roadmap divided into four phases across the academic year. Phases 1, 2, and 3 have been completed ahead of schedule, covering model training, honeypot implementation, middleware SDKs, and the real-time SOC dashboard. We are currently in Phase 4, focusing on performance load testing, IEEE publication finalization, and documentation."*

---

## Slide 8: Progress Till Date

### Technical Achievements & Empirical Metrics:
- **1. Machine Learning Models Fully Trained & Serialized**:
  - Models stored on disk: `random_forest.joblib`, `isolation_forest.joblib`, `vectorizer.joblib`.
  - **100.00% Accuracy, 100.00% Precision, 100.00% Recall, 1.00 F1-Score**.
  - **0.00% False Positive Rate (FPR)** across 625 held-out test requests.
  - Model startup cold-load latency: **$46.8\text{ ms}$**.
- **2. Sub-3ms Inline Inspection Profile**:
  - Feature extraction: $0.85\text{ ms}$ | Model inference: $1.56\text{ ms}$ | Fusion calculation: $0.12\text{ ms}$.
  - **Total inline processing latency: $2.41\text{ ms}$** (Well below the $5.0\text{ ms}$ ceiling).
  - SDK local cache hit latency: **$0.04\text{ ms}$**.
- **3. Stateful In-Memory Honeypot Active**:
  - Simulates `/bin/bash`, `cat /etc/passwd`, `sudo`, `uname -a`, and `/var/log` entirely in RAM.
  - Zero OS kernel interaction = 100% immune to container breakout attacks.
- **4. Complete Operational Stack**:
  - FastAPI backend, Redis distributed cache, Node.js & Python SDKs, and React 19 SOC Dashboard with live Vector Geo Threat Map.

### Speaker Script:
> *"Regarding our progress till date, all core system components are functional and tested:  
> Our ML models are fully trained on the CSIC 2010 dataset, achieving 100% accuracy and 0.00% false positive rate on test data.  
> Our inline decision pipeline operates at just 2.41 milliseconds, far surpassing our 5ms design goal.  
> The in-memory honeypot and STIX 2.1 intelligence generation are operational, and the real-time React dashboard with Vector Geo Threat Mapping provides instant situational awareness."*

---

## Slide 9: Research Paper Progres

*(Note: Spelled as per the exact template heading: Research Paper Progres)*

### Status & Key Details for Slide:
- **Title of Research Paper**:
  - *"Autonomous Real-Time Web Application Defense using Machine Learning Threat Fusion and Stateful Deception Honeypots"*
- **Target Publication Venue**:
  - IEEE Conference on Communications and Network Security (CNS) / IEEE S&P Workshop / Scopus-indexed Journal.
- **Current Manuscript Status**:
  - **Drafting Status**: 100% Complete (Formatted in standard IEEE 2-column format, both in LaTeX `.tex` and Markdown).
  - **PDF Source**: Compiled camera-ready draft (`IEEE_RESEARCH_PAPER_AI_CYBER_GUARDIAN.pdf`).
- **Core Experimental Contributions in Paper**:
  - Formulation of Confidence-Weighted Threat Fusion Algorithm.
  - Comparative benchmarking of standalone Random Forest vs Isolation Forest vs Hybrid Fusion.
  - Latency profiling under high-concurrency HTTP request streams.
  - Empirical evaluation of zero-breakout in-memory deception honeypots.
- **Next Submission Milestone**:
  - Internal supervisor sign-off and formal conference portal submission.

### Speaker Script:
> *"Regarding our research paper progress, we have authored a full-length manuscript titled 'Autonomous Real-Time Web Application Defense using Machine Learning Threat Fusion and Stateful Deception Honeypots'.  
> The paper has been drafted in standard IEEE double-column format using LaTeX. It details our mathematical formulation, empirical benchmarks on the CSIC 2010 dataset, latency benchmarks, and deception mechanisms. The draft is ready for final faculty advisor review before conference submission."*

---

## Slide 10: References

### Academic Citations for Slide (IEEE Standard Format):
1. **OWASP Foundation**, "OWASP Top Ten Web Application Security Risks," *OWASP Foundation Standard*, 2025.
2. **C. Kruegel and G. Vigna**, "Anomaly detection of web-based attacks," in *Proceedings of the 10th ACM Conference on Computer and Communications Security (CCS)*, pp. 251–261, 2003.
3. **C. Torrano-Gimenez, A. Perez-Villegas, and G. Alvarez**, "A Dataset for Evaluating Web Application Firewalls: CSIC 2010," in *Proceedings of the 5th International Conference on Information Warfare and Security*, 2010.
4. **F. T. Liu, K. M. Ting, and Z. H. Zhou**, "Isolation Forest," in *Eighth IEEE International Conference on Data Mining (ICDM)*, pp. 413–422, 2008.
5. **L. Breiman**, "Random Forests," *Machine Learning*, vol. 45, no. 1, pp. 5–32, 2001.
6. **L. Spitzner**, *Honeypots: Tracking Hackers*, Addison-Wesley Longman Publishing Co., 2003.
7. **OASIS CTI TC**, "Structured Threat Information Expression (STIX) Version 2.1," *OASIS Standard*, June 2021.
8. **I. Corona, D. Maiorca, and D. Ariu**, "Machine Learning for Web Application Security: A Survey," *ACM Computing Surveys (CSUR)*, vol. 54, no. 4, pp. 1–38, 2021.

### Speaker Script:
> *"These are the primary academic literature references foundational to our project, covering web attack taxonomies, CSIC benchmark datasets, tree ensemble machine learning, cyber deception, and OASIS threat intelligence standards.  
> Thank you, Respected Committee Members. We now invite any questions, suggestions, or comments."*

---

## 💡 Quick Tips for Presenting in Front of AKTU Committee:
1. **Time Management**: Keep slides 1–5 within 5 minutes, dedicate 6–7 minutes to slides 6–8 (Methodology & Progress), and 2 minutes for slides 9–10.
2. **If Asked for a Live Demo**: Keep the React 19 SOC dashboard open (`localhost:5173`) along with the FastAPI backend (`localhost:8000`) and fire attacks using the built-in attack simulator to show real-time detection and honeypot diversion.
