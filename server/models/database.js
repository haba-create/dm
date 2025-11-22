/**
 * Database Connection and Initialization
 *
 * Handles SQLite connection and schema initialization
 * for both legacy admin system and new Better Auth client system
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { initializeSchema, initializeAdminUser, initializeSiteContent } = require('./schema');

// Create database connection
const dbPath = path.join(__dirname, '../../gallery.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Initialize all schema tables
    await initializeSchema(db);

    // Initialize admin user for legacy system
    await initializeAdminUser(db);

    // Initialize default site content
    initializeSiteContent(db);

    // Add thumbnail_path column if it doesn't exist (migration for existing DBs)
    db.run(`ALTER TABLE artworks ADD COLUMN thumbnail_path TEXT`, (err) => {
      // Ignore error if column already exists
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Migration error:', err.message);
      }
    });

    // Insert initial artworks if table is empty
    initializeArtworks(db);

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

// Initialize artworks
function initializeArtworks(db) {
  const initialArtworks = [
    {
      title: 'Spirit Twin',
      technique: 'Oil on linen canvas',
      dimensions: '30" × 24"',
      year: 2024,
      price: 1800,
      image_path: '/images/abstract.wolf&woman.jpg',
      description: 'Inspired by a painting done by Dimitra Milan',
      category: 'Contemporary',
      featured: 1
    },
    {
      title: 'Deep within thought',
      technique: 'Oil on canvas',
      dimensions: '36" × 28"',
      year: 2024,
      price: 2400,
      image_path: '/images/cat-oils.jpg',
      description: 'An original artwork, capturing a cat staring off into the distance deep within thought',
      category: 'Animals',
      featured: 1
    },
    {
      title: 'Treetop Reverie',
      technique: 'Oil on canvas',
      dimensions: '24" × 20"',
      year: 2023,
      price: 1400,
      image_path: '/images/monkey-oils.jpg',
      description: 'An original piece, depicting the playful nature of 3 chimps within their habitat. A photo was used as a reference to help create this piece',
      category: 'Animals',
      featured: 1
    },
    {
      title: 'Feathered Jewel',
      technique: 'Oil on linen canvas',
      dimensions: '32" × 26"',
      year: 2024,
      price: 2000,
      image_path: '/images/peacock-feather.jpg',
      description: 'Capturing the elegance and intricacy of a peacock feather',
      category: 'Nature',
      featured: 1
    },
    {
      title: "Mother's Love",
      technique: 'Oil on canvas',
      dimensions: '22" × 18"',
      year: 2024,
      price: 1600,
      image_path: '/images/penguins.jpg',
      description: 'Capturing the raw emotion between a mother and a child',
      category: 'Animals',
      featured: 1
    },
    {
      title: "Predator's gaze",
      technique: 'Oil on canvas',
      dimensions: '28" × 22"',
      year: 2024,
      price: 1700,
      image_path: '/images/tiger.jpg',
      description: 'An original artwork using a photo taken by David Whelan as a reference',
      category: 'Animals',
      featured: 1
    }
  ];

  // Check if artworks table is empty before inserting
  db.get("SELECT COUNT(*) as count FROM artworks", (err, row) => {
    if (row && row.count === 0) {
      initialArtworks.forEach(artwork => {
        db.run(
          `INSERT INTO artworks (title, artist, technique, dimensions, year, price, image_path, description, category, featured)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [artwork.title, 'Daamitha', artwork.technique, artwork.dimensions, artwork.year, artwork.price, artwork.image_path, artwork.description, artwork.category, artwork.featured]
        );
      });
      console.log('✅ Initial artworks added to database (6 featured on homepage)');
    }
  });
}

// Helper functions for new tables

/**
 * Create a new order
 */
