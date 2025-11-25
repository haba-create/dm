/**
 * Unified Authentication Routes
 *
 * Uses Better Auth for all users (both admin and client)
 * Endpoints:
 *   POST /api/auth/sign-up/email - Email registration
 *   POST /api/auth/sign-in/email - Email login
 *   POST /api/auth/sign-out - Logout
 *   GET /api/auth/session - Get current session
 *   POST /api/auth/forgot-password - Request password reset
 *   POST /api/auth/reset-password - Reset password with token
 */

const express = require('express');
const { auth, initializeAdminUser } = require('../lib/auth');
const { toNodeHandler, fromNodeHeaders } = require('better-auth/node');

const router = express.Router();

// Note: Admin user initialization is now handled by app.js after schema init

// Create the Better Auth handler
const authHandler = toNodeHandler(auth);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    authSystem: 'Better Auth',
    timestamp: new Date().toISOString()
  });
});

// Custom session check endpoint with role info
router.get('/me', async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });

    if (!session || !session.user) {
      return res.status(401).json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role || 'client',
        image: session.user.image,
        phone: session.user.phone,
        address: session.user.address
      },
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({ error: 'Failed to check session' });
  }
});

// Verify endpoint for backward compatibility with admin dashboard
router.get('/verify', async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });

    if (!session || !session.user) {
      return res.status(401).json({ valid: false, error: 'No session' });
    }

    res.json({
      valid: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role || 'client'
      }
    });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid session' });
  }
});

// Handle all other requests with Better Auth handler
// This catches all Better Auth endpoints like:
// - POST /sign-up/email
// - POST /sign-in/email
// - POST /sign-out
// - GET /session
// - POST /forgot-password
// - POST /reset-password
// - OAuth callback routes
// Note: Express 5 requires named parameters for wildcards
router.all('/{*path}', (req, res, next) => {
  authHandler(req, res).catch(next);
});

module.exports = router;
