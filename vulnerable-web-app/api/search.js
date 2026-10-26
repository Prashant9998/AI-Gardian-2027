// Vercel Serverless Function: /api/search
// Vulnerable to SQL Injection (e.g. ' UNION SELECT ...) when unprotected

const PRODUCTS = [
  { id: 101, name: "Enterprise Zero-Trust Gateway", category: "Hardware", price: 1299.00, stock: 14 },
  { id: 102, name: "Quantum Encryption Dongle", category: "Auth", price: 89.99, stock: 45 },
  { id: 103, name: "HSM Cloud Key Vault Keypad", category: "Enterprise", price: 499.00, stock: 8 },
  { id: 104, name: "Biometric Hardware Token FIDO2", category: "Auth", price: 65.00, stock: 120 },
  { id: 105, name: "Layer 7 Packet Inspection Appliance", category: "Hardware", price: 2199.00, stock: 5 },
  { id: 106, name: "Dedicated VPN Tunnel Terminal", category: "Networking", price: 349.50, stock: 28 }
];

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const query = (req.query.q || "").trim();

  // If unprotected and contains UNION SELECT / SQL exploit, simulate dumped data
  if (query.toUpperCase().includes("UNION SELECT") || query.includes("' OR '1'='1") || query.includes("' OR 1=1")) {
    return res.status(200).json({
      status: "EXPLOIT_SUCCESSFUL_UNPROTECTED",
      warning: "🚨 SQL INJECTION VULNERABILITY TRIGGERED — DATABASE DUMPED",
      query: query,
      leaked_admin_accounts: [
        { id: 1, user: "root_admin", password_hash: "$2b$12$e8xL..dumpedPasswordHash", role: "superuser", secret_2fa: "JBSWY3DPEHPK3PXP" },
        { id: 2, user: "finance_lead", password_hash: "$2b$12$K9m1..financialDbPass", role: "billing_admin", secret_2fa: "MZXW6YTBOI======" }
      ],
      results_count: 2
    });
  }

  // Normal safe search
  const filtered = query
    ? PRODUCTS.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.category.toLowerCase().includes(query.toLowerCase()))
    : PRODUCTS;

  return res.status(200).json({
    status: "success",
    query: query,
    count: filtered.length,
    products: filtered
  });
};
