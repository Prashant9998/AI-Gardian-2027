from fastapi import Security, HTTPException, Depends
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session
import hashlib
from typing import Optional

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import get_db
from models.schema import APIKey

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def hash_api_key(api_key: str) -> str:
    """Hash the raw API key for comparison with the database."""
    return hashlib.sha256(api_key.encode()).hexdigest()

async def get_api_key(
    api_key_header: str = Security(api_key_header),
    db: Session = Depends(get_db)
) -> Optional[int]:
    """
    Dependency to authenticate requests using X-API-Key header.
    Returns the site_id if valid, otherwise raises HTTPException.
    """
    if not api_key_header:
        raise HTTPException(
            status_code=401,
            detail="Missing API Key"
        )
    
    hashed_key = hash_api_key(api_key_header)
    
    # Query database for the hashed key
    db_key = db.query(APIKey).filter(APIKey.key_hash == hashed_key, APIKey.is_active == True).first()
    
    if not db_key:
        raise HTTPException(
            status_code=403,
            detail="Invalid or inactive API Key"
        )
        
    return db_key.site_id
