"""
Multi-Dimensional Feature Engineering Pipeline for HTTP Threat Detection
Extracts statistical, structural, domain-specific signature indicators,
and character TF-IDF n-grams from HTTP requests.
"""

import math
import numpy as np
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer

SQLI_KEYWORDS = ["select", "union", "insert", "drop", "table", "from", "where", "information_schema", "schema", "sleep(", "--", "or '1'='1", "or 1=1"]
XSS_KEYWORDS = ["<script", "</script", "onerror", "onload", "javascript:", "<iframe", "<img", "<svg", "document.cookie", "alert("]
PATH_KEYWORDS = ["../", "..\\", "etc/passwd", "etc/shadow", "win.ini", "boot.ini", "%2e%2e%2f", "/proc/self"]
RCE_KEYWORDS = ["; cat", "| whoami", "&& uname", "& dir", "`id`", "$(whoami)", "/bin/bash", "netstat", "nc -e"]
SCANNER_KEYWORDS = ["wp-login", ".env", ".git", "actuator", "phpmyadmin", "server-status", "swagger-ui"]
SCANNER_UAS = ["nikto", "sqlmap", "dirbuster", "nmap", "acunetix", "nessus"]

SPECIAL_CHARS = set("!@#$%^&*()_+-=[]{}|;':\",./<>?\\`~")

class AdvancedFeatureExtractor:
    """
    Extracts statistical, domain-specific, and character n-gram features from HTTP requests.
    """
    def __init__(self, max_tfidf_features: int = 64):
        self.vectorizer = TfidfVectorizer(
            analyzer="char",
            ngram_range=(2, 3),
            max_features=max_tfidf_features,
            lowercase=True
        )
        self.is_fitted = False

    @staticmethod
    def calculate_entropy(text: str) -> float:
        """Calculates Shannon entropy of the given text string."""
        if not text:
            return 0.0
        entropy = 0.0
        length = float(len(text))
        for x in set(text):
            p_x = text.count(x) / length
            entropy += - p_x * math.log2(p_x)
        return entropy

    @staticmethod
    def extract_text(request: Dict[str, Any]) -> str:
        """Flattens an HTTP request path, query, and body into a unified text representation."""
        path = str(request.get("path", "")).strip()
        query = str(request.get("query", "")).strip()
        body = str(request.get("body", "")).strip()
        parts = [p for p in [path, query, body] if p]
        return " ".join(parts) if parts else "/"

    def extract_numeric_features(self, request: Dict[str, Any], text: str) -> List[float]:
        """Calculates statistical, structural, and domain characteristics from request."""
        length = len(text)
        if length == 0:
            return [0.0] * 16

        f_len = float(length)
        f_entropy = self.calculate_entropy(text)

        special_count = sum(1 for c in text if c in SPECIAL_CHARS)
        f_special_ratio = special_count / f_len

        f_quotes = float(text.count("'") + text.count('"'))
        f_brackets = float(text.count("<") + text.count(">"))
        f_semicolon = float(text.count(";"))
        f_slash = float(text.count("/") + text.count("\\"))
        f_dash = float(text.count("-"))

        f_digits = sum(1 for c in text if c.isdigit()) / f_len
        f_upper = sum(1 for c in text if c.isupper()) / f_len
        f_params = float(text.count("=") + text.count("&"))

        text_lower = text.lower()
        f_sqli = float(sum(1 for kw in SQLI_KEYWORDS if kw in text_lower))
        f_xss = float(sum(1 for kw in XSS_KEYWORDS if kw in text_lower))
        f_path = float(sum(1 for kw in PATH_KEYWORDS if kw in text_lower))
        f_rce = float(sum(1 for kw in RCE_KEYWORDS if kw in text_lower))
        f_scanner = float(sum(1 for kw in SCANNER_KEYWORDS if kw in text_lower))

        headers = request.get("headers", {})
        ua = str(headers.get("User-Agent", "")).lower() if isinstance(headers, dict) else ""
        f_scanner_ua = 1.0 if any(sua in ua for sua in SCANNER_UAS) else 0.0

        return [
            f_len,
            f_entropy,
            f_special_ratio,
            f_quotes,
            f_brackets,
            f_semicolon,
            f_slash,
            f_dash,
            f_digits,
            f_upper,
            f_params,
            f_sqli,
            f_xss,
            f_path,
            f_rce,
            f_scanner + f_scanner_ua
        ]

    def fit_vectorizer(self, corpus: List[str]):
        """Fits the TF-IDF character n-gram vocabulary on training texts."""
        self.vectorizer.fit(corpus)
        self.is_fitted = True

    def transform(self, request: Dict[str, Any]) -> np.ndarray:
        """Converts a single request dict into a combined feature vector."""
        text = self.extract_text(request)
        num_feats = np.array(self.extract_numeric_features(request, text))

        if self.is_fitted:
            tfidf_feats = self.vectorizer.transform([text]).toarray()[0]
            return np.hstack((num_feats, tfidf_feats))
        else:
            return num_feats

    def transform_batch(self, requests: List[Dict[str, Any]]) -> np.ndarray:
        """Transforms multiple requests into a 2D feature matrix."""
        texts = [self.extract_text(r) for r in requests]
        num_matrix = np.array([self.extract_numeric_features(r, t) for r, t in zip(requests, texts)])

        if self.is_fitted:
            tfidf_matrix = self.vectorizer.transform(texts).toarray()
            return np.hstack((num_matrix, tfidf_matrix))
        else:
            return num_matrix
