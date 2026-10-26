/**
 * NovaTech Enterprise — Vulnerable Web App Server
 * Runs locally on http://localhost:3002 or seamlessly deploys to Vercel
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// Serverless API Handlers Bridge for Local Development
const searchHandler = require('./api/search');
const loginHandler = require('./api/login');
const reviewsHandler = require('./api/reviews');
const filesHandler = require('./api/files');
const guardianProxyHandler = require('./api/guardian-proxy');

// Map serverless functions to Express routes
app.all('/api/search', (req, res) => searchHandler(req, res));
app.all('/api/login', (req, res) => loginHandler(req, res));
app.all('/api/reviews', (req, res) => reviewsHandler(req, res));
app.all('/api/files', (req, res) => filesHandler(req, res));
app.all('/api/guardian-proxy', (req, res) => guardianProxyHandler(req, res));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    app: 'NovaTech Vulnerable Lab Target',
    port: PORT,
    guardian_bridge: 'ACTIVE',
    mode: 'STANDALONE_OR_VERCEL'
  });
});

// Fallback to index.html for single-page app behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('================================================================');
    console.log(' 🛡️  NovaTech Enterprise Vulnerable Lab Target App');
    console.log(` 🚀 Server running at: http://localhost:${PORT}`);
    console.log(' 🌐 AI Cyber Guardian Gateway Target: http://localhost:8000');
    console.log(' 🧪 1-Click Viva Exploit Test Lab Ready');
    console.log('================================================================');
  });
}

module.exports = app;
