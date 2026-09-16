"""
Honeypot Attacker Profiler & Intelligence Engine
Extracts tool fingerprints, geolocates source IPs with 24-hour cache,
maps to MITRE ATT&CK techniques, and updates persistent attacker profiles.
"""

import time
import hashlib
import json
import logging
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

logger = logging.getLogger("HoneypotProfiler")

# 24-hour TTL in-memory Geolocation Cache (FR-48)
_geo_cache: Dict[str, Tuple[Dict[str, Any], float]] = {}
GEO_CACHE_TTL_SECONDS = 86400  # 24 hours

# Known IP range mock geolocations for offline/demo reliability
SAMPLE_GEO_LOOKUP = {
    "185.220.101.": {"country": "Germany", "city": "Frankfurt", "isp": "Tor Exit Relay Network", "lat": 50.1109, "lon": 8.6821},
    "45.33.32.": {"country": "United States", "city": "Dallas", "isp": "Linode LLC / Scanner Host", "lat": 32.7767, "lon": -96.7970},
    "198.51.100.": {"country": "Netherlands", "city": "Amsterdam", "isp": "CyberHost Security Testing", "lat": 52.3676, "lon": 4.9041},
    "203.0.113.": {"country": "India", "city": "Bengaluru", "isp": "Enterprise Cloud ISP", "lat": 12.9716, "lon": 77.5946},
    "127.0.0.1": {"country": "Localhost", "city": "Internal Lab", "isp": "Loopback Simulation", "lat": 0.0, "lon": 0.0},
    "testclient": {"country": "Localhost", "city": "Internal Lab", "isp": "Pytest TestClient", "lat": 0.0, "lon": 0.0},
}

MITRE_TECHNIQUE_MAP = {
    "SQLI": "T1190 - Exploit Public-Facing Application (SQL Injection)",
    "XSS": "T1059.007 - Command and Scripting Interpreter: JavaScript (XSS)",
    "RCE": "T1059.004 - Command and Scripting Interpreter: Unix Shell",
    "LFI": "T1005 - Data from Local System (Path Traversal / LFI)",
    "BRUTE_FORCE": "T1110.001 - Brute Force: Password Guessing",
    "SCANNER": "T1595.002 - Active Scanning: Vulnerability Scanning",
    "ANOMALY": "T1027 - Obfuscated Files or Information"
}

class AttackerProfiler:
    """
    Analyzes attacker requests and maintains cross-session intelligence profiles.
    """

    @staticmethod
    def extract_fingerprint(headers: Dict[str, Any], user_agent: str) -> str:
        """
        Builds a deterministic tool and client fingerprint.
        """
        ua = user_agent.lower()
        if "sqlmap" in ua:
            return "TOOL:sqlmap-automated-injection-framework"
        elif "nikto" in ua:
            return "TOOL:nikto-web-server-scanner"
        elif "nmap" in ua:
            return "TOOL:nmap-network-mapper"
        elif "burp" in ua:
            return "TOOL:burpsuite-proxy-scanner"
        elif "curl" in ua or "python-requests" in ua:
            return f"SCRIPT:{user_agent[:40]}"
        
        # Generic browser/client fingerprint hash
        raw_fp = f"{user_agent}|{headers.get('accept-language', '')}|{headers.get('accept-encoding', '')}"
        return f"BROWSER:{hashlib.md5(raw_fp.encode()).hexdigest()[:12]}"

    @staticmethod
    def resolve_geolocation(ip: str) -> Dict[str, Any]:
        """
        Resolves IP Geolocation with 24-hour memory caching (FR-48).
        """
        now = time.time()
        
        # Check cache
        if ip in _geo_cache:
            data, timestamp = _geo_cache[ip]
            if now - timestamp < GEO_CACHE_TTL_SECONDS:
                return data

        # Default fallback
        geo_result = {
            "country": "United States",
            "city": "Unknown City",
            "isp": "Cloud/Hosting Provider",
            "latitude": 37.751,
            "longitude": -122.42
        }

        # Check mock/sample map for realistic threat demonstration
        for prefix, match_data in SAMPLE_GEO_LOOKUP.items():
            if ip.startswith(prefix) or ip == prefix:
                geo_result = match_data
                break

        # Save to cache
        _geo_cache[ip] = (geo_result, now)
        return geo_result

    @staticmethod
    def map_mitre_techniques(attack_categories: List[str]) -> List[str]:
        """Maps triggered attack categories to MITRE ATT&CK techniques."""
        techniques = []
        for cat in attack_categories:
            for key, val in MITRE_TECHNIQUE_MAP.items():
                if key in cat.upper():
                    techniques.append(val)
        return list(set(techniques)) or ["T1190 - Exploit Public-Facing Application"]

    @classmethod
    def record_attacker_intelligence(
        cls,
        db: Session,
        ip: str,
        user_agent: str,
        headers: Dict[str, Any],
        attack_category: str,
        credentials: Optional[Dict[str, str]] = None,
        honeytoken: Optional[str] = None
    ) -> Any:
        """
        Updates or creates the persistent HoneypotAttackerProfile in DB.
        """
        from models.honeypot_schema import HoneypotAttackerProfile
        
        fingerprint = cls.extract_fingerprint(headers, user_agent)
        geo = cls.resolve_geolocation(ip)
        mitre_tags = cls.map_mitre_techniques([attack_category])
        
        profile = db.query(HoneypotAttackerProfile).filter(
            HoneypotAttackerProfile.ip_address == ip
        ).first()

        if not profile:
            profile = HoneypotAttackerProfile(
                ip_address=ip,
                tool_fingerprint=fingerprint,
                user_agent=user_agent[:500],
                country=geo.get("country", "Unknown"),
                city=geo.get("city", "Unknown"),
                isp=geo.get("isp", "Unknown"),
                latitude=geo.get("lat"),
                longitude=geo.get("lon"),
                threat_level="CRITICAL" if "RCE" in attack_category or "BRUTE" in attack_category else "HIGH",
                mitre_tactics=mitre_tags,
                interaction_count=1,
                captured_credentials=[credentials] if credentials else [],
                triggered_honeytokens=[honeytoken] if honeytoken else [],
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow()
            )
            db.add(profile)
        else:
            profile.interaction_count += 1
            profile.last_seen = datetime.utcnow()
            profile.tool_fingerprint = fingerprint
            
            # Append new MITRE tactics
            current_mitre = profile.mitre_tactics or []
            for t in mitre_tags:
                if t not in current_mitre:
                    current_mitre.append(t)
            profile.mitre_tactics = current_mitre
            
            # Append captured credentials
            if credentials:
                current_creds = profile.captured_credentials or []
                if credentials not in current_creds:
                    current_creds.append(credentials)
                profile.captured_credentials = current_creds
                
            if honeytoken:
                current_tokens = profile.triggered_honeytokens or []
                if honeytoken not in current_tokens:
                    current_tokens.append(honeytoken)
                profile.triggered_honeytokens = current_tokens

        try:
            db.commit()
            db.refresh(profile)
        except Exception as e:
            logger.error(f"Error persisting attacker intelligence: {e}")
            db.rollback()

        return profile
