/**
 * Database Schema Initialization
 *
 * Creates all tables needed for:
 * - Better Auth (user, session, account, verification)
 * - Gallery management (artworks, site_content)
 * - Client orders and conversations
 * - Payment tracking
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../gallery.db');

function initializeSchema(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // ============================================
      // BETTER AUTH TABLES
      // ============================================

      // Users table (Better Auth compatible + custom fields)
      db.run(`
        CREATE TABLE IF NOT EXISTS user (
          id TEXT PRIMARY KEY,
          name TEXT,
          email TEXT UNIQUE NOT NULL,
          emailVerified INTEGER DEFAULT 0,
          image TEXT,
          role TEXT DEFAULT 'client',
          phone TEXT,
          address TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Sessions table (Better Auth)
      db.run(`
        CREATE TABLE IF NOT EXISTS session (
          id TEXT PRIMARY KEY,
          expiresAt DATETIME NOT NULL,
          token TEXT UNIQUE NOT NULL,
          ipAddress TEXT,
          userAgent TEXT,
          userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Accounts table (Better Auth - for OAuth providers)
      db.run(`
        CREATE TABLE IF NOT EXISTS account (
          id TEXT PRIMARY KEY,
          accountId TEXT NOT NULL,
          providerId TEXT NOT NULL,
          userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
          accessToken TEXT,
          refreshToken TEXT,
          idToken TEXT,
          accessTokenExpiresAt DATETIME,
          refreshTokenExpiresAt DATETIME,
          scope TEXT,
          password TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Verification tokens table (Better Auth)
      db.run(`
        CREATE TABLE IF NOT EXISTS verification (
          id TEXT PRIMARY KEY,
          identifier TEXT NOT NULL,
          value TEXT NOT NULL,
          expiresAt DATETIME NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ============================================
      // LEGACY ADMIN USERS TABLE (keep for backward compatibility)
      // ============================================

      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'admin',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ============================================
      // GALLERY TABLES
      // ============================================

      // Artworks table
      db.run(`
        CREATE TABLE IF NOT EXISTS artworks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          artist TEXT DEFAULT 'Daamitha',
          technique TEXT,
          dimensions TEXT,
          year INTEGER,
          price REAL,
          image_path TEXT,
          description TEXT,
          category TEXT,
          available INTEGER DEFAULT 1,
          featured INTEGER DEFAULT 0,
          display_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Site content table
      db.run(`
        CREATE TABLE IF NOT EXISTS site_content (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          section TEXT UNIQUE NOT NULL,
          content TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ============================================
      // NEW: CLIENT ORDERS TABLE
      // ============================================

      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          client_id TEXT REFERENCES user(id),
          artwork_id INTEGER REFERENCES artworks(id),
          type TEXT NOT NULL CHECK(type IN ('purchase', 'commission', 'print')),
          status TEXT DEFAULT 'inquiry' CHECK(status IN ('inquiry', 'quoted', 'accepted', 'paid', 'in_progress', 'shipped', 'completed', 'cancelled')),
          amount REAL,
          currency TEXT DEFAULT 'GBP',
          title TEXT,
          description TEXT,
          notes TEXT,
          client_email TEXT,
          client_name TEXT,
          shipping_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ============================================
      // NEW: CONVERSATIONS TABLE (for AI chat history)
      // ============================================

      db.run(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          client_id TEXT REFERENCES user(id),
          client_email TEXT,
          messages TEXT,
          context TEXT,
          summary TEXT,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ============================================
      // NEW: INVOICES TABLE (for payment tracking)
      // ============================================

      db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          order_id TEXT REFERENCES orders(id),
          polar_checkout_id TEXT,
          polar_payment_id TEXT,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'GBP',
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
          payment_method TEXT,
          paid_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ============================================
      // NEW: EMAIL LOG TABLE (for tracking sent emails)
      // ============================================

      db.run(`
        CREATE TABLE IF NOT EXISTS email_log (
          id TEXT PRIMARY KEY,
          order_id TEXT REFERENCES orders(id),
          client_id TEXT REFERENCES user(id),
          recipient TEXT NOT NULL,
          subject TEXT NOT NULL,
          template TEXT,
          status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'failed', 'bounced')),
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ============================================
      // INDEXES FOR PERFORMANCE
      // ============================================

      db.run(`CREATE INDEX IF NOT EXISTS idx_session_token ON session(token)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_email_log_order_id ON email_log(order_id)`);

      console.log('✅ Database schema initialized');
      resolve();
    });
  });
}

// Initialize admin user (legacy system)
async function initializeAdminUser(db) {
  return new Promise((resolve, reject) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@daamitha.art';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    db.get("SELECT * FROM users WHERE email = ?", [adminEmail], async (err, row) => {
      if (err) {
        console.error('Error checking admin user:', err);
        reject(err);
        return;
      }

      if (!row) {
        try {
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          db.run(
            "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
            [adminEmail, hashedPassword, 'admin'],
            (err) => {
              if (err) {
                console.error('Error creating admin user:', err);
                reject(err);
              } else {
                console.log('✅ Default admin user created');
                console.log('   Email:', adminEmail);
                if (process.env.NODE_ENV !== 'production') {
                  console.log('   Password:', adminPassword);
                }
                resolve();
              }
            }
          );
        } catch (hashError) {
          console.error('Error hashing password:', hashError);
          reject(hashError);
        }
      } else {
        console.log('✅ Admin user already exists');
        resolve();
      }
    });
  });
}

// Initialize default site content
function initializeSiteContent(db) {
  const defaultContent = [
    {
      section: 'hero',
      content: JSON.stringify({
        title: 'Daamitha',
        subtitle: 'Contemporary Oil Paintings with Soul',
        journey: 'Contemporary Oil Painter • London'
      })
    },
    {
      section: 'about',
      content: JSON.stringify({
        title: "The Artist's Journey",
        paragraphs: [
          "Born amidst the vibrant colors and rich traditions of India, Daamitha's artistic soul was nurtured by the cultural heartbeat of South Indian traditions. Currently pursuing her medical studies in London while maintaining her artistic practice, she has created a beautiful fusion of Eastern heritage and contemporary expression.",
          "Daamitha bridges the analytical precision of her medical studies with the emotional depth of oil painting. Her canvas becomes a meeting place where traditional Indian philosophy meets Western technique, creating works that speak to the universal human experience while celebrating her cultural roots."
        ]
      })
    },
    {
      section: 'process',
      content: JSON.stringify({
        title: 'The Oil Painting Process',
        steps: [
          { title: 'Cultural Inspiration', description: 'Each painting begins with a memory, a song, or a moment of cultural reflection. I sketch while listening to traditional Indian music.' },
          { title: 'Canvas Meditation', description: 'Premium Belgian linen is prepared with multiple layers of rabbit skin glue and oil-based primer, creating a luminous foundation.' },
          { title: 'Color Alchemy', description: 'Hand-mixed oil pigments create custom colors inspired by Indian spices, desert sunsets, and English gardens.' },
          { title: 'Layered Storytelling', description: 'Each layer is applied using traditional glazing techniques, building depth and luminosity over weeks of careful work.' },
          { title: 'Soul Integration', description: 'The final details are painted while singing traditional songs, infusing each piece with cultural memory and personal journey.' }
        ]
      })
    }
  ];

  defaultContent.forEach(item => {
    db.run(
      "INSERT OR IGNORE INTO site_content (section, content) VALUES (?, ?)",
      [item.section, item.content]
    );
  });
}

module.exports = {
  initializeSchema,
  initializeAdminUser,
  initializeSiteContent
};
