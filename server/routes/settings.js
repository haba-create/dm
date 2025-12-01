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

// ============================================
// USER MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /api/settings/users
 * List all users with pagination
 */
router.get('/users', requireAdmin, async (req, res) => {
  const db = require('../models/database').getDb();
  const { page = 1, limit = 20, search = '', role = '' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    // Get total count
    const countResult = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM user WHERE ${whereClause}`, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Get users with pagination
    const users = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, email, role, phone, company, image, createdAt, updatedAt, lastContactedAt
         FROM user WHERE ${whereClause}
         ORDER BY createdAt DESC
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    res.json({
      users,
      pagination: {
        total: countResult.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult.count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/settings/users/:id
 * Get single user details
 */
router.get('/users/:id', requireAdmin, async (req, res) => {
  const db = require('../models/database').getDb();
  const { id } = req.params;

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, name, email, role, phone, address, company, notes, tags, image, createdAt, updatedAt, lastContactedAt
         FROM user WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * PUT /api/settings/users/:id
 * Update user details (role, notes, etc.)
 */
router.put('/users/:id', requireAdmin, async (req, res) => {
  const db = require('../models/database').getDb();
  const { id } = req.params;
  const { name, role, phone, address, company, notes, tags } = req.body;

  // Prevent demoting yourself
  if (id === req.user.id && role && role !== 'admin') {
    return res.status(400).json({ error: 'Cannot change your own admin role' });
  }

  try {
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (address !== undefined) { updates.push('address = ?'); params.push(address); }
    if (company !== undefined) { updates.push('company = ?'); params.push(company); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(id);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE user SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    res.json({ success: true, message: 'User updated successfully' });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/settings/users/:id
 * Delete a user
 */
router.delete('/users/:id', requireAdmin, async (req, res) => {
  const db = require('../models/database').getDb();
  const { id } = req.params;

  // Prevent self-deletion
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, email, role FROM user WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (sessions will cascade)
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM user WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    res.json({ success: true, message: `User ${user.email} deleted` });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * GET /api/settings/users/stats
 * Get user statistics
 */
router.get('/users-stats', requireAdmin, async (req, res) => {
  const db = require('../models/database').getDb();

  try {
    const stats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
          SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) as clients,
          SUM(CASE WHEN createdAt >= date('now', '-7 days') THEN 1 ELSE 0 END) as newThisWeek
        FROM user
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(stats);

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// ============================================
// GMAIL ENDPOINTS
// ============================================

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
