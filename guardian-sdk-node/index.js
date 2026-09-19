const axios = require('axios');

/**
 * AI Cyber Guardian SDK - Express Middleware
 * Protects applications in real time by extracting request metadata and evaluating
 * against the Guardian Control Plane WAF and Deception Engines.
 */
class GuardianSDK {
  constructor(options = {}) {
    this.apiKey = options.apiKey || "guardian-prod-demo-key-2026";
    const controlPlane = (options.controlPlane || "http://localhost:8000").replace(/\/$/, "");
    this.controlPlane = controlPlane;
    this.guardianUrl = options.guardianUrl || `${controlPlane}/api/v1/ingestion/evaluate`;
    this.honeypotBaseUrl = options.honeypotBaseUrl || `${controlPlane}/api/v1/honeypot`;
    this.honeypotUrl = options.honeypotUrl || `${controlPlane}/api/v1/honeypot/trap`;
    this.failOpen = options.failOpen !== undefined ? options.failOpen : true;
    this.timeout = options.timeout || 3000; // 3.0s timeout
  }

  _isBusinessRoute(path) {
    if (!path) return false;
    return path.startsWith('/api/') || path.startsWith('/catalog') || path.startsWith('/reviews');
  }

  /**
   * Express middleware function
   */
  protect() {
    return async (req, res, next) => {
      // Exempt internal health endpoints from latency
      if (req.path === '/api/health' || req.path === '/health') {
        return next();
      }

      // Intercept high-value decoy lures immediately to trap attackers in Honeypot
      if (req.path === '/.env' || req.path === '/.git/config' || req.path.includes('wp-login') || req.path.includes('actuator/env') || req.path === '/admin') {
        return this._divertToHoneypot(req, res);
      }

      // 1. Extract Request Metadata & Inspection Payload
      let bodySnippet = "";
      if (req.body) {
        bodySnippet = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body);
        if (bodySnippet.length > 2048) {
          bodySnippet = bodySnippet.slice(0, 2048);
        }
      }

      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const cleanIp = clientIp.includes('::ffff:') ? clientIp.replace('::ffff:', '') : clientIp;

      const metadata = {
        source_ip: cleanIp,
        method: req.method,
        path: req.path,
        query: req.originalUrl && req.originalUrl.includes('?') ? req.originalUrl.split('?').slice(1).join('?') : '',
        headers: {
          "User-Agent": req.get('User-Agent') || 'Unknown'
        },
        endpoint_type: (req.path.includes('login') || req.path.includes('auth')) ? 'login' : 'generic',
        body: bodySnippet
      };

      try {
        // 2. Query Guardian Control Plane (Ingestion Pipeline)
        const response = await axios.post(this.guardianUrl, metadata, {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        });

        const { action, severity, score, triggered_rules } = response.data;

        // 3. Enforce Decision Protocol
        if (action === 'ALLOW' || action === 'ALERT') {
          // Both ALLOW and ALERT allow clean traffic to reach the actual application
          req.guardianDecision = { action, score, severity };
          return next();
        } 
        else if (action === 'BLOCK' || (action === 'HONEYPOT' && this._isBusinessRoute(req.path))) {
          // Business APIs protect the application with HTTP 403 WAF shield
          return res.status(403).json({
            error: "Access Denied by AI Cyber Guardian",
            status: 403,
            decision: "BLOCK",
            severity: severity || "HIGH",
            score: score || 85,
            reason: triggered_rules && triggered_rules.length > 0 ? triggered_rules[0] : "Security Policy Violation",
            blocked_by: "AI Cyber Guardian WAF Shield"
          });
        } 
        else if (action === 'HONEYPOT') {
          // Deception: Divert request to virtual Linux honeypot sandbox
          return this._divertToHoneypot(req, res);
        }
        else {
          return this._handleFail(next, res);
        }

      } catch (error) {
        // Fail-open architecture: If control plane is temporarily unreachable,
        // log warning and maintain business uptime rather than killing target app
        console.warn(`[Guardian SDK] Warning: Control plane communication error (${error.message}). Failing ${this.failOpen ? 'OPEN' : 'CLOSED'}.`);
        return this._handleFail(next, res);
      }
    };
  }

  _handleFail(next, res) {
    if (this.failOpen) {
      return next();
    } else {
      return res.status(503).json({ error: "Security Service Unavailable" });
    }
  }

  async _divertToHoneypot(req, res) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const cleanIp = clientIp.includes('::ffff:') ? clientIp.replace('::ffff:', '') : clientIp;

      const lurePaths = ['/.env', '/.git/config', '/wp-login.php', '/actuator/env'];
      if (lurePaths.includes(req.path)) {
        const targetHoneypotUrl = `${this.honeypotBaseUrl}${req.path}`;
        const honeypotRes = await axios.get(targetHoneypotUrl, {
          headers: {
            'X-API-Key': this.apiKey,
            'X-Forwarded-For': cleanIp,
            'User-Agent': req.get('User-Agent') || 'Attacker'
          },
          timeout: 3000,
          responseType: 'text'
        });
        const status = honeypotRes.status || 200;
        const contentType = honeypotRes.headers['content-type'] || 'text/plain';
        res.status(status);
        res.setHeader('Content-Type', contentType);
        return res.send(honeypotRes.data);
      }

      let rawBody = req.body;
      if (typeof rawBody === 'object') {
        rawBody = JSON.stringify(rawBody);
      }

      // Forward request to Honeypot trap
      const honeypotRes = await axios.post(this.honeypotUrl, rawBody || "", {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': req.headers['content-type'] || 'text/plain',
          'X-Forwarded-For': cleanIp,
          'User-Agent': req.get('User-Agent') || 'Attacker',
          'X-Target-Path': req.path,
          'X-Session-ID': `hp-${Date.now().toString(36)}`
        },
        timeout: 3000
      });

      // Stream honeypot deception response directly back to the attacker
      const status = honeypotRes.status || 200;
      const contentType = honeypotRes.headers['content-type'] || 'application/json';
      res.status(status);
      res.setHeader('Content-Type', contentType);
      return res.send(honeypotRes.data);
    } catch (e) {
      console.warn(`[Guardian SDK] Honeypot diversion warning: ${e.message}`);
      return res.status(200).json({
        status: "success",
        message: "Operation completed successfully.",
        tx_id: `tx_${Date.now()}`
      });
    }
  }
}

const guardianMiddleware = (options) => new GuardianSDK(options).protect();

module.exports = GuardianSDK;
module.exports.GuardianSDK = GuardianSDK;
module.exports.guardianMiddleware = guardianMiddleware;
