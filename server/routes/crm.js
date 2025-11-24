/**
 * CRM Routes
 *
 * Provides API endpoints for Customer Relationship Management:
 * - Contact management (clients/leads)
 * - Order tracking
 * - Email notifications
 * - Activity timeline
 * - Dashboard statistics
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const { adminAuthMiddleware, authMiddleware } = require('../middleware/auth');
const { sendEmail, isConfigured } = require('../services/email');

// Database connection
const dbPath = path.join(__dirname, '../../gallery.db');
const getDb = () => new Database(dbPath);

// ============================================
// CONTACTS / CLIENTS
// ============================================

/**
 * Get all contacts (admin only)
 */
router.get('/contacts', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { search, tag, sort = 'createdAt', order = 'desc', limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        u.*,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) as total_spent,
        MAX(o.created_at) as last_order_date
      FROM user u
      LEFT JOIN orders o ON u.email = o.client_email
      WHERE u.role = 'client'
    `;

    const params = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.company LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (tag) {
      query += ` AND u.tags LIKE ?`;
      params.push(`%${tag}%`);
    }

    query += ` GROUP BY u.id`;

    // Validate sort column
    const allowedSorts = ['createdAt', 'name', 'email', 'total_orders', 'total_spent', 'lastContactedAt'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'createdAt';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const contacts = db.prepare(query).all(...params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM user WHERE role = 'client'`;
    if (search) {
      countQuery += ` AND (name LIKE ? OR email LIKE ? OR company LIKE ?)`;
    }
    const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
    const total = db.prepare(countQuery).get(...countParams).total;

    db.close();

    res.json({
      contacts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + contacts.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * Get single contact details (admin only)
 */
router.get('/contacts/:id', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const contact = db.prepare('SELECT * FROM user WHERE id = ?').get(id);

    if (!contact) {
      db.close();
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get order history
    const orders = db.prepare(`
      SELECT * FROM orders
      WHERE client_email = ? OR client_id = ?
      ORDER BY created_at DESC
    `).all(contact.email, id);

    // Get conversation history
    const conversations = db.prepare(`
      SELECT * FROM conversations
      WHERE client_email = ? OR client_id = ?
      ORDER BY last_message_at DESC
    `).all(contact.email, id);

    // Get email history
    const emails = db.prepare(`
      SELECT * FROM email_log
      WHERE recipient = ? OR client_id = ?
      ORDER BY sent_at DESC LIMIT 20
    `).all(contact.email, id);

    db.close();

    res.json({
      contact,
      orders,
      conversations,
      emails
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact details' });
  }
});

/**
 * Update contact details (admin only)
 */
router.put('/contacts/:id', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, phone, address, company, notes, tags } = req.body;

    const result = db.prepare(`
      UPDATE user
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          company = COALESCE(?, company),
          notes = COALESCE(?, notes),
          tags = COALESCE(?, tags),
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(name, phone, address, company, notes, tags, id);

    if (result.changes === 0) {
      db.close();
      return res.status(404).json({ error: 'Contact not found' });
    }

    const updated = db.prepare('SELECT * FROM user WHERE id = ?').get(id);
    db.close();

    res.json({ success: true, contact: updated });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

/**
 * Add a note to contact (admin only)
 */
router.post('/contacts/:id/notes', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { note } = req.body;

    const contact = db.prepare('SELECT notes FROM user WHERE id = ?').get(id);

    if (!contact) {
      db.close();
      return res.status(404).json({ error: 'Contact not found' });
    }

    const timestamp = new Date().toISOString();
    const existingNotes = contact.notes ? JSON.parse(contact.notes) : [];
    existingNotes.push({ text: note, timestamp, addedBy: req.user.email });

    db.prepare(`
      UPDATE user SET notes = ?, updatedAt = datetime('now') WHERE id = ?
    `).run(JSON.stringify(existingNotes), id);

    db.close();

    res.json({ success: true, notes: existingNotes });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

/**
 * Update last contacted timestamp
 */
router.post('/contacts/:id/contacted', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    db.prepare(`
      UPDATE user SET lastContactedAt = datetime('now'), updatedAt = datetime('now') WHERE id = ?
    `).run(id);

    db.close();

    res.json({ success: true, lastContactedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error updating contact time:', error);
    res.status(500).json({ error: 'Failed to update contact time' });
  }
});

// ============================================
// ORDERS
// ============================================

/**
 * Get all orders (admin only)
 */
router.get('/orders', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { status, type, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        o.*,
        a.title as artwork_title,
        a.image_path as artwork_image
      FROM orders o
      LEFT JOIN artworks a ON o.artwork_id = a.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    if (type) {
      query += ` AND o.type = ?`;
      params.push(type);
    }

    if (search) {
      query += ` AND (o.client_name LIKE ? OR o.client_email LIKE ? OR o.title LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const orders = db.prepare(query).all(...params);

    // Get status counts
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count FROM orders GROUP BY status
    `).all();

    db.close();

    res.json({
      orders,
      statusCounts: Object.fromEntries(statusCounts.map(s => [s.status, s.count]))
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * Get single order details
 */
router.get('/orders/:id', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const order = db.prepare(`
      SELECT
        o.*,
        a.title as artwork_title,
        a.image_path as artwork_image,
        a.price as artwork_price
      FROM orders o
      LEFT JOIN artworks a ON o.artwork_id = a.id
      WHERE o.id = ?
    `).get(id);

    if (!order) {
      db.close();
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get invoices
    const invoices = db.prepare('SELECT * FROM invoices WHERE order_id = ?').all(id);

    // Get email history
    const emails = db.prepare('SELECT * FROM email_log WHERE order_id = ? ORDER BY sent_at DESC').all(id);

    db.close();

    res.json({ order, invoices, emails });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * Update order status
 */
router.patch('/orders/:id/status', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['inquiry', 'quoted', 'accepted', 'paid', 'in_progress', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = db.prepare(`
      UPDATE orders
      SET status = ?, notes = COALESCE(?, notes), updated_at = datetime('now')
      WHERE id = ?
    `).run(status, notes, id);

    if (result.changes === 0) {
      db.close();
      return res.status(404).json({ error: 'Order not found' });
    }

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    db.close();

    res.json({ success: true, order: updated });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// ============================================
// EMAIL NOTIFICATIONS
// ============================================

/**
 * Send email to contact (admin only)
 */
router.post('/email/send', adminAuthMiddleware, async (req, res) => {
  try {
    const { to, subject, body, template = 'custom', orderId, contactId, data = {} } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    // Send email
    const result = await sendEmail({
      to,
      subject,
      body,
      template,
      data
    });

    // Log email to database
    const db = getDb();
    const emailId = 'email_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

    db.prepare(`
      INSERT INTO email_log (id, order_id, client_id, recipient, subject, template, status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sent', datetime('now'))
    `).run(emailId, orderId || null, contactId || null, to, subject, template);

    // Update last contacted time if contact exists
    if (contactId) {
      db.prepare(`
        UPDATE user SET lastContactedAt = datetime('now') WHERE id = ?
      `).run(contactId);
    }

    db.close();

    res.json({
      success: true,
      emailId,
      ...result
    });
  } catch (error) {
    console.error('Error sending email:', error);

    // Log failed email
    const db = getDb();
    const emailId = 'email_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

    db.prepare(`
      INSERT INTO email_log (id, order_id, client_id, recipient, subject, template, status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, 'failed', datetime('now'))
    `).run(emailId, req.body.orderId || null, req.body.contactId || null, req.body.to, req.body.subject, req.body.template || 'custom');

    db.close();

    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

/**
 * Get email history (admin only)
 */
router.get('/emails', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { limit = 50, offset = 0, status } = req.query;

    let query = 'SELECT * FROM email_log WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const emails = db.prepare(query).all(...params);
    db.close();

    res.json({ emails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch email history' });
  }
});

/**
 * Check Gmail configuration status
 */
router.get('/email/status', adminAuthMiddleware, (req, res) => {
  res.json({
    configured: isConfigured(),
    senderEmail: process.env.GMAIL_SENDER_EMAIL || 'daamitha@daamitha.art'
  });
});

// ============================================
// DASHBOARD / STATISTICS
// ============================================

/**
 * Get CRM dashboard statistics (admin only)
 */
router.get('/dashboard', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();

    // Total contacts
    const totalContacts = db.prepare('SELECT COUNT(*) as count FROM user WHERE role = ?').get('client').count;

    // New contacts (last 30 days)
    const newContacts = db.prepare(`
      SELECT COUNT(*) as count FROM user
      WHERE role = 'client' AND createdAt > datetime('now', '-30 days')
    `).get().count;

    // Order statistics
    const orderStats = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status IN ('inquiry', 'quoted', 'accepted') THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as avg_order_value
      FROM orders
    `).get();

    // Recent orders
    const recentOrders = db.prepare(`
      SELECT o.*, a.title as artwork_title
      FROM orders o
      LEFT JOIN artworks a ON o.artwork_id = a.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `).all();

    // Orders by status
    const ordersByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM orders GROUP BY status
    `).all();

    // Recent activity (emails sent)
    const recentEmails = db.prepare(`
      SELECT * FROM email_log ORDER BY sent_at DESC LIMIT 5
    `).all();

    // Contacts needing follow-up (not contacted in 14 days)
    const needsFollowUp = db.prepare(`
      SELECT * FROM user
      WHERE role = 'client'
      AND (lastContactedAt IS NULL OR lastContactedAt < datetime('now', '-14 days'))
      ORDER BY lastContactedAt ASC
      LIMIT 10
    `).all();

    db.close();

    res.json({
      contacts: {
        total: totalContacts,
        newThisMonth: newContacts,
        needsFollowUp: needsFollowUp.length
      },
      orders: {
        total: orderStats.total_orders || 0,
        completed: orderStats.completed_orders || 0,
        pending: orderStats.pending_orders || 0,
        totalRevenue: orderStats.total_revenue || 0,
        avgOrderValue: orderStats.avg_order_value || 0,
        byStatus: Object.fromEntries(ordersByStatus.map(s => [s.status, s.count]))
      },
      recent: {
        orders: recentOrders,
        emails: recentEmails,
        needsFollowUp
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Send bulk email to multiple contacts (admin only)
 */
router.post('/email/bulk', adminAuthMiddleware, async (req, res) => {
  try {
    const { recipients, subject, body, template = 'custom' } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients specified' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }

    const results = [];
    const db = getDb();

    for (const recipient of recipients) {
      try {
        await sendEmail({
          to: recipient.email,
          subject,
          body,
          template,
          data: { clientName: recipient.name }
        });

        const emailId = 'email_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        db.prepare(`
          INSERT INTO email_log (id, client_id, recipient, subject, template, status, sent_at)
          VALUES (?, ?, ?, ?, ?, 'sent', datetime('now'))
        `).run(emailId, recipient.id || null, recipient.email, subject, template);

        results.push({ email: recipient.email, success: true });
      } catch (error) {
        results.push({ email: recipient.email, success: false, error: error.message });
      }
    }

    db.close();

    const successCount = results.filter(r => r.success).length;
    res.json({
      success: true,
      totalSent: successCount,
      totalFailed: recipients.length - successCount,
      results
    });
  } catch (error) {
    console.error('Error sending bulk email:', error);
    res.status(500).json({ error: 'Failed to send bulk emails' });
  }
});

/**
 * Export contacts as CSV (admin only)
 */
router.get('/contacts/export', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();

    const contacts = db.prepare(`
      SELECT
        u.name, u.email, u.phone, u.address, u.company, u.tags,
        u.createdAt, u.lastContactedAt,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) as total_spent
      FROM user u
      LEFT JOIN orders o ON u.email = o.client_email
      WHERE u.role = 'client'
      GROUP BY u.id
      ORDER BY u.createdAt DESC
    `).all();

    db.close();

    // Generate CSV
    const headers = ['Name', 'Email', 'Phone', 'Address', 'Company', 'Tags', 'Created', 'Last Contact', 'Orders', 'Total Spent'];
    const rows = contacts.map(c => [
      c.name || '',
      c.email,
      c.phone || '',
      c.address || '',
      c.company || '',
      c.tags || '',
      c.createdAt,
      c.lastContactedAt || '',
      c.total_orders,
      c.total_spent || 0
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting contacts:', error);
    res.status(500).json({ error: 'Failed to export contacts' });
  }
});

module.exports = router;
