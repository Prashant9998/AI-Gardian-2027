const express = require('express');
const cors = require('cors');
const path = require('path');
let guardianMiddleware;
try {
  guardianMiddleware = require('guardian-sdk-node').guardianMiddleware;
} catch (e) {
  try {
    guardianMiddleware = require('/guardian-sdk-node').guardianMiddleware;
  } catch (e2) {
    guardianMiddleware = require('../guardian-sdk-node').guardianMiddleware;
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 1. Attach AI Cyber Guardian Security SDK (3 Lines of Code!) ─────────────
app.use(guardianMiddleware({
  apiKey: process.env.GUARDIAN_API_KEY || "guardian-prod-demo-key-2026",
  controlPlane: process.env.GUARDIAN_CONTROL_PLANE || "http://localhost:8000",
  failOpen: true
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// ── 2. Realistic E-Commerce Business Endpoints ──────────────────────────────

const PRODUCTS = [
  { id: 101, name: "Quantum Encrypted Router", category: "Networking", price: 349.99, stock: 42 },
  { id: 102, name: "Zero-Trust Security Key (FIDO2)", category: "Auth", price: 59.99, stock: 120 },
  { id: 103, name: "Biometric Hardware Token", category: "Auth", price: 89.50, stock: 15 },
  { id: 104, name: "Titanium Laptop Privacy Screen", category: "Accessories", price: 39.99, stock: 85 },
  { id: 105, name: "Hardware Security Module (HSM)", category: "Enterprise", price: 1299.00, stock: 8 },
  { id: 106, name: "Next-Gen Firewall Appliance", category: "Networking", price: 899.00, stock: 24 }
];

const REVIEWS = [
  { id: 1, product_id: 102, author: "DevOpsSec", rating: 5, comment: "Essential hardware key for our infrastructure team." }
];

// Product Search Endpoint (Simulates SQL Query)
app.get('/api/catalog/search', (req, res) => {
  const query = (req.query.q || "").toLowerCase().trim();
  if (!query) {
    return res.json({ query: "", count: PRODUCTS.length, products: PRODUCTS });
  }

  const results = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
  );

  return res.json({
    status: "success",
    query: req.query.q,
    count: results.length,
    products: results
  });
});

// All Catalog Items
app.get('/api/catalog/all', (req, res) => {
  res.json({ products: PRODUCTS });
});

// Customer Authentication Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === "admin" && password === "AdminSecret2026!") {
    return res.json({
      success: true,
      message: "Authentication successful",
      user: { id: 1, username: "admin", role: "store_manager" },
      token: "jwt_nexus_sec_demo_98432791823"
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials."
  });
});

// Customer Reviews Endpoint (Simulates Stored Data)
app.post('/api/reviews', (req, res) => {
  const { product_id, author, rating, comment } = req.body || {};
  if (!comment) {
    return res.status(400).json({ error: "Review comment is required." });
  }

  const newReview = {
    id: REVIEWS.length + 1,
    product_id: Number(product_id) || 101,
    author: author || "Verified Customer",
    rating: Number(rating) || 5,
    comment: String(comment)
  };

  REVIEWS.push(newReview);

  return res.json({
    success: true,
    message: "Review submitted successfully.",
    review: newReview
  });
});

// Document / File Viewer Endpoint (Simulates File Storage)
app.get('/api/files/view', (req, res) => {
  const doc = req.query.doc || "catalog.pdf";
  const ALLOWED_DOCS = {
    "catalog.pdf": "Nexus CyberStore Full Product Catalog (2026 Edition)\nTotal Listed Products: 450 SKU items.",
    "manual.txt": "Hardware Security Key Quickstart Guide:\n1. Insert into USB port\n2. Tap contact sensor.",
    "warranty.pdf": "Standard 3-Year Enterprise Hardware Warranty Policy."
  };

  if (ALLOWED_DOCS[doc]) {
    return res.type('text/plain').send(ALLOWED_DOCS[doc]);
  }

  return res.status(404).json({ error: `Document '${doc}' not found.` });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    service: "Nexus CyberStore",
    guardian_protection: "ACTIVE",
    version: "1.0.0"
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Nexus CyberStore] Running on http://localhost:${PORT}`);
    console.log(`[Nexus CyberStore] Protected by AI Cyber Guardian SDK`);
  });
}

module.exports = app;
