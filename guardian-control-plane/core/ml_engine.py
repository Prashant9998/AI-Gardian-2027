import math
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from core.config import settings
from core.logger import app_logger

class FeatureExtractor:
    @staticmethod
    def calculate_entropy(text: str) -> float:
        if not text:
            return 0.0
        entropy = 0
        for x in set(text):
            p_x = float(text.count(x)) / len(text)
            entropy += - p_x * math.log2(p_x)
        return entropy

    @staticmethod
    def extract_features(request: dict) -> list:
        # Reconstruct payload safely
        path = str(request.get("path", ""))
        query = str(request.get("query", ""))
        body = str(request.get("body", ""))
        full_payload = f"{path} {query} {body}"
        
        length = len(full_payload)
        entropy = FeatureExtractor.calculate_entropy(full_payload)
        
        special_chars = set("!@#$%^&*()_+-=[]{}|;':\",./<>?")
        special_count = sum(1 for c in full_payload if c in special_chars)
        special_ratio = special_count / length if length > 0 else 0.0
        
        # We can extract more features like SQL keywords, etc., but this is the baseline
        return [length, entropy, special_ratio]


class MLEngine:
    """
    Stage 2 Deep Analysis: Machine Learning Models & Threat Fusion.
    In a real environment, models would be loaded from disk (e.g. joblib)
    trained on DVWA data. For the initial phase, we use mock/synthetic training.
    """
    def __init__(self):
        self.isolation_forest = IsolationForest(contamination=0.05, random_state=42)
        self.random_forest = RandomForestClassifier(n_estimators=50, random_state=42)
        self.is_trained = False
        self._train_mock_models()
        
    def _train_mock_models(self):
        # Generate synthetic 'normal' data (short length, low entropy, low special char ratio)
        np.random.seed(42)
        normal_data = np.column_stack((
            np.random.normal(50, 20, 1000),      # length
            np.random.normal(3.5, 0.5, 1000),    # entropy
            np.random.normal(0.05, 0.02, 1000)   # special_ratio
        ))
        
        # Generate synthetic 'attack' data (long length, high entropy, high special char ratio)
        attack_data = np.column_stack((
            np.random.normal(300, 100, 200),
            np.random.normal(4.8, 0.4, 200),
            np.random.normal(0.2, 0.05, 200)
        ))
        
        X_train = np.vstack((normal_data, attack_data))
        # Labels: 0 = Normal, 1 = Attack
        y_train = np.hstack((np.zeros(1000), np.ones(200)))
        
        # Train IF on normal data only
        self.isolation_forest.fit(normal_data)
        
        # Train RF on labeled mixed data
        self.random_forest.fit(X_train, y_train)
        self.is_trained = True
        app_logger.info("Mock ML models trained successfully.")

    def evaluate(self, request: dict) -> float:
        """
        Evaluate the request using IF and RF, returning an ML score (0-100).
        """
        features = FeatureExtractor.extract_features(request)
        X = np.array(features).reshape(1, -1)
        
        # Isolation Forest prediction: 1 (normal), -1 (anomaly)
        # Convert to anomaly score 0 (normal) to 1 (highly anomalous)
        # IF decision_function returns negative for anomalies, positive for normal
        if_score = self.isolation_forest.decision_function(X)[0]
        # Normalize to 0-1 range (roughly)
        anomaly_prob = max(0.0, min(1.0, 0.5 - if_score * 0.5))
        
        # Random Forest prediction probability for class 1 (Attack)
        rf_prob = self.random_forest.predict_proba(X)[0][1]
        
        # Combine them (e.g. equal weight)
        combined_ml_prob = (anomaly_prob + rf_prob) / 2.0
        
        # Scale to 0-100
        return combined_ml_prob * 100.0


class ThreatFusionEngine:
    """
    Blends Deterministic Rule Score with ML Score into a single Threat Score.
    """
    def __init__(self):
        self.ml_engine = MLEngine()
        # rules.py engine is handled outside and passed here to fuse
        
    def fuse(self, rule_score: float, is_critical_override: bool, request: dict) -> float:
        if is_critical_override:
            # R4 Brute-force override bypasses blending entirely
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

# Singleton
fusion_engine = ThreatFusionEngine()
