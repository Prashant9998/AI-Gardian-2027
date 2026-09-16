import json
import os
import logging

logger = logging.getLogger(__name__)

class Settings:
    """
    Centralized configuration module.
    Loads settings from thresholds.json with safe in-code defaults.
    """
    # Fallback defaults
    DEFAULT_CONFIG = {
        # Rule weights
        "R1_weight": 8.0,
        "R2_weight": 7.0,
        "R3_weight": 6.0,
        "R4_weight": 5.0,
        "R5_weight": 4.0,
        "R6_weight": 2.0,
        
        # Rate limit thresholds
        "burst_window_seconds": 10,
        "burst_limit": 50,
        "sustained_window_seconds": 60,
        "sustained_limit": 150,
        "R4_window_seconds": 120,
        "R4_attempt_threshold": 20,
        
        # Rule specific limits
        "R6_max_query_len": 2048,
        
        # ML score blending coefficients
        "ml_weight": 0.4,
        "rule_weight": 0.6,
        
        # Severity Cutoffs
        "threshold_medium": 5.0,
        "threshold_high": 10.0,
        "threshold_critical": 15.0,
    }

    def __init__(self, config_path: str = None):
        if config_path is None:
            # Default to thresholds.json in the project root
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.config_path = os.path.join(base_dir, "thresholds.json")
        else:
            self.config_path = config_path

        self._config = dict(self.DEFAULT_CONFIG)
        self.reload()

    def reload(self):
        """Re-reads thresholds.json from disk with fallback to defaults."""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, "r", encoding="utf-8") as f:
                    file_config = json.load(f)
                    self._config.update(file_config)
                logger.info(f"Successfully loaded thresholds from {self.config_path}")
            else:
                logger.warning(f"Config file not found at {self.config_path}. Using fallback default thresholds.")
        except json.JSONDecodeError as err:
            logger.error(f"Malformed JSON in {self.config_path} ({err}). Using fallback default thresholds.")
        except Exception as e:
            logger.error(f"Error loading {self.config_path} ({e}). Using fallback default thresholds.")

    def get(self, key: str, default=None):
        return self._config.get(key, default)

    @property
    def redis_url(self) -> str:
        return os.getenv("REDIS_URL", "redis://localhost:6379/0")

    @property
    def database_url(self) -> str:
        return os.getenv("DATABASE_URL", "postgresql://guardian:guardianpassword@localhost:5432/guardian_db")

# Global singleton
settings = Settings()
