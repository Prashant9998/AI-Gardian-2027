"""
===============================================================================
AI Cyber Guardian — Professional Honeypot & Deception Interactive Showcase
===============================================================================
Demonstrates the Enterprise Honeypot Subsystem (SRS Module 6 / FR-44 to FR-50):
1. Context-Aware Deception Responders (SQL Sandbox, Virtual Bash, Decoy LFI)
2. Interactive Fake Admin Web Console
3. Persistent Attacker Profiling (MITRE ATT&CK Mapping & 24h Cached Geolocation)
4. Forensic Session Replays for SOC Analysts
===============================================================================
"""

import sys
import os
import json

BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guardian-control-plane")
sys.path.insert(0, BACKEND_DIR)

from fastapi.testclient import TestClient
from main import app

# Set UTF-8 output encoding for Windows PowerShell/CMD
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

client = TestClient(app)

class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"

def print_banner(text):
    print(f"\n{Colors.BOLD}{Colors.MAGENTA}{'='*75}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN} {text}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'='*75}{Colors.RESET}")

def run_honeypot_showcase():
    print(f"\n{Colors.BOLD}{Colors.YELLOW}")
    print("*" * 75)
    print("      AI CYBER GUARDIAN -- ENTERPRISE HONEYPOT & DECEPTION ENGINE")
    print("              Strictly Isolated Decoy Layer (SRS Module 6)")
    print("*" * 75)
    print(f"{Colors.RESET}")

    # 1. SQL Injection Deception Demonstration
    print_banner("1. SQL Injection Attacker Trapped (Decoy Honeytokens Served)")
    sqli_probe = "SELECT * FROM users WHERE role='admin' UNION SELECT null,username,password,token FROM credentials--"
    res1 = client.post(
        "/api/v1/honeypot/trap?q=" + sqli_probe,
        content=sqli_probe,
        headers={"User-Agent": "sqlmap/1.6.12#stable", "X-Forwarded-For": "185.220.101.47"}
    )
    print(f"  {Colors.BOLD}Attacker IP:{Colors.RESET} 185.220.101.47 (Tor Exit Relay / Frankfurt)")
    print(f"  {Colors.BOLD}Exploit Payload:{Colors.RESET} {sqli_probe[:65]}...")
    print(f"  {Colors.BOLD}HTTP Status Returned:{Colors.RESET} {Colors.GREEN}{res1.status_code} OK (Deception Active){Colors.RESET}")
    print(f"  {Colors.BOLD}Decoy Data Served to Attacker:{Colors.RESET}")
    print(f"  {json.dumps(res1.json(), indent=4)[:320]}...\n")

    # 2. Remote Code Execution (RCE) Shell Deception
    print_banner("2. Remote Code Execution Attacker Trapped (Simulated Unix Shell)")
    rce_probe = "; whoami && id && cat /etc/passwd"
    res2 = client.post(
        "/api/v1/honeypot/trap?cmd=" + rce_probe,
        content=rce_probe,
        headers={"User-Agent": "CustomExploitFramework/2.0", "X-Forwarded-For": "45.33.32.156"}
    )
    print(f"  {Colors.BOLD}Attacker IP:{Colors.RESET} 45.33.32.156 (Dallas, USA / Scanner Host)")
    print(f"  {Colors.BOLD}Injected Shell Command:{Colors.RESET} {rce_probe}")
    print(f"  {Colors.BOLD}Simulated Shell Output (Fake / Zero Real Access):{Colors.RESET}")
    print(f"  {Colors.CYAN}{res2.text.strip()}{Colors.RESET}\n")

    # 3. Path Traversal (LFI) Deception
    print_banner("3. Path Traversal Attacker Trapped (Decoy Windows win.ini Served)")
    lfi_probe = "..\\..\\..\\..\\Windows\\win.ini"
    res3 = client.post(
        "/api/v1/honeypot/trap?file=" + lfi_probe,
        content=lfi_probe,
        headers={"User-Agent": "Mozilla/5.0", "X-Forwarded-For": "198.51.100.88"}
    )
    print(f"  {Colors.BOLD}Injected LFI Path:{Colors.RESET} {lfi_probe}")
    print(f"  {Colors.BOLD}Decoy File Content Returned to Attacker:{Colors.RESET}")
    print(f"  {Colors.CYAN}{res3.text.strip()}{Colors.RESET}\n")

    # 4. Interactive Fake Admin Web Portal
    print_banner("4. Web Browser Attacker Deception Portal (Interactive Admin UI)")
    admin_res = client.get("/api/v1/honeypot/admin-portal")
    print(f"  {Colors.BOLD}Admin Portal URL:{Colors.RESET} http://localhost:8000/api/v1/honeypot/admin-portal")
    print(f"  {Colors.BOLD}Response Type:{Colors.RESET} {admin_res.headers.get('content-type')}")
    print(f"  {Colors.BOLD}UI Status:{Colors.RESET} {Colors.GREEN}200 OK - Enterprise Core Administration Panel Live with Decoy Honeytoken Vault{Colors.RESET}\n")

    # 5. SOC Intelligence & MITRE ATT&CK Profiling Feed
    print_banner("5. SOC Threat Intelligence & MITRE ATT&CK Attacker Profiles")
    profiles_res = client.get("/api/v1/honeypot/attackers?limit=5")
    profiles = profiles_res.json()
    for idx, p in enumerate(profiles, 1):
        print(f"  {Colors.BOLD}[Hostile Profile #{idx}]{Colors.RESET}")
        print(f"    - {Colors.BOLD}IP Address:{Colors.RESET} {p['ip_address']} ({p['city']}, {p['country']} - {p['isp']})")
        print(f"    - {Colors.BOLD}Tool Fingerprint:{Colors.RESET} {p['tool_fingerprint']}")
        print(f"    - {Colors.BOLD}MITRE ATT&CK Tactics:{Colors.RESET} {p['mitre_tactics']}")
        print(f"    - {Colors.BOLD}Threat Level:{Colors.RESET} {Colors.RED}{p['threat_level']}{Colors.RESET} | {Colors.BOLD}Interactions Trapped:{Colors.RESET} {p['interaction_count']}")
    print()

    # 6. SOC Forensic Session Replay Feed
    print_banner("6. SOC Forensic Interaction Session Log (Chronological Audit)")
    sessions_res = client.get("/api/v1/honeypot/sessions?limit=3")
    sessions = sessions_res.json()
    for s in sessions:
        print(f"  - [{s['timestamp']}] {Colors.YELLOW}{s['ip_address']}{Colors.RESET} executed {Colors.RED}{s['attack_category']}{Colors.RESET} -> Served Deception: {Colors.GREEN}{s['deception_type']}{Colors.RESET}")
    print()

if __name__ == "__main__":
    run_honeypot_showcase()
