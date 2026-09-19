"""
AI Cyber Guardian Official Python SDK (`cyber-guardian`)
Autonomous Zero-Trust Web Defense Platform for FastAPI, Flask, and Django.
"""

from .config import GuardianConfig
from .cache import DecisionCache
from .telemetry import TelemetryDispatcher
from .client import GuardianClient
from .fastapi import GuardianFastAPIMiddleware
from .flask import GuardianFlaskMiddleware
from .django import GuardianDjangoMiddleware

__version__ = "1.0.0"
__author__ = "AI Cyber Guardian Team"

__all__ = [
    "GuardianConfig",
    "DecisionCache",
    "TelemetryDispatcher",
    "GuardianClient",
    "GuardianFastAPIMiddleware",
    "GuardianFlaskMiddleware",
    "GuardianDjangoMiddleware",
    "__version__",
]
