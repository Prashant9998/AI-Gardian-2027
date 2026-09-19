import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Float,
    Boolean,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import DeclarativeBase, relationship


def utc_now():
    """Return timezone-aware current UTC time."""
    return datetime.datetime.now(datetime.timezone.utc)


class Base(DeclarativeBase):
    pass


class Tenant(Base):
    __tablename__ = 'tenants'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    sites = relationship("Site", back_populates="tenant")


class Site(Base):
    __tablename__ = 'sites'
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey('tenants.id'))
    domain = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    tenant = relationship("Tenant", back_populates="sites")
    api_keys = relationship("APIKey", back_populates="site")


class APIKey(Base):
    __tablename__ = 'api_keys'
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey('sites.id'))
    key_hash = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    site = relationship("Site", back_populates="api_keys")


class SecurityEvent(Base):
    __tablename__ = 'security_events'
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey('sites.id'), index=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    source_ip = Column(String, index=True)
    endpoint = Column(String)
    method = Column(String)
    rule_score = Column(Float, default=0.0)
    ml_score = Column(Float, default=0.0)
    final_score = Column(Float, default=0.0)
    severity = Column(String, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    action_taken = Column(String)          # ALLOW, ALERT, BLOCK, HONEYPOT
    triggered_rules = Column(JSON)         # List of rules triggered
    payload_snapshot = Column(String)      # Metadata or sanitized payload snapshot


class AttackerProfile(Base):
    __tablename__ = 'attacker_profiles'
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey('sites.id'), index=True, nullable=True)
    source_ip = Column(String, unique=True, index=True, nullable=False)
    country = Column(String, default="Unknown")
    risk_score = Column(Float, default=0.0)
    first_seen = Column(DateTime, default=utc_now)
    last_seen = Column(DateTime, default=utc_now, index=True)
    attack_count = Column(Integer, default=1)
    top_techniques = Column(JSON, default=list)
    honeypot_interactions = Column(Integer, default=0)
    is_banned = Column(Boolean, default=False, index=True)


class BlockedIP(Base):
    __tablename__ = 'blocked_ips'
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey('sites.id'), index=True, nullable=True)
    source_ip = Column(String, index=True, nullable=False)
    reason = Column(String, nullable=False)
    blocked_at = Column(DateTime, default=utc_now, index=True)
    expires_at = Column(DateTime, nullable=True, index=True)
    block_count = Column(Integer, default=1)


class HoneypotSession(Base):
    __tablename__ = 'honeypot_sessions'
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey('sites.id'), index=True, nullable=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    source_ip = Column(String, index=True, nullable=False)
    start_time = Column(DateTime, default=utc_now, index=True)
    duration_seconds = Column(Float, default=0.0)
    commands_executed = Column(JSON, default=list)
    tokens_tripped = Column(JSON, default=list)
    personality = Column(String, default="linux_terminal")
