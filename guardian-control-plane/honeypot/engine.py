"""
Interactive Deception Engine (Enterprise Edition)
Generates context-aware, stateful, hyper-realistic deception responses:
- Command Injection (RCE) -> Stateful Virtual Linux Shell (VFS) with persistent CWD & file creation
- SQL Injection -> Simulated Database Engine with dynamic Honeytokens
- Path Traversal (LFI) -> Virtual Filesystem & System configuration access
- Attack Surfaces -> /.env, /.git/config, /wp-login.php, /actuator/env
"""

import json
import re
import urllib.parse
from typing import Dict, Any, Tuple
from honeypot.vfs import vfs_manager
from honeypot.canary import canary_engine
from honeypot.surfaces import (
    get_decoy_env_file,
    get_decoy_git_config,
    get_decoy_wordpress_login,
    get_decoy_actuator_env
)

class DeceptionEngine:
    """
    Enterprise-grade Deception Engine.
    """

    @classmethod
    def generate_response(
        cls, 
        payload: Dict[str, Any], 
        session_id: str = "default_session", 
        ip: str = "127.0.0.1"
    ) -> Tuple[str, Any, str]:
        """
        Analyzes the malicious probe and returns:
        - (deception_type, response_body, attack_category)
        """
        path = payload.get("path", "").lower()
        raw_text = f"{payload.get('path', '')} {payload.get('query', '')} {payload.get('body', '')}"
        decoded = urllib.parse.unquote(urllib.parse.unquote(raw_text)).lower()

        # Check if attacker is replaying any canary honeytoken!
        canary_trip = canary_engine.inspect_and_check(raw_text, ip)

        # 1. High-Value Surface Traps: /.env
        if ".env" in path:
            return "DECOY_ENV_FILE", get_decoy_env_file(), "RECON_CANARY_TRIP"

        # 2. High-Value Surface Traps: /.git/config
        if ".git" in path:
            return "DECOY_GIT_CONFIG", get_decoy_git_config(), "RECON_SOURCE_EXPOSURE"

        # 3. High-Value Surface Traps: /wp-login.php or /xmlrpc.php
        if "wp-login" in path or "xmlrpc" in path:
            return "DECOY_WORDPRESS", get_decoy_wordpress_login(), "BRUTE_FORCE_WORDPRESS"

        # 4. High-Value Surface Traps: Spring Boot Actuator
        if "actuator" in path:
            return "DECOY_SPRING_ACTUATOR", get_decoy_actuator_env(), "RECON_SPRING_ACTUATOR"

        # 5. Detect & Respond to SQL Injection (Priority on SQL keywords)
        if any(sqli in decoded for sqli in ["union", "select", "or 1=1", "or '1'='1", "drop table", "--", "from users", "insert into"]):
            # Generate active canary tokens for this specific attacker session
            aws_canary = canary_engine.generate_aws_key(f"SQLi Exfiltration by {ip}")
            db_canary = canary_engine.generate_db_uri(f"SQLi Dump by {ip}")
            
            decoy_records = [
                {"id": 1, "username": "admin", "role": "superadmin", "password_hash": "$2b$12$e9w8JqF.X7x9M.FAKEHASH98127391823791283", "api_token": aws_canary["aws_access_key_id"]},
                {"id": 2, "username": "fin_lead", "role": "finance", "password_hash": "$2b$12$K8d9A0x.L1p8N.FAKEHASH19827391823791283", "db_url": db_canary},
                {"id": 3, "username": "devops_service", "role": "ci_cd", "password_hash": "$2b$12$Z3k1P4v.M9q2B.FAKEHASH39827391823791283", "aws_secret": aws_canary["aws_secret_access_key"]}
            ]
            return "FAKE_SQL_RESULT", {
                "query_status": "SUCCESS",
                "affected_rows": len(decoy_records),
                "columns": ["id", "username", "role", "password_hash", "token"],
                "data": decoy_records
            }, "SQLI"

        # 6. Detect & Respond to Command Injection (RCE) with Stateful Virtual Shell!
        rce_match = re.search(r"(;|\||&&|`)\s*(whoami|id|cat|uname|ls|dir|pwd|sh|bash|curl|wget|echo|mkdir|touch)\b", decoded) or re.search(r"\b(whoami|cat\s+/etc|uname\s+-a|ps\s+aux|netstat)\b", decoded)
        if rce_match:
            shell = vfs_manager.get_or_create_session(session_id, ip)
            # Extract the command portion
            cmd_to_run = decoded.split(";")[-1].split("|")[-1].split("&&")[-1].strip()
            if not cmd_to_run or len(cmd_to_run) < 2:
                cmd_to_run = rce_match.group(0).strip(";|&&` ")
            
            output = shell.execute(cmd_to_run)
            return "FAKE_BASH_SHELL", {"stdout": output, "returncode": 0, "status": "executed", "cwd": shell.cwd}, "RCE"

        # 7. Detect & Respond to Path Traversal / LFI with Virtual Filesystem
        if any(lfi in decoded for lfi in ["../", "..\\", "etc/passwd", "win.ini", "boot.ini", "config.php"]):
            shell = vfs_manager.get_or_create_session(session_id, ip)
            file_req = decoded.split("file=")[-1].split("path=")[-1].split()[-1] if ("file=" in decoded or "path=" in decoded) else "/etc/passwd"
            content = shell._cat_file(file_req)
            return "FAKE_LFI_FILE", {"file_content": content, "file_path": file_req}, "LFI"

        # 8. Detect & Respond to Brute-Force Logins
        if payload.get("endpoint_type") == "login" or "login" in path:
            jwt_token = canary_engine.generate_jwt_token(f"BruteForce_{ip}")
            return "FAKE_ADMIN_PORTAL", {
                "authenticated": True,
                "token": jwt_token,
                "role": "admin_restricted_mode",
                "dashboard_url": "/api/v1/honeypot/admin-portal"
            }, "BRUTE_FORCE"

        # 9. Generic Deception Fallback
        return "FAKE_GENERIC_API", {
            "status": "success",
            "message": "Operation processed successfully.",
            "transaction_id": f"tx_canary_{session_id[:8]}"
        }, "ANOMALY"
