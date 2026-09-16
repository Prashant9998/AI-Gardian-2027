import httpx
import asyncio
from core.config import settings
from core.logger import app_logger

class DecisionEngine:
    """
    Stage 3 & 4: Maps 0-100 Threat Score to Actions and handles Alerts.
    """
    
    def evaluate_score(self, final_score: float) -> str:
        """
        Maps a 0-100 fused threat score to a categorical Severity.
        Note: The 0-100 scale thresholds could be dynamically configured.
        We'll map it roughly: <30 LOW, 30-60 MEDIUM, 60-85 HIGH, >=85 CRITICAL.
        """
        if final_score >= 85.0:
            return "CRITICAL"
        elif final_score >= 60.0:
            return "HIGH"
        elif final_score >= 30.0:
            return "MEDIUM"
        else:
            return "LOW"
            
    def map_severity_to_action(self, severity: str) -> str:
        mapping = {
            "LOW": "ALLOW",
            "MEDIUM": "ALERT",
            "HIGH": "BLOCK",
            "CRITICAL": "HONEYPOT"
        }
        return mapping.get(severity, "ALLOW")

    def trigger_alert(self, site_id: int, ip: str, severity: str, final_score: float, payload: str):
        """
        Alerting Hook. Sends an asynchronous/background alert when configured.
        """
        if severity not in ["MEDIUM", "HIGH", "CRITICAL"]:
            return

        webhook_url = settings.get("alert_webhook_url", None)
        if not webhook_url:
            return # Skip if no webhook URL is configured
        
        alert_payload = {
            "site_id": site_id,
            "ip": ip,
            "severity": severity,
            "score": final_score,
            "payload_snippet": str(payload)[:200]
        }
        
        app_logger.info({
            "message": "Dispatching alert webhook",
            "alert": alert_payload
        })
        
        try:
            httpx.post(webhook_url, json=alert_payload, timeout=0.5)
        except Exception as e:
            app_logger.error(f"Failed to dispatch alert webhook: {e}")

decision_engine = DecisionEngine()
