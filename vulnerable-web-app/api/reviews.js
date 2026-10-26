// Vercel Serverless Function: /api/reviews
// Vulnerable to Cross-Site Scripting (XSS)

let REVIEWS = [
  { id: 1, author: "Alice (CISO, CyberTech)", rating: 5, comment: "High-grade hardware token with rock solid durability." },
  { id: 2, author: "Bob (Lead Architect)", rating: 4, comment: "Easy integration into our enterprise single-sign-on fleet." }
];

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({ status: "success", reviews: REVIEWS });
  }

  const { author, comment, rating } = req.body || {};
  if (!comment) {
    return res.status(400).json({ error: "Comment text is required." });
  }

  const commentStr = String(comment);
  const isXSS = commentStr.toLowerCase().includes("<script") || commentStr.toLowerCase().includes("onerror=") || commentStr.toLowerCase().includes("javascript:");

  const reviewItem = {
    id: REVIEWS.length + 1,
    author: author ? String(author) : "Anonymous User",
    rating: Number(rating) || 5,
    comment: commentStr,
    timestamp: new Date().toISOString()
  };

  REVIEWS.unshift(reviewItem);

  return res.status(200).json({
    status: isXSS ? "STORED_XSS_UNPROTECTED" : "success",
    warning: isXSS ? "🚨 DANGEROUS UNSANITIZED SCRIPT STORED IN DATABASE (XSS ACTIVE)" : null,
    message: isXSS ? "Vulnerability triggered: Payload will execute in visitor browsers without sanitization." : "Review submitted successfully.",
    review: reviewItem
  });
};
