"""
Offline Machine Learning Model Training & Serialization Script
Trains Isolation Forest and Random Forest models on CSIC 2010 benchmark dataset,
benchmarks F1-score and False Positive Rate, and serializes Joblib model weights.
"""

import os
import sys
import json
import time
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, f1_score, precision_score, recall_score, accuracy_score

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.dataset import load_csic_benchmark_dataset
from ml.features import AdvancedFeatureExtractor

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

CATEGORY_MAP = {
    "NORMAL": 0,
    "SQLI": 1,
    "XSS": 2,
    "PATH_TRAVERSAL": 3,
    "RCE": 4,
    "SCANNER": 5
}

def train_and_evaluate():
    print("=================================================================")
    print("  AI Cyber Guardian: ML Benchmark Training & Serialization (CSIC 2010)")
    print("=================================================================\n")

    os.makedirs(MODELS_DIR, exist_ok=True)

    # 1. Load Dataset
    print("[1/5] Loading CSIC 2010 HTTP Benchmark Dataset...")
    train_data, test_data = load_csic_benchmark_dataset(
        normal_count=1600,
        attack_count_per_type=180,
        test_split=0.25
    )
    print(f"      Total Train Samples: {len(train_data)} | Total Test Samples: {len(test_data)}")

    # 2. Feature Extraction
    print("[2/5] Fitting TF-IDF char n-grams & extracting features...")
    extractor = AdvancedFeatureExtractor(max_tfidf_features=64)
    train_texts = [extractor.extract_text(r) for r in train_data]
    extractor.fit_vectorizer(train_texts)

    X_train = extractor.transform_batch(train_data)
    y_train = np.array([r["label"] for r in train_data])
    y_train_multiclass = np.array([CATEGORY_MAP.get(r["category"], 0) for r in train_data])

    X_test = extractor.transform_batch(test_data)
    y_test = np.array([r["label"] for r in test_data])
    y_test_multiclass = np.array([CATEGORY_MAP.get(r["category"], 0) for r in test_data])
    print(f"      Feature Matrix Shape: {X_train.shape} (12 numeric + 64 TF-IDF n-grams)")

    # 3. Model Training
    print("[3/5] Training Isolation Forest (Anomaly) & Random Forest (Categorizer)...")
    start_time = time.time()

    # Train Isolation Forest on normal samples only for zero-day anomaly detection
    normal_indices = (y_train == 0)
    X_train_normal = X_train[normal_indices]

    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.04,
        random_state=42,
        n_jobs=-1
    )
    iso_forest.fit(X_train_normal)

    # Train Random Forest Classifier on full training set
    rf_classifier = RandomForestClassifier(
        n_estimators=100,
        max_depth=16,
        random_state=42,
        n_jobs=-1
    )
    rf_classifier.fit(X_train, y_train_multiclass)

    training_duration = time.time() - start_time
    print(f"      Training completed in {training_duration:.2f}s.")

    # 4. Evaluation & Benchmarking
    print("[4/5] Evaluating test set benchmarks against acceptance criteria...")
    rf_preds_multiclass = rf_classifier.predict(X_test)
    rf_preds_binary = (rf_preds_multiclass > 0).astype(int)

    # Calculate metrics
    f1 = f1_score(y_test, rf_preds_binary)
    acc = accuracy_score(y_test, rf_preds_binary)
    prec = precision_score(y_test, rf_preds_binary)
    rec = recall_score(y_test, rf_preds_binary)

    # Calculate False Positive Rate (FPR) on clean normal requests: FP / (FP + TN)
    clean_mask = (y_test == 0)
    clean_test_count = np.sum(clean_mask)
    false_positives = np.sum(rf_preds_binary[clean_mask] == 1)
    fpr = (false_positives / clean_test_count) * 100.0 if clean_test_count > 0 else 0.0

    cm = confusion_matrix(y_test, rf_preds_binary)
    tn, fp, fn, tp = cm.ravel()

    print("\n--- Model Benchmark Results ---")
    print(f"  • Accuracy:              {acc * 100:.2f}%")
    print(f"  • Precision:             {prec * 100:.2f}%")
    print(f"  • Recall:                {rec * 100:.2f}%")
    print(f"  • F1-Score:              {f1 * 100:.2f}%  (Target: >= 92.0%) -> {'[PASSED]' if f1 >= 0.92 else '[FAILED]'}")
    print(f"  • False Positive Rate:   {fpr:.2f}%   (Target: <= 4.5%)  -> {'[PASSED]' if fpr <= 4.5 else '[FAILED]'}")
    print("\n--- Confusion Matrix ---")
    print(f"  True Negatives (Clean Allowed):   {tn}")
    print(f"  False Positives (Clean Flagged):  {fp}")
    print(f"  False Negatives (Attacks Missed): {fn}")
    print(f"  True Positives (Attacks Blocked): {tp}")

    # 5. Serialization
    print("\n[5/5] Serializing model weights via Joblib...")
    iso_path = os.path.join(MODELS_DIR, "isolation_forest.joblib")
    rf_path = os.path.join(MODELS_DIR, "random_forest.joblib")
    vec_path = os.path.join(MODELS_DIR, "vectorizer.joblib")
    meta_path = os.path.join(MODELS_DIR, "metadata.json")

    joblib.dump(iso_forest, iso_path, compress=3)
    joblib.dump(rf_classifier, rf_path, compress=3)
    joblib.dump(extractor.vectorizer, vec_path, compress=3)

    metadata = {
        "version": "2.4.0-csic2010",
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "f1_score": round(float(f1), 4),
        "false_positive_rate": round(float(fpr), 4),
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "feature_count": X_train.shape[1],
        "classes": CATEGORY_MAP,
        "confusion_matrix": {
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp)
        }
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"      Saved: {iso_path} ({os.path.getsize(iso_path)/1024:.1f} KB)")
    print(f"      Saved: {rf_path} ({os.path.getsize(rf_path)/1024:.1f} KB)")
    print(f"      Saved: {vec_path} ({os.path.getsize(vec_path)/1024:.1f} KB)")
    print(f"      Saved: {meta_path}")
    print("\n>>> Model training and serialization completed successfully.")
    return metadata

if __name__ == "__main__":
    train_and_evaluate()
