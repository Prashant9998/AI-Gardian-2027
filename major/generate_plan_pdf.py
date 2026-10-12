import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber > 1:
            self.saveState()
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            
            # Running Header
            self.drawString(40, 810, "AI CYBER GUARDIAN — Full-Stack Master Implementation Plan")
            self.drawRightString(555, 810, "v2.4 Enterprise Edition")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(40, 802, 555, 802)
            
            # Running Footer
            self.line(40, 45, 555, 45)
            self.drawString(40, 32, "Confidential — Department of Computer Science & Engineering")
            self.drawRightString(555, 32, f"Page {self._pageNumber} of {page_count}")
            self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=48,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()
    
    # Custom Color Palette
    PRIMARY = colors.HexColor("#0284C7")     # Blue
    PRIMARY_DARK = colors.HexColor("#0369A1")# Darker Blue
    TEXT_MAIN = colors.HexColor("#0F172A")   # Slate 900
    TEXT_MUTED = colors.HexColor("#475569")  # Slate 600
    BG_LIGHT = colors.HexColor("#F8FAFC")    # Slate 50
    BORDER = colors.HexColor("#E2E8F0")      # Slate 200
    CRITICAL = colors.HexColor("#EF4444")    # Red
    HIGH = colors.HexColor("#F97316")        # Orange
    MEDIUM = colors.HexColor("#F59E0B")      # Amber
    SUCCESS = colors.HexColor("#10B981")     # Emerald Green

    # Typography Styles
    style_cover_title = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=TEXT_MAIN,
        spaceAfter=12
    )
    
    style_cover_sub = ParagraphStyle(
        'CoverSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=18,
        textColor=TEXT_MUTED,
        spaceAfter=20
    )

    style_h1 = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=TEXT_MAIN,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    style_h2 = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=PRIMARY_DARK,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    style_body = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=TEXT_MAIN,
        spaceAfter=6
    )

    style_bullet = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_MAIN,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    style_callout = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_MAIN
    )

    style_code = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A")
    )

    story = []

    # ════════════════ COVER PAGE ════════════════
    story.append(Spacer(1, 20))
    
    # Header tag
    tag_data = [[
        Paragraph("<font color='#0284C7'><b>🛡️ AI CYBER GUARDIAN</b></font> &nbsp;|&nbsp; <font color='#64748B'>Autonomous Zero-Trust Web Defense Platform</font>", style_body)
    ]]
    tag_table = Table(tag_data, colWidths=[515])
    tag_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0F9FF")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#BAE6FD")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(tag_table)
    story.append(Spacer(1, 30))

    story.append(Paragraph("Full-Stack System Roadmap &amp;<br/>Phased Implementation Plan", style_cover_title))
    story.append(Paragraph(
        "An end-to-end technical blueprint detailing the chronological execution sequence for the AI Cyber Guardian project: "
        "covering real-time WebSocket pipelines, machine learning training, enterprise deception honeypots, "
        "sample app integration, cloud containerization, and final defense evaluation.",
        style_cover_sub
    ))

    # Meta Table
    meta_content = [
        [
            Paragraph("<b>PROJECT TITLE:</b><br/>AI Cyber Guardian (2026–2027)", style_callout),
            Paragraph("<b>VERSION:</b><br/>2.4 Enterprise Edition", style_callout),
            Paragraph("<b>REPOSITORY:</b><br/>Prashant9998/AI-Gardian-2027", style_callout)
        ],
        [
            Paragraph("<b>PRIMARY STACK:</b><br/>FastAPI · React 19 · Redis · Docker", style_callout),
            Paragraph("<b>SYSTEM STATUS:</b><br/><font color='#10B981'><b>Phase 0 Baseline Verified</b></font>", style_callout),
            Paragraph("<b>IMMEDIATE GOAL:</b><br/>Step 1: Real-Time WebSockets", style_callout)
        ]
    ]
    meta_table = Table(meta_content, colWidths=[171, 171, 173])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 35))

    # Executive Abstract Callout
    abstract_p = Paragraph(
        "<b>EXECUTIVE ABSTRACT:</b><br/>"
        "AI Cyber Guardian represents a next-generation web application firewall (WAF) and autonomous defense system. "
        "Rather than relying strictly on static regex rules or passive log analysis, it deploys a two-stage hybrid pipeline: "
        "Stage 1 evaluates sliding-window rate limiting in sub-millisecond Redis memory; Stage 2 performs dual machine learning threat "
        "fusion (Isolation Forest anomaly detection + Random Forest classification) to produce a composite threat score (0–100). "
        "Critical attackers are transparently routed into a virtual Linux honeypot sandbox where decoy canary tokens and an adaptive "
        "tarpit exhaust attacker resources while streaming real-time forensic intelligence into a React 19 SOC dashboard.",
        style_callout
    )
    abs_table = Table([[abstract_p]], colWidths=[515])
    abs_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('LINELEFT', (0,0), (0,0), 4, PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('PADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(abs_table)

    story.append(PageBreak())

    # ════════════════ SECTION 1: BASELINE STATUS ════════════════
    story.append(Paragraph("1. Current Baseline Status (Phase 0 — 100% Completed)", style_h1))
    story.append(Paragraph(
        "The core foundation, backend detection algorithms, enterprise deception subsystem, and SOC dashboard "
        "have been constructed and verified with automated test suites. Remote GitHub repository synchronization is complete.",
        style_body
    ))

    baseline_data = [
        [
            Paragraph("<b>Subsystem</b>", style_callout),
            Paragraph("<b>File / Component Path</b>", style_callout),
            Paragraph("<b>Technical Scope</b>", style_callout),
            Paragraph("<b>Status</b>", style_callout)
        ],
        [
            Paragraph("<b>Rule Engine</b>", style_callout),
            Paragraph("<code>core/rules.py</code>", style_code),
            Paragraph("R1–R6 deterministic rules with double URL-decoding (SQLi, XSS, CmdInj, Path Traversal, Scanners, Brute Force)", style_callout),
            Paragraph("<font color='#10B981'><b>✓ 100% Passed</b></font>", style_callout)
        ],
        [
            Paragraph("<b>Rate Limiting</b>", style_callout),
            Paragraph("<code>core/rate_limiter.py</code>", style_code),
            Paragraph("Sliding-window Redis rate limiter with automatic in-memory fail-open fallback", style_callout),
            Paragraph("<font color='#10B981'><b>✓ 100% Passed</b></font>", style_callout)
        ],
        [
            Paragraph("<b>Threat Fusion</b>", style_callout),
            Paragraph("<code>core/decision_engine.py</code>", style_code),
            Paragraph("Hybrid score weighting formula: min(100, rule_score + ml_score * 30) mapped to 4 response tiers", style_callout),
            Paragraph("<font color='#10B981'><b>✓ 100% Passed</b></font>", style_callout)
        ],
        [
            Paragraph("<b>Honeypot Subsystem</b>", style_callout),
            Paragraph("<code>honeypot/*</code>", style_code),
            Paragraph("Virtual Linux File System (fake shell), Canary tokens (AWS, DB, JWT), Lures, Adaptive Tarpit, STIX 2.1", style_callout),
            Paragraph("<font color='#10B981'><b>✓ 100% Passed</b></font>", style_callout)
        ],
        [
            Paragraph("<b>React SOC Dashboard</b>", style_callout),
            Paragraph("<code>cyberprep-app/src/*</code>", style_code),
            Paragraph("Landing page, Login, and 10 Dashboard Views (Overview, Live Feed, Analytics, Geo Radar, Blocked IPs, Attackers)", style_callout),
            Paragraph("<font color='#10B981'><b>✓ Live Preview</b></font>", style_callout)
        ],
        [
            Paragraph("<b>Docker Stack</b>", style_callout),
            Paragraph("<code>docker-compose.yml</code>", style_code),
            Paragraph("Multi-container orchestration: PostgreSQL 15, Redis 7, Backend FastAPI, Frontend React/Nginx", style_callout),
            Paragraph("<font color='#10B981'><b>✓ Dockerized</b></font>", style_callout)
        ]
    ]

    table_baseline = Table(baseline_data, colWidths=[90, 110, 240, 75])
    table_baseline.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(table_baseline)
    story.append(Spacer(1, 12))

    # ════════════════ SECTION 2: ARCHITECTURE ════════════════
    story.append(Paragraph("2. Autonomous Defense Lifecycle", style_h1))
    story.append(Paragraph(
        "Traffic entering through the client SDK passes through successive defensive stages designed to reject malicious traffic "
        "without adding latency to legitimate client sessions:",
        style_body
    ))

    flow_data = [
        [
            Paragraph("<b>Stage</b>", style_callout),
            Paragraph("<b>Engine Component</b>", style_callout),
            Paragraph("<b>Execution Model &amp; Latency</b>", style_callout),
            Paragraph("<b>Primary Outcome</b>", style_callout)
        ],
        [
            Paragraph("<b>Stage 1: Ingress</b>", style_callout),
            Paragraph("IP Filter &amp; Redis Rate Limiter", style_callout),
            Paragraph("Sub-millisecond (&lt; 1ms) in-memory sliding window lookup", style_callout),
            Paragraph("Drop CIDR blacklists &amp; brute-force bursts before compute overhead", style_callout)
        ],
        [
            Paragraph("<b>Stage 2: Fusion</b>", style_callout),
            Paragraph("Deterministic Rules + ML Anomaly Engine", style_callout),
            Paragraph("Parallel execution with 120ms timeout safeguard", style_callout),
            Paragraph("Composite Threat Score (0–100) combining signatures &amp; zero-day ML", style_callout)
        ],
        [
            Paragraph("<b>Stage 3: Action</b>", style_callout),
            Paragraph("Autonomous Decision Engine", style_callout),
            Paragraph("Instant threshold evaluation", style_callout),
            Paragraph("LOW (Log), MEDIUM (Alert), HIGH (Block 403), CRITICAL (Honeypot)", style_callout)
        ],
        [
            Paragraph("<b>Stage 4: Deception</b>", style_callout),
            Paragraph("Enterprise Honeypot &amp; Tarpit", style_callout),
            Paragraph("Stateful VFS Linux sandbox + injected latency", style_callout),
            Paragraph("Exhaust attacker automation while capturing STIX 2.1 forensic data", style_callout)
        ]
    ]

    table_flow = Table(flow_data, colWidths=[85, 125, 155, 150])
    table_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(table_flow)
    story.append(Spacer(1, 14))

    story.append(PageBreak())

    # ════════════════ SECTION 3: CHRONOLOGICAL ROADMAP ════════════════
    story.append(Paragraph("3. Full-Stack Phased Master Implementation Plan", style_h1))
    story.append(Paragraph(
        "The following 8 steps are organized in exact chronological sequence. Each step establishes the mandatory foundation "
        "for subsequent phases, ensuring continuous stability and testability.",
        style_body
    ))
    story.append(Spacer(1, 6))

    steps = [
        {
            "num": "STEP 1",
            "title": "Real-Time WebSocket Streaming Pipeline",
            "tag": "IMMEDIATE PRIORITY — SUB-100MS LATENCY",
            "color": CRITICAL,
            "why": "Connects the backend decision stream directly to the React dashboard. Instead of 3.5-second polling, live attacks appear on screen instantaneously.",
            "tasks": [
                "<b>FastAPI WebSocket Server:</b> Implement <code>/api/v1/ws/threats</code> in <code>api/routers/ws.py</code> with an asynchronous <code>ConnectionManager</code> supporting multiple concurrent dashboard connections.",
                "<b>Event Interceptor:</b> Wire <code>evaluate_decision()</code> and <code>honeypot/engine.py</code> to broadcast security events as JSON payloads over active WebSockets immediately upon evaluation.",
                "<b>React useThreatStream Hook:</b> Create <code>cyberprep-app/src/hooks/useThreatStream.js</code> with auto-reconnection, exponential backoff, and direct state insertion into the Live Threat Feed.",
                "<b>Visual & Audio Alerts:</b> Implement an alert flash animation on new event arrival with an optional toggleable sound chime for CRITICAL severity attacks."
            ],
            "crit": "Sending an attack payload via curl displays the event on the React SOC Dashboard in &lt; 100ms with zero manual page refreshes."
        },
        {
            "num": "STEP 2",
            "title": "Real ML Dataset Training & Model Serialization",
            "tag": "ACADEMIC & SCIENTIFIC VALIDITY",
            "color": HIGH,
            "why": "Replaces in-memory mock models with scikit-learn models trained on benchmark datasets (CSIC 2010 HTTP Dataset and CIC-IDS2017) to provide statistical rigor.",
            "tasks": [
                "<b>Feature Extraction Pipeline:</b> Build <code>guardian-control-plane/ml/features.py</code> extracting length, entropy, special symbol ratios (', \", &lt;, &gt;, ;, --, /, \\), parameter count, and TF-IDF char n-grams.",
                "<b>Offline Training Script:</b> Train an <b>Isolation Forest</b> (unsupervised anomaly detection) and a <b>Random Forest Classifier</b> (supervised multi-class categorizer) on CSIC 2010 data.",
                "<b>Model Serialization:</b> Export trained weights to <code>isolation_forest.joblib</code>, <code>random_forest.joblib</code>, and <code>vectorizer.joblib</code>.",
                "<b>FastAPI Lifespan Loading:</b> Load serialized joblib models into memory during FastAPI startup in &lt; 500ms."
            ],
            "crit": "Model achieves &ge; 92% F1-score and &le; 4.5% False Positive Rate on clean HTTP requests with verified Confusion Matrix benchmarks."
        },
        {
            "num": "STEP 3",
            "title": "Protected Target Application Lab (\"Protected App Lab\")",
            "tag": "REAL APPLICATION INTEGRATION",
            "color": MEDIUM,
            "why": "Demonstrates the Guardian protecting an actual functional web application (e.g. E-Commerce or Banking Portal) in a real-world scenario.",
            "tasks": [
                "<b>Sample App Development:</b> Create <code>sample-target-app/</code> featuring realistic endpoints: <code>POST /api/login</code>, <code>GET /api/products/search</code>, <code>POST /api/feedback</code>, and <code>GET /download</code>.",
                "<b>SDK Middleware Attachment:</b> Attach the Guardian SDK middleware in 3 lines of code: <code>app.use(guardianMiddleware(...))</code>.",
                "<b>End-to-End Test Matrix:</b> Verify that benign searches return 200 OK, SQLi searches are blocked with 403 Forbidden, and access to decoy <code>/.env</code> routes to the Honeypot."
            ],
            "crit": "Attacks against the target application are intercepted transparently without impacting legitimate end-user application workflows."
        },
        {
            "num": "STEP 4",
            "title": "1-Click Interactive Attack Demo Harness",
            "tag": "KEY EVALUATION & PRESENTATION ASSET",
            "color": PRIMARY,
            "why": "Enables an automated multi-stage Red Team vs. Blue Team attack scenario that evaluators can launch with a single button during project defense.",
            "tasks": [
                "<b>Multi-Stage Attack Runner:</b> Build <code>simulate_demo_scenario.py</code> executing 4 distinct threat phases: Recon Scan (0–5s) ➔ Brute Force (5–12s) ➔ SQLi Exploit (12–20s) ➔ Honeypot VFS Shell Exploration &amp; Canary Tripping (20–30s).",
                "<b>SOC Dashboard Launch Trigger:</b> Add an interactive <b>'▶ Run Live Attack Demo'</b> button on the Dashboard Topbar that triggers the scenario and highlights corresponding dashboard panels sequentially."
            ],
            "crit": "Evaluators can press one button and watch the full defense lifecycle (detect, block, trap, report) unfold autonomously on the live dashboard."
        }
    ]

    for s in steps:
        step_box = [
            [
                Paragraph(f"<b><font color='{s['color'].hexval()}'>{s['num']}: {s['title'].upper()}</font></b>", style_h2),
                Paragraph(f"<font color='{s['color'].hexval()}'><b>{s['tag']}</b></font>", ParagraphStyle('RTag', parent=style_callout, alignment=2))
            ],
            [
                Paragraph(f"<b>Objective &amp; Rationale:</b> {s['why']}", style_body),
                ""
            ]
        ]
        
        task_html = "<b>Key Deliverables:</b><br/>" + "".join([f"• {t}<br/>" for t in s['tasks']])
        step_box.append([Paragraph(task_html, style_body), ""])
        step_box.append([Paragraph(f"<b>Acceptance Criteria:</b> <font color='#10B981'><b>{s['crit']}</b></font>", style_body), ""])

        t_step = Table(step_box, colWidths=[385, 130])
        t_step.setStyle(TableStyle([
            ('SPAN', (0,1), (1,1)),
            ('SPAN', (0,2), (1,2)),
            ('SPAN', (0,3), (1,3)),
            ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
            ('BOX', (0,0), (-1,-1), 1, BORDER),
            ('LINELEFT', (0,0), (0,-1), 3.5, s['color']),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(t_step)
        story.append(Spacer(1, 8))

    story.append(PageBreak())

    steps_part2 = [
        {
            "num": "STEP 5",
            "title": "Official Python SDK Package (cyber-guardian)",
            "tag": "ECOSYSTEM REUSABILITY",
            "color": PRIMARY_DARK,
            "why": "Completes the promise on the Landing Page ('pip install cyber-guardian') by providing native middleware for FastAPI, Flask, and Django.",
            "tasks": [
                "<b>Python Package Architecture:</b> Set up <code>guardian-sdk-python/</code> with <code>pyproject.toml</code> supporting <code>pip install -e .</code>.",
                "<b>In-Memory Decision Cache:</b> Implement LRU caching with TTL for clean IP decisions to prevent unnecessary network latency on repetitive legitimate requests.",
                "<b>Framework Adapters:</b> Implement <code>BaseHTTPMiddleware</code> for FastAPI/Starlette, <code>before_request</code> hooks for Flask, and <code>MiddlewareMixin</code> for Django.",
                "<b>Asynchronous Telemetry:</b> Non-blocking background worker dispatching security telemetry without delaying client response times (&lt; 2ms overhead)."
            ],
            "crit": "Any Python developer can install <code>cyber-guardian</code> via pip and protect their application with 3 lines of middleware code."
        },
        {
            "num": "STEP 6",
            "title": "Database Persistence & Real PDF Threat Report Generator",
            "tag": "COMPLIANCE & AUDITABILITY",
            "color": colors.HexColor("#0D9488"),
            "why": "Security audits require permanent event records and downloadable executive summaries with incident timelines and STIX indicators.",
            "tasks": [
                "<b>Database Migrations:</b> Configure Alembic to manage <code>ThreatEvent</code>, <code>AttackerProfile</code>, <code>BlockedIP</code>, and <code>HoneypotSession</code> schemas in PostgreSQL.",
                "<b>Timeseries Aggregation:</b> Create high-performance indexed queries for 24-hour attack trends, top attacker nations, and vector breakdown percentages.",
                "<b>Server-Side PDF Exporter:</b> Implement <code>/api/v1/reporting/export-pdf</code> compiling incident charts, top attacker profiles, and STIX threat indicators into an executive PDF."
            ],
            "crit": "Clicking 'Generate PDF Report' in the React dashboard downloads a polished, multi-page PDF summary compiled from real database records."
        },
        {
            "num": "STEP 7",
            "title": "Production Cloud Deployment & CI/CD Pipeline",
            "tag": "PUBLIC AVAILABILITY",
            "color": colors.HexColor("#6366F1"),
            "why": "Deploys the containerized stack to a public cloud VPS (DigitalOcean / AWS / GCP) with automated SSL encryption for remote viva demonstrations.",
            "tasks": [
                "<b>Cloud Server Provisioning:</b> Deploy to an Ubuntu 22.04 LTS instance with Docker and Docker Compose.",
                "<b>Caddy Edge Reverse Proxy:</b> Configure Caddy for automated Let's Encrypt TLS certificate issuance and WebSocket connection termination.",
                "<b>GitHub Actions CI/CD:</b> Set up <code>.github/workflows/ci.yml</code> running Pytest tests and Vite build checks on every push to maintain zero regression."
            ],
            "crit": "The complete platform is live and publicly accessible over HTTPS (e.g. <code>https://guardian.yourdomain.com</code>) with automated health recovery."
        },
        {
            "num": "STEP 8",
            "title": "Academic Defense, Viva Package & Research Paper",
            "tag": "PROJECT EVALUATION & GRADING",
            "color": SUCCESS,
            "why": "Prepares all formal academic documentation, research publications, and viva answers required for top university project evaluations.",
            "tasks": [
                "<b>Final Project Report:</b> Comprehensive thesis covering Abstract, Literature Review, Threat Modeling, Architecture, Benchmarks, and Future Work.",
                "<b>IEEE Conference Paper Draft:</b> Formatted 6-page paper: <i>'Autonomous Real-Time Web Application Defense using Machine Learning Threat Fusion and Stateful Deception Honeypots'</i>.",
                "<b>Defense Presentation Deck:</b> 15-slide PowerPoint deck covering problem statement, threat matrix, architecture flowcharts, and live demo results.",
                "<b>Viva Q&A Cheat Sheet:</b> In-depth answers to tough examiner questions on adversarial evasion, fail-open design, and rate-limiting concurrency."
            ],
            "crit": "Complete project documentation and viva defense kit ready for university submission with zero remaining gaps."
        }
    ]

    for s in steps_part2:
        step_box = [
            [
                Paragraph(f"<b><font color='{s['color'].hexval()}'>{s['num']}: {s['title'].upper()}</font></b>", style_h2),
                Paragraph(f"<font color='{s['color'].hexval()}'><b>{s['tag']}</b></font>", ParagraphStyle('RTag2', parent=style_callout, alignment=2))
            ],
            [
                Paragraph(f"<b>Objective &amp; Rationale:</b> {s['why']}", style_body),
                ""
            ]
        ]
        
        task_html = "<b>Key Deliverables:</b><br/>" + "".join([f"• {t}<br/>" for t in s['tasks']])
        step_box.append([Paragraph(task_html, style_body), ""])
        step_box.append([Paragraph(f"<b>Acceptance Criteria:</b> <font color='#10B981'><b>{s['crit']}</b></font>", style_body), ""])

        t_step = Table(step_box, colWidths=[385, 130])
        t_step.setStyle(TableStyle([
            ('SPAN', (0,1), (1,1)),
            ('SPAN', (0,2), (1,2)),
            ('SPAN', (0,3), (1,3)),
            ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
            ('BOX', (0,0), (-1,-1), 1, BORDER),
            ('LINELEFT', (0,0), (0,-1), 3.5, s['color']),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(t_step)
        story.append(Spacer(1, 8))

    story.append(PageBreak())

    # ════════════════ SECTION 4: DECISION MATRIX ════════════════
    story.append(Paragraph("4. Threat Decision Matrix &amp; Response Protocols", style_h1))
    story.append(Paragraph(
        "Incoming traffic is classified into four operational severity tiers based on the fused threat score:",
        style_body
    ))

    matrix_data = [
        [
            Paragraph("<b>Score Band</b>", style_callout),
            Paragraph("<b>Severity</b>", style_callout),
            Paragraph("<b>Trigger Conditions &amp; Signatures</b>", style_callout),
            Paragraph("<b>Autonomous Mitigation Action</b>", style_callout),
            Paragraph("<b>Telemetry Logged</b>", style_callout)
        ],
        [
            Paragraph("<b>0 – 29</b>", style_callout),
            Paragraph("<font color='#10B981'><b>LOW</b></font>", style_callout),
            Paragraph("Normal browsing, valid form inputs, standard User-Agents, score &lt; 30", style_callout),
            Paragraph("<b>Pass through untouched.</b> Minimal audit logging to preserve performance.", style_callout),
            Paragraph("Timestamp, path, latency, IP hash", style_callout)
        ],
        [
            Paragraph("<b>30 – 59</b>", style_callout),
            Paragraph("<font color='#F59E0B'><b>MEDIUM</b></font>", style_callout),
            Paragraph("Automated scanners (Nikto, DirBuster), parameter fuzzing, minor anomalies", style_callout),
            Paragraph("<b>Pass through + Flag Session.</b> Email alert triggered if operator enabled.", style_callout),
            Paragraph("Full headers, query params, tool fingerprint", style_callout)
        ],
        [
            Paragraph("<b>60 – 84</b>", style_callout),
            Paragraph("<font color='#F97316'><b>HIGH</b></font>", style_callout),
            Paragraph("Brute force (> 15 failed logins in 120s), Path Traversal (../../etc/passwd), XSS", style_callout),
            Paragraph("<b>Immediate 403 Forbidden Block.</b> IP placed in Redis temporary ban list.", style_callout),
            Paragraph("IP, violation rules, payload snippet, ban TTL", style_callout)
        ],
        [
            Paragraph("<b>85 – 100</b>", style_callout),
            Paragraph("<font color='#EF4444'><b>CRITICAL</b></font>", style_callout),
            Paragraph("SQLi (UNION/SELECT), Command Injection, decoy lures (/.env, /wp-login.php)", style_callout),
            Paragraph("<b>SILENT HONEYPOT ROUTING.</b> Attacker trapped in Virtual Linux VFS shell; Canary tokens deployed; Tarpit latency injected.", style_callout),
            Paragraph("Shell command history, keystroke timing, canary exfil, STIX 2.1 JSON", style_callout)
        ]
    ]

    table_matrix = Table(matrix_data, colWidths=[55, 60, 140, 150, 110])
    table_matrix.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(table_matrix)
    story.append(Spacer(1, 14))

    # ════════════════ SECTION 5: RISK MITIGATION ════════════════
    story.append(Paragraph("5. Architectural Reliability &amp; Risk Mitigation", style_h1))

    risk_data = [
        [
            Paragraph("<b>Risk / Failure Scenario</b>", style_callout),
            Paragraph("<b>Severity</b>", style_callout),
            Paragraph("<b>Engineered Architectural Safeguard</b>", style_callout)
        ],
        [
            Paragraph("<b>Redis Cache Outage</b>", style_callout),
            Paragraph("<font color='#F97316'><b>HIGH</b></font>", style_callout),
            Paragraph("<b>Fail-Open Design:</b> Rate limiter logs a CRITICAL error and falls back to an in-memory dictionary. Legitimate site traffic stays online rather than taking down the business app.", style_callout)
        ],
        [
            Paragraph("<b>ML Inference Latency Spike</b>", style_callout),
            Paragraph("<font color='#F59E0B'><b>MEDIUM</b></font>", style_callout),
            Paragraph("<b>Asynchronous 120ms Guard:</b> If ML evaluation exceeds 120ms, the deterministic rule score takes immediate precedence, ensuring sub-second response times.", style_callout)
        ],
        [
            Paragraph("<b>Attacker Honeypot Escape</b>", style_callout),
            Paragraph("<font color='#EF4444'><b>CRITICAL</b></font>", style_callout),
            Paragraph("<b>Pure Virtual Sandbox (VFS):</b> The shell runs entirely in Python memory data structures. No real OS subshells (<code>exec</code>, <code>os.system</code>) are ever spawned, making breakout impossible.", style_callout)
        ],
        [
            Paragraph("<b>False Positive Disruption</b>", style_callout),
            Paragraph("<font color='#F59E0B'><b>MEDIUM</b></font>", style_callout),
            Paragraph("<b>Rule Override &amp; Exclusion Paths:</b> Operators can configure route exclusion lists (e.g. blog editors, Markdown fields) and adjust threshold weights via <code>thresholds.json</code> without restarting services.", style_callout)
        ]
    ]

    table_risk = Table(risk_data, colWidths=[130, 65, 320])
    table_risk.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(table_risk)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generated successfully: {filename}")

if __name__ == "__main__":
    output_pdf = r"c:\Users\dell\OneDrive\Desktop\AI Cyber Guidence\AI_Cyber_Guardian_FullStack_Plan.pdf"
    build_pdf(output_pdf)
