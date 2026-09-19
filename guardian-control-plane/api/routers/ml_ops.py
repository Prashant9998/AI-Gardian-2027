"""
ML Operations & Training API Router for AI Cyber Guardian.
Provides model inspection, benchmark metrics, and on-demand model retraining.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import os
import json
import time

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.ml_engine import fusion_engine, MODELS_DIR
from ml.train import train_and_evaluate
from api.routers.ws import manager as ws_manager

router = APIRouter(prefix="/api/v1/ml", tags=["Machine Learning Pipeline"])

@router.get("/status")
def get_ml_status() -> Dict[str, Any]:
    """Returns current status, parameters, and benchmark accuracy of active ML models."""
    meta_path = os.path.join(MODELS_DIR, "metadata.json")
    metadata = {}
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        except Exception:
            pass

    return {
        "status": "LOADED" if fusion_engine.ml_engine.is_loaded else "FALLBACK",
        "dual_engine": {
            "anomaly_detector": "IsolationForest (contamination=0.04)",
            "threat_classifier": "RandomForestClassifier (100 estimators, max_depth=16)",
            "feature_extractor": "TF-IDF N-grams (2-3 char) + 12 Domain Features (80 dimensions)"
        },
        "blend_ratio": "60% Deterministic Rules + 40% ML Probability",
        "benchmark": metadata,
        "models_dir": MODELS_DIR
    }

@router.post("/retrain")
async def retrain_ml_models() -> Dict[str, Any]:
    """
    Triggers offline ML model training on CSIC 2010 HTTP dataset,
    re-benchmarks accuracy/F1/FPR, serializes Joblib files, and reloads into memory.
    """
    start_time = time.time()
    try:
        # 1. Run training and evaluation pipeline
        new_metadata = train_and_evaluate()
        
        # 2. Hot-reload models in memory without dropping connections
        fusion_engine.ml_engine.load_models(force=True)
        
        duration = round(time.time() - start_time, 2)
        
        # 3. Broadcast ML Retrained event to connected SOC Dashboards via WebSocket
        await ws_manager.broadcast({
            "type": "ML_RETRAIN_COMPLETED",
            "message": "AI Cyber Guardian dual-engine ML models retrained & reloaded successfully.",
            "metrics": new_metadata,
            "duration_sec": duration,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        })
        
        return {
            "status": "success",
            "message": "ML models trained and dynamically reloaded in memory.",
            "training_duration_seconds": duration,
            "metrics": new_metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model retraining failed: {str(e)}")
