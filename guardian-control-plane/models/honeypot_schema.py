"""
Honeypot Isolated Database Schema
Conformant to SRS Module 6 (FR-44 to FR-50)
Strictly isolated from customer production data (no foreign keys to real tenant tables).
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, JSON, Text
import datetime
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.schema import Base

class HoneypotAttackerProfile(Base):
    """
    Persistent, cross-session attacker profile built per source identity (IP + Fingerprint).
    """
    __tablename__ = 'honeypot_attacker_profiles'

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(64), unique=True, index=True, nullable=False)
    tool_fingerprint = Column(String(256), index=True)
    user_agent = Column(String(512))
    
    # Geolocation Intelligence (Cached)
    country = Column(String(64), default="Unknown")
    city = Column(String(64), default="Unknown")
    isp = Column(String(128), default="Unknown")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Threat Intelligence & MITRE ATT&CK profiling
    threat_level = Column(String(32), default="CRITICAL")  # HIGH, CRITICAL, ADVANCED_PERSISTENT
    mitre_tactics = Column(JSON, default=list)            # e.g. ["T1190 - Exploit Public-Facing App", "T1078 - Valid Accounts"]
    interaction_count = Column(Integer, default=1)
    
    # Honeytoken triggers
    triggered_honeytokens = Column(JSON, default=list)    # Trapped fake tokens attacker attempted to use
    captured_credentials = Column(JSON, default=list)     # Fake username/password combos tried
    
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class HoneypotInteractionLog(Base):
    """
    Immutable log of every action the attacker executes inside the deception sandbox.
    """
    __tablename__ = 'honeypot_interaction_logs'

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True)
    ip_address = Column(String(64), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    # Attack vector details
    endpoint = Column(String(256))
    method = Column(String(16))
    attack_category = Column(String(64))                  # SQLi, XSS, RCE, LFI, BruteForce, Recon
    raw_payload = Column(Text)
    headers_snapshot = Column(JSON)
    
    # Deception served
    deception_type = Column(String(64))                   # FAKE_SQL_RESULT, FAKE_BASH_SHELL, FAKE_ADMIN_PORTAL, FAKE_LFI_FILE
    response_status = Column(Integer, default=200)        # Always HTTP 200 OK (FR-44)
    response_preview = Column(Text)
    
    # Captured intelligence
    extracted_credentials = Column(JSON, nullable=True)   # {"username": "admin", "password": "..."}
    extracted_command = Column(String(256), nullable=True)
