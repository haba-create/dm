/**
 * Better Auth Configuration for Daamitha Gallery
 *
 * This provides client authentication (separate from admin JWT auth)
 * Supports: Email/Password, Google OAuth, Polar payments integration
 */

const { betterAuth } = require('better-auth');
const Database = require('better-sqlite3');
const path = require('path');

// Initialize Better Auth with SQLite
const auth = betterAuth({
  // Database configuration - using better-sqlite3 for Better Auth
  database: new Database(path.join(__dirname, '../../gallery.db')),

  // Base URL for auth callbacks
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',

  // Base path for auth API endpoints
  basePath: '/api/client-auth',

  // Secret for signing tokens
  secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-in-production-' + Date.now(),

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Enable later when email service is set up
    sendResetPassword: async ({ user, url }) => {
      // Will implement with Gmail API later
      console.log(`Password reset requested for ${user.email}: ${url}`);
    }
  },

  // Social providers (Google OAuth)
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      enabled: !!process.env.GOOGLE_CLIENT_ID
    }
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5 // 5 minutes
    }
  },

  // User configuration
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'client',
        required: false
      },
      phone: {
        type: 'string',
        required: false
      },
      address: {
        type: 'string',
        required: false
      }
    }
  },

  // Account configuration for linked social accounts
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google']
    }
  },

  // Callbacks for custom logic
  callbacks: {
    // Called when a new user signs up
    async onUserCreated({ user }) {
      console.log(`New client registered: ${user.email}`);
      // Could send welcome email here
    },

    // Called on each sign in
    async onSignIn({ user, session }) {
      console.log(`Client signed in: ${user.email}`);
    }
  },

  // Rate limiting
  rateLimit: {
    window: 60, // 1 minute
    max: 10 // 10 requests per minute for auth endpoints
  },

  // Advanced options
  advanced: {
    generateId: () => {
      // Generate UUID for user IDs
      return 'client_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
  }
});

module.exports = { auth };
