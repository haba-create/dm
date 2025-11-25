/**
 * Authentication Middleware
 *
 * Unified middleware supporting Better Auth sessions for all users.
 * Provides role-based access control for admin and client routes.
 */

const { auth } = require('../lib/auth');
const { fromNodeHeaders, toNodeHandler } = require('better-auth/node');

/**
 * Session-based authentication middleware (Better Auth)
 * Validates session from cookies and attaches user to request
 */
const sessionAuthMiddleware = async (req, res, next) => {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Access denied. Please sign in.' });
    }

    // Attach user and session to request
    req.user = session.user;
    req.session = session.session;
    next();
  } catch (error) {
    console.error('Session auth error:', error);
    return res.status(401).json({ error: 'Invalid session.' });
  }
};

/**
 * Admin-only middleware
 * Requires valid session AND admin role
 */
const adminAuthMiddleware = async (req, res, next) => {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Access denied. Please sign in.' });
    }

    // Check for admin role
    if (session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Attach user and session to request
    req.user = session.user;
    req.session = session.session;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ error: 'Invalid session.' });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if authenticated, continues if not
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });

    if (session && session.user) {
      req.user = session.user;
      req.session = session.session;
    }
    next();
  } catch (error) {
    // Continue without user attached
    next();
  }
};

/**
 * Role check middleware factory
 * Creates middleware that checks for specific roles
 */
const requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers)
      });

      if (!session || !session.user) {
        return res.status(401).json({ error: 'Access denied. Please sign in.' });
      }

      const userRole = session.user.role || 'client';
      if (!roles.includes(userRole)) {
        return res.status(403).json({
          error: `Access denied. Required roles: ${roles.join(' or ')}.`
        });
      }

      req.user = session.user;
      req.session = session.session;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(401).json({ error: 'Invalid session.' });
    }
  };
};

// Export all middleware options
module.exports = {
  // Primary middleware for authenticated routes
  authMiddleware: sessionAuthMiddleware,

  // Admin-only routes
  adminAuthMiddleware,

  // Optional auth (for routes that work with or without auth)
  optionalAuthMiddleware,

  // Role-based middleware factory
  requireRole,

  // Aliases for backward compatibility
  sessionAuthMiddleware,

  // Legacy export for existing imports
  default: sessionAuthMiddleware
};

// Also export as default for compatibility with existing code
module.exports.default = sessionAuthMiddleware;
