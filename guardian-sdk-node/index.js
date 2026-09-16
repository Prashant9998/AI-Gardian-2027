const axios = require('axios');

/**
 * AI Cyber Guardian SDK - Express Middleware
 * Protects routes by extracting metadata and querying the Guardian Control Plane.
 */
class GuardianSDK {
  constructor(options) {
    this.apiKey = options.apiKey;
    this.guardianUrl = options.guardianUrl || 'http://localhost:8000/api/v1/ingestion/evaluate';
    this.honeypotUrl = options.honeypotUrl || 'http://localhost:8000/api/v1/decisions/honeypot';
    this.failOpen = options.failOpen !== undefined ? options.failOpen : true;
  }

  /**
   * Express middleware function
   */
  protect() {
    return async (req, res, next) => {
      // 1. Extract METADATA ONLY (No raw bodies transmitted here for privacy)
      const metadata = {
        source_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        method: req.method,
        path: req.path,
        query: req.originalUrl.split('?')[1] || '',
        user_agent: req.get('User-Agent') || '',
        endpoint_type: req.path.includes('login') ? 'login' : 'generic',
        // Note: we do NOT send req.body to preserve data privacy. 
        // We only send the stringified keys to analyze structure if needed,
        // but for strict adherence to "metadata only", we omit the body entirely.
        body: "" 
      };

      try {
        // 2. Query Guardian Control Plane
        const response = await axios.post(this.guardianUrl, metadata, {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 500 // Sub-second timeout to prevent stalling the app
        });

        const { action } = response.data;

        // 3. Enforce Decision
        if (action === 'ALLOW' || action === 'ALERT') {
          // Both ALLOW and ALERT allow the request to proceed to the real application
          return next();
        } 
        else if (action === 'BLOCK') {
          return res.status(403).json({ error: "Access Denied by AI Cyber Guardian" });
        } 
        else if (action === 'HONEYPOT') {
          // Deception: Forward the full raw request to the backend honeypot asynchronously
          // and return a fake 200 OK to the attacker immediately.
          this._forwardToHoneypot(req);
          return res.status(200).json({ status: "success", message: "Operation completed successfully." });
        }
        else {
          // Fallback if action is unknown
          return this._handleFail(next, res);
        }

      } catch (error) {
        // Control plane is down or timed out
        console.error(`[Guardian SDK] Error contacting control plane: ${error.message}`);
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

  async _forwardToHoneypot(req) {
    try {
      // Stream or send the raw body to the honeypot for threat intelligence capture
      // Since this is async and not awaited, it doesn't block the fake 200 OK.
      let rawBody = req.body;
      if (typeof rawBody === 'object') {
        rawBody = JSON.stringify(rawBody);
      }
      
      await axios.post(this.honeypotUrl, rawBody || "", {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': req.headers['content-type'] || 'text/plain'
        },
        timeout: 2000
      });
    } catch (e) {
      // Silent fail, it's just a honeypot log
    }
  }
}

module.exports = GuardianSDK;
