"""
Machine Learning Threat Inference & Threat Fusion Engine
Loads serialized Joblib models (Isolation Forest + Random Forest + TF-IDF Vectorizer)
trained on the CSIC 2010 HTTP benchmark dataset for zero-day anomaly detection and multi-class categorization.
"""

import os
import sys
import time
import joblib
import numpy as np
from core.config import settings
from core.logger import app_logger
from ml.features import AdvancedFeatureExtractor

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml", "models")

CATEGORY_NAMES = {
    0: "NORMAL",
    1: "SQLI",
    2: "XSS",
    3: "PATH_TRAVERSAL",
    4: "RCE",
    5: "SCANNER"
}

class MLEngine:
    """
    Stage 2 Deep Analysis: Machine Learning Models & Anomaly Scoring.
    Loads serialized scikit-learn models from disk (< 500ms startup).
    """
    def __init__(self):
        self.isolation_forest = None
        self.random_forest = None
        self.feature_extractor = AdvancedFeatureExtractor()
        self.is_loaded = False
        self.load_models()

    def load_models(self, force: bool = False) -> bool:
        """Loads serialized models from ml/models/ with latency benchmarking."""
        if self.is_loaded and not force:
            return True

        start_time = time.time()
        iso_path = os.path.join(MODELS_DIR, "isolation_forest.joblib")
        rf_path = os.path.join(MODELS_DIR, "random_forest.joblib")
        vec_path = os.path.join(MODELS_DIR, "vectorizer.joblib")

        if os.path.exists(iso_path) and os.path.exists(rf_path) and os.path.exists(vec_path):
            try:
                self.isolation_forest = joblib.load(iso_path)
                self.random_forest = joblib.load(rf_path)
                self.feature_extractor.vectorizer = joblib.load(vec_path)
                self.feature_extractor.is_fitted = True
                self.is_loaded = True

                load_ms = (time.time() - start_time) * 1000.0
                app_logger.info(f"Loaded serialized Joblib ML models from disk in {load_ms:.2f}ms.")
                return True
            except Exception as e:
                app_logger.error(f"Failed to load serialized models: {e}. Falling back to baseline.")

        # Fallback: train lightweight baseline if models missing
        self._train_fallback_models()
        load_ms = (time.time() - start_time) * 1000.0
        app_logger.warning(f"Initialized fallback ML models in {load_ms:.2f}ms.")
        return True

    def _train_fallback_models(self):
        """Lightweight fallback models in case serialized joblib files are missing."""
        from sklearn.ensemble import IsolationForest, RandomForestClassifier
        from ml.dataset import load_csic_benchmark_dataset

        train_data, _ = load_csic_benchmark_dataset(normal_count=400, attack_count_per_type=40)
        train_texts = [self.feature_extractor.extract_text(r) for r in train_data]
        self.feature_extractor.fit_vectorizer(train_texts)

        X_train = self.feature_extractor.transform_batch(train_data)
        y_train = np.array([r["label"] for r in train_data])

        self.isolation_forest = IsolationForest(contamination=0.05, random_state=42)
        self.isolation_forest.fit(X_train[y_train == 0])

        self.random_forest = RandomForestClassifier(n_estimators=50, random_state=42)
        self.random_forest.fit(X_train, y_train)
        self.is_loaded = True

    def evaluate(self, request: dict) -> float:
        """
        Evaluates the request using Isolation Forest and Random Forest.
        Returns a threat score between 0.0 and 100.0.
        """
        if not self.is_loaded:
            self.load_models()

        # Extract features (< 3ms)
        X = self.feature_extractor.transform(request).reshape(1, -1)

        # 1. Isolation Forest Anomaly Score
        # decision_function yields > 0 for normal, < 0 for anomalous
        if_raw = self.isolation_forest.decision_function(X)[0]
        # Smooth mapping to probability 0.0 - 1.0
        anomaly_prob = max(0.0, min(1.0, 0.5 - (if_raw * 1.5)))

        # 2. Random Forest Classification Probability
        probs = self.random_forest.predict_proba(X)[0]
        top_class = int(self.random_forest.predict(X)[0])
        classes = list(self.random_forest.classes_)
        if 0 in classes:
            idx_normal = classes.index(0)
            rf_normal_prob = float(probs[idx_normal])
            rf_attack_prob = 1.0 - rf_normal_prob
        else:
            rf_attack_prob = float(probs[1]) if len(probs) > 1 else 0.0

        # When an attack class is identified by Random Forest
        if top_class != 0:
            final_ml_score = 65.0 + (rf_attack_prob * 35.0)
        elif rf_attack_prob < 0.1 and if_raw > -0.05:
            # High confidence clean normal traffic
            final_ml_score = max(0.0, min(20.0, (1.0 - max(0.0, if_raw)) * 10.0))
        else:
            combined_prob = (0.3 * anomaly_prob) + (0.7 * rf_attack_prob)
            final_ml_score = min(100.0, max(0.0, combined_prob * 100.0))

        return round(float(final_ml_score), 1)

    def predict_category(self, request: dict) -> str:
        """Returns the predicted threat category name (e.g. SQLI, XSS, NORMAL)."""
        if not self.is_loaded:
            self.load_models()

        X = self.feature_extractor.transform(request).reshape(1, -1)
        pred_class = int(self.random_forest.predict(X)[0])
        return CATEGORY_NAMES.get(pred_class, "ANOMALY")


class ThreatFusionEngine:
    """
    Blends Deterministic Rule Score with ML Score into a single Composite Threat Score.
    """
    def __init__(self):
        self.ml_engine = MLEngine()

    def fuse(self, rule_score: float, is_critical_override: bool, request: dict) -> float:
        if is_critical_override:
            # R4 Brute-force hard override forces 100.0
            return 100.0

        ml_score = self.ml_engine.evaluate(request)

        rule_weight = settings.get("rule_weight", 0.6)
        ml_weight = settings.get("ml_weight", 0.4)

        # Scale rule score so >= 10.0 is 100%, 8.0 is 80%, 6.0 is 60%
        normalized_rule_score = min(100.0, (rule_score / settings.get("threshold_high", 10.0)) * 100.0)

        if normalized_rule_score >= 60.0:
            final_score = max(normalized_rule_score, (normalized_rule_score * rule_weight) + (ml_score * ml_weight))
        else:
            final_score = (normalized_rule_score * rule_weight) + (ml_score * ml_weight)

        return min(100.0, max(0.0, final_score))


# Global Singleton
fusion_engine = ThreatFusionEngine()
