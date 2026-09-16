from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add parent directory to sys.path to allow imports when running directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from core.logger import app_logger
from models.schema import Base

SessionLocal = None
engine = None

def init_db():
    global engine, SessionLocal
    try:
        engine = create_engine(settings.database_url, pool_pre_ping=True)
        # Test connection
        with engine.connect() as conn:
            pass
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        app_logger.info("Connected to PostgreSQL database successfully.")
    except Exception as e:
        app_logger.warning(f"PostgreSQL unavailable ({e}). Using local SQLite database.")
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "guardian_dev.db")
        engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

init_db()

def get_db():
    if not SessionLocal:
        init_db()
        
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
