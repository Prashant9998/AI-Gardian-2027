"""
Configuration models for the AI Cyber Guardian Python SDK.
"""

from dataclasses import dataclass, field
from typing import List


@dataclass
class GuardianConfig:
    """
    Configuration options for the AI Cyber Guardian SDK.
    """
    control_plane_url: str = "http://localhost:8000"
    api_key: str = "guardian-prod-demo-key-2026"
    site_id: str = "python-app-01"
    fail_open: bool = True
    timeout: float = 1.5
    cache_enabled: bool = True
    cache_ttl: int = 60  # seconds
    cache_max_size: int = 2048
    decoy_routes: List[str] = field(
        default_factory=lambda: [
            "/.env",
            "/.git/config",
            "/wp-login.php",
            "/actuator/env",
            "/admin/config",
            "/admin",
        ]
    )
    exempt_routes: List[str] = field(
        default_factory=lambda: [
            "/health",
            "/metrics",
            "/favicon.ico",
        ]
    )
    async_telemetry: bool = True
    block_status_code: int = 403
    shield_message: str = "Request blocked by AI Cyber Guardian Autonomous Zero-Trust Shield."

    def __post_init__(self):
        # Normalize control plane URL (strip trailing slash)
        self.control_plane_url = self.control_plane_url.rstrip("/")
        self.evaluate_url = f"{self.control_plane_url}/api/v1/ingestion/evaluate"
        self.honeypot_trap_url = f"{self.control_plane_url}/api/v1/honeypot/trap"
        self.telemetry_url = f"{self.control_plane_url}/api/v1/telemetry/event"

    def is_decoy(self, path: str) -> bool:
        """
        Check if the incoming request path matches a known deception decoy lure.
        """
        if not path:
            return False
        clean_path = path.lower()
        return any(clean_path == lure or lure in clean_path for lure in self.decoy_routes)

    def is_exempt(self, path: str) -> bool:
        """
        Check if the incoming request path is exempted from deep inspection.
        """
        if not path:
            return False
        clean_path = path.lower()
        return any(clean_path == ex or clean_path.startswith(ex) for ex in self.exempt_routes)
