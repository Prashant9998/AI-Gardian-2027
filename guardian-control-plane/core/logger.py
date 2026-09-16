import json
import logging
import sys
from datetime import datetime

class JSONFormatter(logging.Formatter):
    """
    Structured JSON formatter for all application logs.
    Ensures logs are parsable by the SOC dashboard and Honeypot intelligence.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add any extra kwargs passed to the logger
        if hasattr(record, "extra_data"):
            log_entry.update(record.extra_data)

        # Include exception traceback if present
        if record.exc_info:
            log_entry["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)

def setup_logger(name: str) -> logging.Logger:
    """
    Initialize a structured JSON logger for the given module name.
    """
    logger = logging.getLogger(name)
    
    # Avoid duplicate handlers if setup_logger is called multiple times
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        # Prevent propagation to the root logger to avoid double logging
        logger.propagate = False
        
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        
    return logger

# Create a root-level app logger
app_logger = setup_logger("guardian")
