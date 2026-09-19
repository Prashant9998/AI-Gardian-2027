# AI Cyber Guardian Python SDK (`cyber-guardian`)

[![PyPI version](https://img.shields.io/badge/pypi-v1.0.0-blue.svg)](https://pypi.org/project/cyber-guardian/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.13%20%7C%203.14-green)](https://www.python.org/)

The official Python SDK for **AI Cyber Guardian** — an autonomous zero-trust web defense platform combining deterministic rule inspection, scikit-learn machine learning threat fusion, and enterprise deception honeypots.

Protect your **FastAPI**, **Flask**, or **Django** web applications in **3 lines of code**.

---

## Key Features

- ⚡ **Sub-Millisecond Overhead**: Local thread-safe **LRU Decision Cache with TTL** (< 0.1ms) bypasses network round-trips for standard benign user sessions.
- 🛡️ **Autonomous Dual-Defense**:
  - **Business API Shield**: Immediately returns HTTP 403 Forbidden with security telemetry for SQL Injection, XSS, and Path Traversal attacks.
  - **Deception Honeypot Diversion**: Transparently diverts attacker reconnaissance probes (`/.env`, `/.git/config`, `wp-login.php`) into the Guardian Deception Honeypot, trapping adversaries and activating live Canary Honeytokens.
- 📡 **Non-Blocking Telemetry**: Asynchronous background worker thread queues security telemetry without delaying client responses (< 2ms total latency penalty).
- 🔄 **Fail-Open Architecture**: Uninterrupted business continuity — if the Guardian Control Plane is unreachable or times out, benign traffic passes transparently without throwing 500 internal errors.

---

## Installation

```bash
# Core SDK
pip install cyber-guardian

# With FastAPI support
pip install "cyber-guardian[fastapi]"

# With Flask support
pip install "cyber-guardian[flask]"

# With Django support
pip install "cyber-guardian[django]"

# All frameworks
pip install "cyber-guardian[all]"
```

---

## Quickstart

### 1. FastAPI / Starlette

```python
from fastapi import FastAPI
from cyber_guardian.fastapi import GuardianFastAPIMiddleware

app = FastAPI()

# Attach AI Cyber Guardian in 1 line
app.add_middleware(
    GuardianFastAPIMiddleware,
    control_plane_url="http://localhost:8000",
    api_key="your-guardian-api-key",
)

@app.get("/api/catalog/search")
def search(q: str):
    return {"query": q, "results": ["Laptop", "Monitor"]}
```

### 2. Flask

```python
from flask import Flask, request, jsonify
from cyber_guardian.flask import GuardianFlaskMiddleware

app = Flask(__name__)

# Initialize AI Cyber Guardian Extension
guardian = GuardianFlaskMiddleware(
    app,
    control_plane_url="http://localhost:8000",
    api_key="your-guardian-api-key",
)

@app.route("/api/reviews", methods=["POST"])
def submit_review():
    return jsonify({"status": "review submitted"})
```

### 3. Django

Add `GuardianDjangoMiddleware` to your `settings.py`:

```python
MIDDLEWARE = [
    'cyber_guardian.django.GuardianDjangoMiddleware',
    'django.middleware.security.SecurityMiddleware',
    ...
]

# Optional Django Settings
GUARDIAN_CONTROL_PLANE = "http://localhost:8000"
GUARDIAN_API_KEY = "your-guardian-api-key"
```

---

## Configuration Options

Pass a `GuardianConfig` instance or keyword arguments to the middleware:

```python
from cyber_guardian import GuardianConfig

config = GuardianConfig(
    control_plane_url="http://localhost:8000",
    api_key="guardian-prod-demo-key-2026",
    site_id="ecommerce-prod-01",
    fail_open=True,
    timeout=1.5,
    cache_enabled=True,
    cache_ttl=60,          # Cache clean decisions for 60 seconds
    cache_max_size=2048,   # Store up to 2048 client IP/path decisions
    async_telemetry=True,  # Dispatch logs via non-blocking worker thread
    decoy_routes=[
        "/.env",
        "/.git/config",
        "/wp-login.php",
        "/actuator/env",
        "/admin",
    ],
    exempt_routes=[
        "/health",
        "/metrics",
        "/favicon.ico",
    ],
)
```

---

## Security Headers Injected

When traffic passes through AI Cyber Guardian, the SDK attaches standard telemetry headers:

| Header | Example Value | Description |
| :--- | :--- | :--- |
| `X-Guardian-Action` | `ALLOW` / `BLOCK` / `HONEYPOT_TRAP` | Final autonomous decision executed |
| `X-Guardian-Score` | `0` to `100` | Composite risk score |
| `X-Guardian-Cache` | `HIT` / `MISS` | Local in-memory LRU evaluation status |
| `X-Guardian-Deception`| `ACTIVE` | Set when route is diverted to Honeypot |

---

## License

Apache-2.0 License. See `LICENSE` for details.
