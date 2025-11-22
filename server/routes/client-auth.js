/**
 * Client Authentication Routes
 *
 * Uses Better Auth for client (customer) authentication
 * Separate from admin authentication (which uses JWT)
 */

const express = require('express');
const { auth } = require('../lib/auth');
const { toNodeHandler } = require('better-auth/node');

const router = express.Router();

// Better Auth handler - handles all auth routes automatically
// The handler processes the full request and handles all Better Auth endpoints:
//   POST /sign-up/email - Email registration
//   POST /sign-in/email - Email login
//   POST /sign-out - Logout
//   GET /session - Get current session
//   etc.

// Create the handler
const authHandler = toNodeHandler(auth);

// Handle all requests to this router with Better Auth
// Using a middleware approach
router.use('/', (req, res, next) => {
  // Better Auth handler expects the raw request/response
  authHandler(req, res).catch(next);
});

module.exports = router;
