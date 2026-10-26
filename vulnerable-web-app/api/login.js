// Vercel Serverless Function: /api/login
// Vulnerable to SQL Injection Authentication Bypass

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const body = req.body || {};
  const username = String(body.username || "").trim();
  const password = String(body.password || "").trim();

  // If unprotected SQL Injection auth bypass is attempted:
  if (
    username.includes("' OR '1'='1") ||
    username.includes("' OR 1=1") ||
    username.includes("admin'--") ||
    password.includes("' OR '1'='1") ||
    password.includes("' OR 1=1")
  ) {
    return res.status(200).json({
      status: "AUTH_BYPASSED_UNPROTECTED",
      warning: "🚨 SQL AUTH BYPASS SUCCEEDED — ADMIN SESSION GRANTED (UNPROTECTED APP)",
      user: {
        id: 1,
        username: "admin_override",
        role: "Global Root Administrator",
        permissions: ["read:all", "write:all", "delete:database", "access:payment_vault"]
      },
      token: "jwt_bypassed_root_token_99812478129",
      message: "Warning: Attacker bypassed password verification via raw SQL string concatenation."
    });
  }

  // Normal valid credential check
  if (username === "admin" && password === "NovaTechPass2026!") {
    return res.status(200).json({
      status: "success",
      message: "Valid authentication.",
      user: { id: 1, username: "admin", role: "Store Manager" },
      token: "jwt_valid_session_338912"
    });
  }

  return res.status(401).json({
    status: "error",
    message: "Invalid credentials. Please verify your email and password."
  });
};
