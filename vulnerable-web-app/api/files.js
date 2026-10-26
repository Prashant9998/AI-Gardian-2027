// Vercel Serverless Function: /api/files
// Vulnerable to Path Traversal / LFI (e.g. ../../../../etc/passwd)

const DOCUMENTS = {
  "catalog.pdf": "NovaTech Enterprise Solutions - 2026 Product Catalog & Specifications.\nAuthorized distribution for verified B2B procurement officers.",
  "quickstart.txt": "NovaTech Hardware Dongle Setup:\n1. Insert into USB Type-C port\n2. Authorize enrollment via hardware touch sensor.",
  "compliance_audit.pdf": "ISO 27001 & SOC 2 Type II Compliance Assessment Report (Audited Q3 2026)."
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const doc = req.query.doc || "catalog.pdf";

  // If path traversal attempt on unprotected system
  if (doc.includes("../") || doc.includes("..\\") || doc.includes("%2e%2e") || doc.includes("/etc/passwd") || doc.includes("/etc/shadow")) {
    return res.status(200).json({
      status: "LFI_TRAVERSAL_UNPROTECTED",
      warning: "🚨 PATH TRAVERSAL VULNERABILITY EXPLOITED — SENSITIVE HOST FILES LEAKED",
      requested_path: doc,
      leaked_file_contents: `root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/bin/sh\nbin:x:2:2:bin:/bin:/bin/sh\nsys:x:3:3:sys:/dev:/bin/sh\nsync:x:4:65534:sync:/bin:/bin/sync\nnovatech_app:x:1001:1001:NovaTech Server App User:/home/novatech:/bin/bash\n# CRITICAL LEAK: Host operating system /etc/passwd successfully read via unvalidated path concatenation!`
    });
  }

  if (DOCUMENTS[doc]) {
    return res.status(200).json({
      status: "success",
      document: doc,
      content: DOCUMENTS[doc]
    });
  }

  return res.status(404).json({
    status: "not_found",
    error: `Requested file '${doc}' does not exist in document registry.`
  });
};