function createOrder(orderData) {
  return new Promise((resolve, reject) => {
    const id = 'order_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    const {
      client_id, artwork_id, type, amount, currency = 'GBP',
      title, description, notes, client_email, client_name, shipping_address
    } = orderData;

    db.run(
      `INSERT INTO orders (id, client_id, artwork_id, type, amount, currency, title, description, notes, client_email, client_name, shipping_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, client_id, artwork_id, type, amount, currency, title, description, notes, client_email, client_name, shipping_address],
      function(err) {
        if (err) reject(err);
        else resolve({ id, ...orderData });
      }
    );
  });
}

/**
 * Get order by ID
 */
function getOrder(orderId) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM orders WHERE id = ?", [orderId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Update order status
 */
function updateOrderStatus(orderId, status, notes = null) {
  return new Promise((resolve, reject) => {
    const query = notes
      ? "UPDATE orders SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      : "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    const params = notes ? [status, notes, orderId] : [status, orderId];

    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ orderId, status, updated: this.changes > 0 });
    });
  });
}

/**
 * Get orders by client
 */
function getOrdersByClient(clientId) {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM orders WHERE client_id = ? ORDER BY created_at DESC", [clientId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Save conversation
 */
function saveConversation(conversationData) {
  return new Promise((resolve, reject) => {
    const { id, client_id, client_email, messages, context, summary } = conversationData;

    db.run(
      `INSERT OR REPLACE INTO conversations (id, client_id, client_email, messages, context, summary, last_message_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, client_id, client_email, JSON.stringify(messages), context, summary],
      function(err) {
        if (err) reject(err);
        else resolve({ id, saved: true });
      }
    );
  });
}

/**
 * Get conversation by ID
 */
function getConversation(conversationId) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM conversations WHERE id = ?", [conversationId], (err, row) => {
      if (err) reject(err);
      else if (row) {
        row.messages = JSON.parse(row.messages || '[]');
        resolve(row);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Create invoice
 */
function createInvoice(invoiceData) {
  return new Promise((resolve, reject) => {
    const id = 'inv_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    const { order_id, polar_checkout_id, amount, currency = 'GBP' } = invoiceData;

    db.run(
      `INSERT INTO invoices (id, order_id, polar_checkout_id, amount, currency)
       VALUES (?, ?, ?, ?, ?)`,
      [id, order_id, polar_checkout_id, amount, currency],
      function(err) {
        if (err) reject(err);
        else resolve({ id, ...invoiceData });
      }
    );
  });
}

/**
 * Update invoice status (for webhook handling)
 */
function updateInvoiceStatus(polarCheckoutId, status, polarPaymentId = null) {
  return new Promise((resolve, reject) => {
    const paidAt = status === 'paid' ? 'CURRENT_TIMESTAMP' : null;
    db.run(
      `UPDATE invoices SET status = ?, polar_payment_id = ?, paid_at = ${paidAt ? 'CURRENT_TIMESTAMP' : 'NULL'}, updated_at = CURRENT_TIMESTAMP
       WHERE polar_checkout_id = ?`,
      [status, polarPaymentId, polarCheckoutId],
      function(err) {
        if (err) reject(err);
        else resolve({ polarCheckoutId, status, updated: this.changes > 0 });
      }
    );
  });
}

/**
 * Log email sent
 */
function logEmail(emailData) {
  return new Promise((resolve, reject) => {
    const id = 'email_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    const { order_id, client_id, recipient, subject, template, status = 'sent' } = emailData;

    db.run(
      `INSERT INTO email_log (id, order_id, client_id, recipient, subject, template, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, order_id, client_id, recipient, subject, template, status],
      function(err) {
        if (err) reject(err);
        else resolve({ id, logged: true });
      }
    );
  });
}

/**
 * Get client by email (from Better Auth user table)
 */
function getClientByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM user WHERE email = ?", [email], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Initialize database on module load
initializeDatabase();

// Export database connection and helper functions
module.exports = db;
module.exports.createOrder = createOrder;
module.exports.getOrder = getOrder;
module.exports.updateOrderStatus = updateOrderStatus;
module.exports.getOrdersByClient = getOrdersByClient;
module.exports.saveConversation = saveConversation;
module.exports.getConversation = getConversation;
module.exports.createInvoice = createInvoice;
module.exports.updateInvoiceStatus = updateInvoiceStatus;
module.exports.logEmail = logEmail;
module.exports.getClientByEmail = getClientByEmail;
