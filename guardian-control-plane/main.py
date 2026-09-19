from fastapi import FastAPI
from contextlib import asynccontextmanager
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.config import settings
from core.logger import app_logger
from db.database import engine, Base
from api.routers import ingestion, decisions, reporting, honeypot, ws, demo, ml_ops
import models.honeypot_schema # Ensure Honeypot tables are registered with Base.metadata

@asynccontextmanager
async def lifespan(app: FastAPI):
    app_logger.info("Starting Guardian Control Plane...")
    
    # Create database tables if they don't exist
    try:
        Base.metadata.create_all(bind=engine)
        app_logger.info("Database tables verified (including Honeypot Deception Schema).")
        
        # Seed default test tenant and API key if none exist
        from db.database import SessionLocal
        from models.schema import Tenant, Site, APIKey
        from core.api_key_auth import hash_api_key
        
        if SessionLocal:
            db = SessionLocal()
            try:
                if not db.query(Tenant).first():
                    tenant = Tenant(name="Enterprise Demo Corp")
                    db.add(tenant)
                    db.commit()
                    db.refresh(tenant)
                    
                    site = Site(tenant_id=tenant.id, domain="app.protected-domain.com")
                    db.add(site)
                    db.commit()
                    db.refresh(site)
                    
                    api_key = APIKey(
                        site_id=site.id,
                        key_hash=hash_api_key("guardian-prod-demo-key-2026"),
                        is_active=True
                    )
                    db.add(api_key)
                    db.commit()
                    app_logger.info("Seeded default Tenant, Site, and APIKey (guardian-prod-demo-key-2026).")
            finally:
                db.close()
        # Warmup and verify ML models in memory (< 500ms startup requirement)
        import time
        from core.ml_engine import fusion_engine
        ml_start = time.time()
        fusion_engine.ml_engine.load_models()
        fusion_engine.ml_engine.evaluate({"path": "/health", "query": "", "body": ""})
        ml_load_time_ms = (time.time() - ml_start) * 1000.0
        app_logger.info(f"ML threat models hydrated & warmed up in {ml_load_time_ms:.2f}ms (< 500ms target).")
    except Exception as e:
        app_logger.error(f"Error creating/seeding database tables or ML loading: {e}")
        
    yield
    
    app_logger.info("Shutting down Guardian Control Plane...")

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Guardian Control Plane",
    description="Central decision-making service for AI Cyber Guardian",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for SOC Dashboard and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(ingestion.router)
app.include_router(decisions.router)
app.include_router(reporting.router)
app.include_router(honeypot.router)
app.include_router(ws.router)
app.include_router(demo.router)
app.include_router(ml_ops.router)
# app.include_router(admin.router)

@app.get("/health")
async def health_check():
    """Basic health check endpoint that bypasses API Key authentication."""
    return {"status": "ok", "version": "1.0.0"}
