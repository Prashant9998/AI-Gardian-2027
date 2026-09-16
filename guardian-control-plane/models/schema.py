from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

class Tenant(Base):
    __tablename__ = 'tenants'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    sites = relationship("Site", back_populates="tenant")

class Site(Base):
    __tablename__ = 'sites'
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey('tenants.id'))
    domain = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    tenant = relationship("Tenant", back_populates="sites")
    api_keys = relationship("APIKey", back_populates="site")

class APIKey(Base):
    __tablename__ = 'api_keys'
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey('sites.id'))
    key_hash = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    site = relationship("Site", back_populates="api_keys")

class SecurityEvent(Base):
    __tablename__ = 'security_events'
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey('sites.id'), index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    source_ip = Column(String, index=True)
    endpoint = Column(String)
    method = Column(String)
    rule_score = Column(Float, default=0.0)
    ml_score = Column(Float, default=0.0)
    final_score = Column(Float, default=0.0)
    severity = Column(String, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    action_taken = Column(String) # ALLOW, ALERT, BLOCK, HONEYPOT
    triggered_rules = Column(JSON) # List of rules triggered
    payload_snapshot = Column(String) # Metadata or sanitized payload snapshot
