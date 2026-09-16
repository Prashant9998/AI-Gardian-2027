"""
Active Canary Token Engine
Generates, injects, and verifies trackable decoy credentials (Honeytokens).
If an attacker attempts to reuse an extracted token, an immediate CRITICAL alarm is raised.
"""

import uuid
import hashlib
import time
from typing import Dict, Any, List, Optional

class CanaryTokenEngine:
    """
    Generates and monitors realistic Canary Honeytokens:
    - AWS Access Keys (AKIA...)
    - Database URIs
    - API Bearer Tokens
    - Decoy JWTs
    """
    def __init__(self):
        # In-memory registry of active canaries: token_value -> metadata
        self._active_tokens: Dict[str, Dict[str, Any]] = {}
        self._tripped_tokens: List[Dict[str, Any]] = []

    def generate_aws_key(self, memo: str = "Production S3 Vault") -> Dict[str, str]:
        unique_suffix = hashlib.md5(f"{uuid.uuid4()}-{time.time()}".encode()).hexdigest()[:16].upper()
        access_key = f"AKIA{unique_suffix}"
        secret_key = hashlib.sha256(f"secret-{unique_suffix}".encode()).hexdigest()[:40]
        
        self._register_token(access_key, "AWS_ACCESS_KEY", memo, {"secret_key": secret_key})
        return {"aws_access_key_id": access_key, "aws_secret_access_key": secret_key}

    def generate_db_uri(self, memo: str = "Customer Master Database") -> str:
        token_id = uuid.uuid4().hex[:12]
        uri = f"postgresql://guardian_admin:canary_{token_id}@db.internal-vault.corp:5432/customer_production"
        self._register_token(f"canary_{token_id}", "DATABASE_CREDENTIAL", memo, {"uri": uri})
        return uri

    def generate_api_key(self, memo: str = "Payment Gateway Token") -> str:
        token_id = uuid.uuid4().hex[:24]
        token = f"gk_canary_key_{token_id}"
        self._register_token(token, "API_SECRET_KEY", memo)
        return token

    def generate_jwt_token(self, username: str = "admin_vault") -> str:
        token_id = uuid.uuid4().hex[:16]
        jwt_token = f"eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3Jf{token_id}\",\"role\":\"superadmin\",\"canary\":\"{token_id}\"}}.SIGNATURE_VERIFIED_DEC"
        self._register_token(token_id, "ADMIN_JWT_TOKEN", f"JWT for {username}")
        return jwt_token

    def _register_token(self, token_value: str, token_type: str, memo: str, extra: Optional[Dict[str, Any]] = None):
        self._active_tokens[token_value] = {
            "token": token_value,
            "type": token_type,
            "memo": memo,
            "created_at": time.time(),
            "tripped": False,
            "trip_count": 0,
            "last_tripped_by": None,
            "extra": extra or {}
        }

    def inspect_and_check(self, text: str, attacker_ip: str) -> Optional[Dict[str, Any]]:
        """
        Inspects inbound request data/headers to check if an attacker is replaying any canary token!
        """
        if not text:
            return None
        
        for token_value, metadata in self._active_tokens.items():
            if token_value in text:
                metadata["tripped"] = True
                metadata["trip_count"] += 1
                metadata["last_tripped_by"] = attacker_ip
                metadata["last_tripped_at"] = time.time()
                
                trip_alert = {
                    "token": token_value,
                    "type": metadata["type"],
                    "memo": metadata["memo"],
                    "attacker_ip": attacker_ip,
                    "timestamp": time.time(),
                    "severity": "CRITICAL",
                    "action_required": "IMMEDIATE_INCIDENT_CONTAINMENT"
                }
                self._tripped_tokens.append(trip_alert)
                return trip_alert
        return None

    def get_all_canaries(self) -> List[Dict[str, Any]]:
        return list(self._active_tokens.values())

    def get_tripped_canaries(self) -> List[Dict[str, Any]]:
        return self._tripped_tokens

# Global Singleton
canary_engine = CanaryTokenEngine()
