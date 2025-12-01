/**
 * Settings Routes
 *
 * Admin settings management including Gmail OAuth token generation.
 * Requires admin authentication.
 */

const express = require('express');
const { auth } = require('../lib/auth');
const { fromNodeHeaders } = require('better-auth/node');

const router = express.Router();

// Gmail OAuth configuration
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email'
];

/**
 * Middleware to verify admin authentication
 */
async function requireAdmin(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });

    if (!session || !session.user || session.user.role !== 'admin') {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    req.user = session.user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * GET /api/settings/gmail/status
 * Check Gmail configuration status
 */
router.get('/gmail/status', requireAdmin, async (req, res) => {
  const status = {
    clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
    clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
    refreshTokenSet: !!process.env.GOOGLE_REFRESH_TOKEN,
    senderEmail: process.env.GMAIL_SENDER_EMAIL || 'daamitha@daamitha.gallery',
    isConfigured: !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
    )
  };

  res.json(status);
});

/**
 * GET /api/settings/gmail/auth-url
 * Generate Gmail OAuth authorization URL
 */
router.get('/gmail/auth-url', requireAdmin, async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return res.status(400).json({
      error: 'GOOGLE_CLIENT_ID not configured',
      message: 'Please set GOOGLE_CLIENT_ID in your environment variables first'
    });
  }

  // Use the current host for the callback URL
  const baseUrl = process.env.BETTER_AUTH_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${baseUrl}/api/settings/gmail/callback`;

  // Build OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  res.json({
    authUrl,
    redirectUri,
    instructions: [
      '1. Click "Authorize Gmail" to open Google\'s consent screen',
      '2. Sign in with daamitha@daamitha.gallery',
      '3. Click "Allow" to grant Gmail permissions',
      '4. Copy the refresh token that appears',
      '5. Add it to your Railway environment as GOOGLE_REFRESH_TOKEN'
    ]
  });
});

/**
 * GET /api/settings/gmail/callback
 * Handle OAuth callback and exchange code for tokens
 */
router.get('/gmail/callback', async (req, res) => {
  const { code, error: oauthError } = req.query;

  if (oauthError) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail Authorization Error</title>
        <style>
          body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #fee2e2; border: 1px solid #fca5a5; padding: 20px; border-radius: 8px; color: #dc2626; }
          h1 { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Authorization Error</h1>
          <p>${oauthError}</p>
          <p><a href="/admin/settings.html">Return to Settings</a></p>
        </div>
      </body>
      </html>
    `);
  }

  if (!code) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail Authorization Error</title>
        <style>
          body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #fee2e2; border: 1px solid #fca5a5; padding: 20px; border-radius: 8px; color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Missing Authorization Code</h1>
          <p>No authorization code was received from Google.</p>
          <p><a href="/admin/settings.html">Return to Settings</a></p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    }

    const baseUrl = process.env.BETTER_AUTH_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${baseUrl}/api/settings/gmail/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      throw new Error('No refresh token received. Make sure to click "Allow" on all permissions.');
    }

    // Success! Display the token
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail Authorization Successful</title>
        <style>
          body {
            font-family: -apple-system, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #fdf8f5;
          }
          .success {
            background: #d1fae5;
            border: 1px solid #6ee7b7;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          h1 { color: #047857; margin-bottom: 10px; }
          .token-box {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            word-break: break-all;
            font-family: monospace;
            margin: 15px 0;
            border: 2px solid #d1d5db;
          }
          .copy-btn {
            background: linear-gradient(45deg, #d4af37, #ffb000);
            color: #1f2937;
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 600;
            margin-top: 10px;
          }
          .copy-btn:hover { transform: translateY(-2px); }
          .instructions {
            background: #e0f2fe;
            border-left: 4px solid #3b82f6;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          .instructions h3 { color: #1e40af; margin-top: 0; }
          .env-example {
            background: #1f2937;
            color: #10b981;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            margin: 10px 0;
            overflow-x: auto;
          }
          .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #800020;
            text-decoration: none;
          }
          .back-link:hover { color: #ff6b35; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>Gmail Authorization Successful!</h1>
          <p>Your Gmail refresh token has been generated. Copy it and add it to your Railway environment variables.</p>
        </div>

        <h2>Your Refresh Token:</h2>
        <div class="token-box" id="token">${refreshToken}</div>
        <button class="copy-btn" onclick="copyToken()">Copy Token</button>

        <div class="instructions">
          <h3>Next Steps:</h3>
          <ol>
            <li>Go to your <strong>Railway Dashboard</strong></li>
            <li>Select your project and go to <strong>Variables</strong></li>
            <li>Add a new variable with the following:</li>
          </ol>
          <div class="env-example">GOOGLE_REFRESH_TOKEN=${refreshToken}</div>
          <ol start="4">
            <li>Click <strong>Deploy</strong> to apply the changes</li>
            <li>Your Gmail integration will be active!</li>
          </ol>
        </div>

        <a href="/admin/settings.html" class="back-link">&larr; Return to Settings</a>

        <script>
          function copyToken() {
            const token = document.getElementById('token').textContent;
            navigator.clipboard.writeText(token).then(() => {
              const btn = document.querySelector('.copy-btn');
              btn.textContent = 'Copied!';
              setTimeout(() => btn.textContent = 'Copy Token', 2000);
            });
          }
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail Authorization Error</title>
        <style>
          body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #fee2e2; border: 1px solid #fca5a5; padding: 20px; border-radius: 8px; }
          h1 { color: #dc2626; }
          code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Token Exchange Failed</h1>
          <p>${error.message}</p>
          <p>Please try again. If the problem persists, check your Google Cloud Console settings.</p>
          <p><a href="/admin/settings.html">Return to Settings</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * POST /api/settings/gmail/test
 * Send a test email to verify configuration
 */
router.post('/gmail/test', requireAdmin, async (req, res) => {
  try {
    const { sendEmail, isConfigured } = require('../services/email');

    if (!isConfigured()) {
      return res.status(400).json({
        error: 'Gmail not configured',
        message: 'Please set up GOOGLE_REFRESH_TOKEN first'
      });
    }

    // Send test email to admin
    const result = await sendEmail({
      to: req.user.email,
      subject: 'Test Email',
      body: 'This is a test email from your Daamitha Gallery admin panel. If you received this, your Gmail integration is working correctly!',
      template: 'custom',
      data: { clientName: req.user.name }
    });

    res.json({
      success: true,
      message: `Test email sent to ${req.user.email}`,
      result
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      message: error.message
    });
  }
});

module.exports = router;
