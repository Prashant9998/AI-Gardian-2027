"""
STIX 2.1 Threat Intelligence Exporter
Converts captured honeypot attacker intelligence, MITRE ATT&CK tactics,
and Canary Honeytoken breaches into standard STIX 2.1 Threat Intelligence JSON bundles.
"""

import uuid
import datetime
from typing import List, Dict, Any

class STIXExporter:
    """
    Serializes HoneypotAttackerProfile records into official STIX 2.1 Bundle format.
    """
    @staticmethod
    def export_bundle(attacker_profiles: List[Any]) -> Dict[str, Any]:
        bundle_id = f"bundle--{uuid.uuid4()}"
        objects = []

        # 1. Add Identity object for the reporting Honeypot Sensor
        identity_id = f"identity--{uuid.uuid4()}"
        objects.append({
            "type": "identity",
            "spec_version": "2.1",
            "id": identity_id,
            "created": datetime.datetime.utcnow().isoformat() + "Z",
            "modified": datetime.datetime.utcnow().isoformat() + "Z",
            "name": "AI Cyber Guardian Deception Sensor",
            "identity_class": "system"
        })

        for p in attacker_profiles:
            # 2. Add IPv4/IPv6 Indicator of Compromise (IOC)
            indicator_id = f"indicator--{uuid.uuid4()}"
            ip = getattr(p, "ip_address", "127.0.0.1")
            threat_level = getattr(p, "threat_level", "HIGH")
            tactics = getattr(p, "mitre_tactics", [])
            country = getattr(p, "country", "Unknown")

            objects.append({
                "type": "indicator",
                "spec_version": "2.1",
                "id": indicator_id,
                "created": datetime.datetime.utcnow().isoformat() + "Z",
                "modified": datetime.datetime.utcnow().isoformat() + "Z",
                "name": f"Malicious Probing Host: {ip}",
                "description": f"Attacker observed probing high-severity honeypot endpoints from {country}. Threat Level: {threat_level}.",
                "indicator_types": ["malicious-activity", "anomalous-activity"],
                "pattern": f"[ipv4-addr:value = '{ip}']",
                "pattern_type": "stix",
                "valid_from": datetime.datetime.utcnow().isoformat() + "Z",
                "confidence": 95 if threat_level == "CRITICAL" else 80
            })

            # 3. Add Attack Pattern objects for MITRE tactics
            for tactic in tactics:
                attack_pattern_id = f"attack-pattern--{uuid.uuid4()}"
                objects.append({
                    "type": "attack-pattern",
                    "spec_version": "2.1",
                    "id": attack_pattern_id,
                    "created": datetime.datetime.utcnow().isoformat() + "Z",
                    "modified": datetime.datetime.utcnow().isoformat() + "Z",
                    "name": tactic,
                    "external_references": [
                        {
                            "source_name": "mitre-attack",
                            "external_id": tactic.split()[0] if tactic else "T1190"
                        }
                    ]
                })

        return {
            "type": "bundle",
            "id": bundle_id,
            "objects": objects
        }

stix_exporter = STIXExporter()
