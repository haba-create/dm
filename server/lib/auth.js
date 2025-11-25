/**
 * Better Auth Configuration for Daamitha Gallery
 *
 * Unified authentication for both admin and client users
 * Supports: Email/Password, Google OAuth, Role-based access control
 */

const { betterAuth } = require('better-auth');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Database path
const dbPath = path.join(__dirname, '../../gallery.db');

// Initialize Better Auth with SQLite
const auth = betterAuth({
  // Database configuration - using better-sqlite3 for Better Auth
  database: new Database(dbPath),

  // Base URL for auth callbacks
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',

  // Base path for auth API endpoints (unified for all users)
  basePath: '/api/auth',

  // Secret for signing tokens
  secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-in-production-' + Date.now(),

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // Send password reset email using Gmail
      try {
        const { sendEmail } = require('../services/email');
        await sendEmail({
          to: user.email,
          subject: 'Reset Your Password - Daamitha Gallery',
          body: `Click the following link to reset your password:\n\n${url}\n\nThis link will expire in 1 hour.`,
          template: 'custom',
          data: { clientName: user.name }
        });
        console.log(`Password reset email sent to ${user.email}`);
      } catch (error) {
        console.error('Failed to send password reset email:', error);
      }
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
    expiresIn: 60 * 60 * 24 * 7, // 7 days for clients
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5 // 5 minutes
    }
  },

  // User configuration with role support
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
      },
      company: {
        type: 'string',
        required: false
      },
      notes: {
        type: 'string',
        required: false
      },
      tags: {
        type: 'string',
        required: false
      },
      lastContactedAt: {
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
      console.log(`New user registered: ${user.email} (role: ${user.role || 'client'})`);
      // Send welcome email for clients
      if (user.role !== 'admin') {
        try {
          const { sendEmail } = require('../services/email');
          await sendEmail({
            to: user.email,
            subject: 'Welcome to Daamitha Gallery!',
            body: `Thank you for joining Daamitha Gallery. I'm excited to share my art with you!\n\nFeel free to browse the collection and reach out if you have any questions.`,
            template: 'custom',
            data: { clientName: user.name }
          });
        } catch (error) {
          console.error('Failed to send welcome email:', error);
        }
      }
    },

    // Called on each sign in
    async onSignIn({ user, session }) {
      console.log(`User signed in: ${user.email} (role: ${user.role || 'client'})`);
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
      return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
  }
});

/**
 * Initialize default admin user in Better Auth system
 * Uses Better Auth's API to ensure proper password hashing
 */
async function initializeAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@daamitha.art';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminName = 'Gallery Admin';

  try {
    const db = new Database(dbPath);

    // Check if admin user exists in Better Auth user table
    const existingUser = db.prepare('SELECT * FROM user WHERE email = ?').get(adminEmail);
    db.close();

    if (!existingUser) {
      // Use Better Auth's signUp API to create admin with proper password hashing
      const result = await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: adminPassword,
          name: adminName
        }
      });

      if (result && result.user) {
        // Update the user's role to admin
        const dbUpdate = new Database(dbPath);
        dbUpdate.prepare('UPDATE user SET role = ? WHERE id = ?').run('admin', result.user.id);
        dbUpdate.close();

        console.log('✅ Admin user created in Better Auth system');
        console.log('   Email:', adminEmail);
        if (process.env.NODE_ENV !== 'production') {
          console.log('   Password:', adminPassword);
        }
      }
    } else {
      console.log('✅ Admin user already exists in Better Auth system');
    }
  } catch (error) {
    // If user already exists error, that's okay
    if (error.message && error.message.includes('already exists')) {
      console.log('✅ Admin user already exists in Better Auth system');
    } else {
      console.error('Error initializing admin user:', error);
    }
  }
}

module.exports = { auth, initializeAdminUser };
