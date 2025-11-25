/**
 * Tool Executor
 *
 * Executes tools called by the Claude agent.
 * Each tool function takes input parameters and returns a result.
 */

const db = require('../models/database');
const emailService = require('../services/email');
const paymentService = require('../services/polar');
const Database = require('better-sqlite3');
const path = require('path');

// Database path for direct queries
const dbPath = path.join(__dirname, '../../gallery.db');
const getDb = () => new Database(dbPath);

/**
 * Execute a tool by name with given input
 */
async function executeTool(toolName, input) {
  console.log(`[TOOL] Executing: ${toolName}`, input);

  try {
    switch (toolName) {
      // Client Management
      case 'lookup_client':
        return await lookupClient(input);
      case 'update_client':
        return await updateClient(input);
      case 'search_clients':
        return await searchClients(input);
      case 'create_contact':
        return await createContact(input);

      // Artworks
      case 'get_artwork_details':
        return await getArtworkDetails(input);
      case 'list_available_artworks':
        return await listAvailableArtworks(input);

      // Orders
      case 'create_order':
        return await createOrder(input);
      case 'update_order_status':
        return await updateOrderStatus(input);
      case 'get_client_orders':
        return await getClientOrders(input);

      // Email & Notifications
      case 'send_email':
        return await sendEmail(input);
      case 'send_notification':
        return await sendNotification(input);
      case 'send_quote_email':
        return await sendQuoteEmail(input);
      case 'send_order_update':
        return await sendOrderUpdate(input);
      case 'send_follow_up':
        return await sendFollowUp(input);

      // Payments
      case 'create_payment_link':
        return await createPaymentLink(input);
      case 'check_payment_status':
        return await checkPaymentStatus(input);

      // CRM Activities
      case 'save_conversation_context':
        return await saveConversationContext(input);
      case 'log_activity':
        return await logActivity(input);
      case 'get_crm_summary':
        return await getCrmSummary(input);
      case 'get_follow_up_list':
        return await getFollowUpList(input);

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`[TOOL] Error executing ${toolName}:`, error);
    return { error: error.message };
  }
}

/**
 * Look up a client by email
 */
async function lookupClient({ email }) {
  return new Promise((resolve, reject) => {
    // First check Better Auth user table
    db.get(
      "SELECT * FROM user WHERE email = ?",
      [email],
      (err, user) => {
        if (err) {
          reject(err);
          return;
        }

        if (!user) {
          resolve({
            found: false,
            message: `No client found with email: ${email}`,
            suggestion: "This appears to be a new client. You can create an order for them and they'll receive an email invitation to create an account."
          });
          return;
        }

        // Get their order history
        db.all(
          "SELECT * FROM orders WHERE client_email = ? OR client_id = ? ORDER BY created_at DESC LIMIT 10",
          [email, user.id],
          (err, orders) => {
            if (err) {
              reject(err);
              return;
            }

            resolve({
              found: true,
              client: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                memberSince: user.createdAt
              },
              orderHistory: orders || [],
              totalOrders: orders ? orders.length : 0
            });
          }
        );
      }
    );
  });
}

/**
 * Get artwork details by ID or title
 */
async function getArtworkDetails({ artwork_id, title }) {
  return new Promise((resolve, reject) => {
    let query, params;

    if (artwork_id) {
      query = "SELECT * FROM artworks WHERE id = ?";
      params = [artwork_id];
    } else if (title) {
      // Fuzzy search by title
      query = "SELECT * FROM artworks WHERE title LIKE ? LIMIT 5";
      params = [`%${title}%`];
    } else {
      resolve({ error: "Please provide either artwork_id or title" });
      return;
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      if (!rows || rows.length === 0) {
        resolve({
          found: false,
          message: artwork_id
            ? `No artwork found with ID: ${artwork_id}`
            : `No artworks found matching: "${title}"`
        });
        return;
      }

      const artworks = rows.map(art => ({
        id: art.id,
        title: art.title,
        artist: art.artist,
        technique: art.technique,
        dimensions: art.dimensions,
        year: art.year,
        price: art.price,
        priceFormatted: `£${art.price?.toLocaleString() || 'Price on request'}`,
        description: art.description,
        category: art.category,
        available: art.available === 1,
        status: art.available === 1 ? 'Available' : 'Sold',
        imagePath: art.image_path
      }));

      resolve({
        found: true,
        artworks: artwork_id ? artworks[0] : artworks,
        count: artworks.length
      });
    });
  });
}

/**
 * List available artworks with optional filters
 */
async function listAvailableArtworks({ category, max_price, limit = 10 }) {
  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM artworks WHERE available = 1";
    const params = [];

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    if (max_price) {
      query += " AND price <= ?";
      params.push(max_price);
    }

    query += " ORDER BY featured DESC, created_at DESC LIMIT ?";
    params.push(limit);

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const artworks = (rows || []).map(art => ({
        id: art.id,
        title: art.title,
        technique: art.technique,
        dimensions: art.dimensions,
        price: art.price,
        priceFormatted: `£${art.price?.toLocaleString() || 'Price on request'}`,
        category: art.category,
        featured: art.featured === 1
      }));

      resolve({
        artworks,
        count: artworks.length,
        filters: { category, max_price, limit }
      });
    });
  });
}

/**
 * Create a new order
 */
async function createOrder({ client_email, client_name, order_type, artwork_id, title, description, amount }) {
  try {
    // Get artwork details if artwork_id provided
    let artworkDetails = null;
    if (artwork_id) {
      artworkDetails = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM artworks WHERE id = ?", [artwork_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }

    const orderData = {
      client_email,
      client_name,
      type: order_type,
      artwork_id: artwork_id || null,
      title: title || (artworkDetails ? artworkDetails.title : null),
      description,
      amount: amount || (artworkDetails ? artworkDetails.price : null)
    };

    const order = await db.createOrder(orderData);

    return {
      success: true,
      order: {
        id: order.id,
        type: order_type,
        title: orderData.title,
        amount: orderData.amount,
        amountFormatted: orderData.amount ? `£${orderData.amount.toLocaleString()}` : 'To be quoted',
        status: 'inquiry',
        clientEmail: client_email,
        clientName: client_name
      },
      message: `Order ${order.id} created successfully. Type: ${order_type}`,
      nextSteps: order_type === 'commission'
        ? "Please discuss the commission details and provide a quote."
        : "You can now send a quote email or create a payment link."
    };
  } catch (error) {
    return { error: `Failed to create order: ${error.message}` };
  }
}

/**
 * Update order status
 */
async function updateOrderStatus({ order_id, status, notes }) {
  try {
    const result = await db.updateOrderStatus(order_id, status, notes);

    if (!result.updated) {
      return { error: `Order ${order_id} not found` };
    }

    return {
      success: true,
      orderId: order_id,
      newStatus: status,
      notes,
      message: `Order ${order_id} status updated to: ${status}`
    };
  } catch (error) {
    return { error: `Failed to update order: ${error.message}` };
  }
}

/**
 * Get orders for a client
 */
async function getClientOrders({ client_email }) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM orders WHERE client_email = ? ORDER BY created_at DESC",
      [client_email],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        if (!rows || rows.length === 0) {
          resolve({
            found: false,
            message: `No orders found for: ${client_email}`,
            orders: []
          });
          return;
        }

        const orders = rows.map(order => ({
          id: order.id,
          type: order.type,
          title: order.title,
          status: order.status,
          amount: order.amount,
          amountFormatted: order.amount ? `£${order.amount.toLocaleString()}` : 'Not quoted',
          createdAt: order.created_at,
          updatedAt: order.updated_at
        }));

        resolve({
          found: true,
          clientEmail: client_email,
          orders,
          totalOrders: orders.length,
          summary: {
            pending: orders.filter(o => ['inquiry', 'quoted'].includes(o.status)).length,
            inProgress: orders.filter(o => ['accepted', 'paid', 'in_progress'].includes(o.status)).length,
            completed: orders.filter(o => ['shipped', 'completed'].includes(o.status)).length
          }
        });
      }
    );
  });
}

/**
 * Send email via Gmail API
 */
async function sendEmail({ to, subject, body, template, order_id }) {
  try {
    const result = await emailService.sendEmail({
      to,
      subject,
      body,
      template: template || 'custom'
    });

    // Log the email
    if (result.success) {
      await db.logEmail({
        order_id,
        recipient: to,
        subject,
        template: template || 'custom',
        status: 'sent'
      });
    }

    return result;
  } catch (error) {
    // Log failed email
    await db.logEmail({
      order_id,
      recipient: to,
      subject,
      template: template || 'custom',
      status: 'failed'
    });

    return {
      success: false,
      error: `Failed to send email: ${error.message}`,
      suggestion: "Email service may not be configured. Please check GOOGLE_CLIENT_ID and related environment variables."
    };
  }
}

/**
 * Create a Polar payment link
 */
async function createPaymentLink({ order_id, amount, description, client_email }) {
  try {
    const result = await paymentService.createCheckout({
      orderId: order_id,
      amount,
      description,
      clientEmail: client_email
    });

    if (result.success) {
      // Create invoice record
      await db.createInvoice({
        order_id,
        polar_checkout_id: result.checkoutId,
        amount
      });

      // Update order status to quoted
      await db.updateOrderStatus(order_id, 'quoted');
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Failed to create payment link: ${error.message}`,
      suggestion: "Payment service may not be configured. Please check POLAR_ACCESS_TOKEN environment variable."
    };
  }
}

/**
 * Check payment status for an order
 */
async function checkPaymentStatus({ order_id }) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM invoices WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
      [order_id],
      (err, invoice) => {
        if (err) {
          reject(err);
          return;
        }

        if (!invoice) {
          resolve({
            found: false,
            message: `No payment/invoice found for order: ${order_id}`
          });
          return;
        }

        resolve({
          found: true,
          orderId: order_id,
          invoiceId: invoice.id,
          amount: invoice.amount,
          amountFormatted: `£${invoice.amount?.toLocaleString()}`,
          status: invoice.status,
          isPaid: invoice.status === 'paid',
          paidAt: invoice.paid_at,
          checkoutId: invoice.polar_checkout_id
        });
      }
    );
  });
}

/**
 * Save conversation context for a client
 */
async function saveConversationContext({ client_email, context, summary }) {
  try {
    const conversationId = 'conv_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

    await db.saveConversation({
      id: conversationId,
      client_email,
      messages: [],
      context,
      summary
    });

    return {
      success: true,
      conversationId,
      message: "Context saved successfully"
    };
  } catch (error) {
    return { error: `Failed to save context: ${error.message}` };
  }
}

// ============================================
// NEW CRM TOOLS
// ============================================

/**
 * Update client profile
 */
async function updateClient({ email, name, phone, address, company, notes, tags }) {
  try {
    const db = getDb();

    // Check if client exists
    const user = db.prepare('SELECT * FROM user WHERE email = ?').get(email);

    if (!user) {
      db.close();
      return {
        success: false,
        error: `No client found with email: ${email}`,
        suggestion: "Use create_contact to add a new contact first."
      };
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (address) { updates.push('address = ?'); params.push(address); }
    if (company) { updates.push('company = ?'); params.push(company); }
    if (notes) { updates.push('notes = ?'); params.push(notes); }
    if (tags) { updates.push('tags = ?'); params.push(tags); }

    if (updates.length === 0) {
      db.close();
      return { success: false, error: 'No fields to update' };
    }

    updates.push('updatedAt = datetime("now")');
    params.push(email);

    db.prepare(`UPDATE user SET ${updates.join(', ')} WHERE email = ?`).run(...params);

    // Update last contacted time
    db.prepare('UPDATE user SET lastContactedAt = datetime("now") WHERE email = ?').run(email);

    const updated = db.prepare('SELECT * FROM user WHERE email = ?').get(email);
    db.close();

    return {
      success: true,
      client: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
        company: updated.company,
        notes: updated.notes,
        tags: updated.tags
      },
      message: 'Client profile updated successfully'
    };
  } catch (error) {
    return { error: `Failed to update client: ${error.message}` };
  }
}

/**
 * Search clients
 */
async function searchClients({ query, tag, limit = 10 }) {
  try {
    const db = getDb();

    let sql = `
      SELECT u.*,
             COUNT(DISTINCT o.id) as total_orders,
             SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) as total_spent
      FROM user u
      LEFT JOIN orders o ON u.email = o.client_email
      WHERE u.role = 'client'
    `;
    const params = [];

    if (query) {
      sql += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.company LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }

    if (tag) {
      sql += ` AND u.tags LIKE ?`;
      params.push(`%${tag}%`);
    }

    sql += ` GROUP BY u.id ORDER BY u.lastContactedAt DESC LIMIT ?`;
    params.push(limit);

    const clients = db.prepare(sql).all(...params);
    db.close();

    return {
      success: true,
      clients: clients.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        tags: c.tags,
        totalOrders: c.total_orders || 0,
        totalSpent: c.total_spent || 0,
        totalSpentFormatted: `£${(c.total_spent || 0).toLocaleString()}`,
        lastContacted: c.lastContactedAt,
        memberSince: c.createdAt
      })),
      count: clients.length,
      filters: { query, tag, limit }
    };
  } catch (error) {
    return { error: `Failed to search clients: ${error.message}` };
  }
}

/**
 * Create a new contact/lead
 */
async function createContact({ email, name, phone, source, notes, tags }) {
  try {
    const db = getDb();

    // Check if already exists
    const existing = db.prepare('SELECT * FROM user WHERE email = ?').get(email);

    if (existing) {
      db.close();
      return {
        success: false,
        exists: true,
        client: {
          id: existing.id,
          name: existing.name,
          email: existing.email
        },
        message: 'A contact with this email already exists'
      };
    }

    // Create new contact
    const userId = 'contact_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    const fullNotes = source ? `Source: ${source}\n${notes || ''}` : notes || '';

    db.prepare(`
      INSERT INTO user (id, name, email, role, phone, notes, tags, createdAt, updatedAt)
      VALUES (?, ?, ?, 'client', ?, ?, ?, datetime('now'), datetime('now'))
    `).run(userId, name || email.split('@')[0], email, phone || null, fullNotes, tags || 'lead');

    const newContact = db.prepare('SELECT * FROM user WHERE id = ?').get(userId);
    db.close();

    return {
      success: true,
      contact: {
        id: newContact.id,
        name: newContact.name,
        email: newContact.email,
        phone: newContact.phone,
        tags: newContact.tags,
        notes: newContact.notes
      },
      message: `Contact ${newContact.name} created successfully`
    };
  } catch (error) {
    return { error: `Failed to create contact: ${error.message}` };
  }
}

// ============================================
// NOTIFICATION TOOLS
// ============================================

/**
 * Send notification to gallery owner
 */
async function sendNotification({ type, subject, summary, client_email, client_name, order_id, priority = 'normal' }) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@daamitha.art';

    // Build subject based on type
    const subjects = {
      'new_inquiry': `New Inquiry${client_name ? ` from ${client_name}` : ''}`,
      'new_order': `New Order${order_id ? ` #${order_id}` : ''}`,
      'payment_received': `Payment Received${order_id ? ` for Order #${order_id}` : ''}`,
      'urgent': `[URGENT] ${subject || 'Requires Attention'}`,
      'follow_up_needed': `Follow-up Needed${client_name ? ` - ${client_name}` : ''}`,
      'custom': subject || 'Gallery Notification'
    };

    const priorityPrefix = priority === 'urgent' ? '[URGENT] ' : (priority === 'high' ? '[High Priority] ' : '');
    const emailSubject = priorityPrefix + (subjects[type] || subject || 'Gallery Notification');

    // Build email body
    let body = `${summary}\n\n`;
    if (client_name) body += `Client: ${client_name}\n`;
    if (client_email) body += `Email: ${client_email}\n`;
    if (order_id) body += `Order ID: ${order_id}\n`;
    body += `\nTime: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}`;

    const result = await emailService.sendEmail({
      to: adminEmail,
      subject: emailSubject,
      body,
      template: 'custom'
    });

    return {
      success: true,
      notificationType: type,
      sentTo: adminEmail,
      message: 'Notification sent to gallery owner'
    };
  } catch (error) {
    return { error: `Failed to send notification: ${error.message}` };
  }
}

/**
 * Send professional quote email
 */
async function sendQuoteEmail({ to, client_name, artwork_title, amount, description, include_payment_link, order_id }) {
  try {
    let paymentLink = null;

    // Create payment link if requested
    if (include_payment_link && order_id) {
      const paymentResult = await paymentService.createCheckout({
        orderId: order_id,
        amount,
        description: `Quote for ${artwork_title}`,
        clientEmail: to
      });

      if (paymentResult.success) {
        paymentLink = paymentResult.checkoutUrl;
      }
    }

    const result = await emailService.sendQuoteEmail({
      to,
      clientName: client_name,
      artworkTitle: artwork_title,
      amount,
      paymentLink,
      additionalNotes: description
    });

    // Log the email
    const db = getDb();
    const emailId = 'email_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    db.prepare(`
      INSERT INTO email_log (id, order_id, recipient, subject, template, status, sent_at)
      VALUES (?, ?, ?, ?, 'quote', 'sent', datetime('now'))
    `).run(emailId, order_id || null, to, `Quote for ${artwork_title} - Daamitha Gallery`);

    // Update contact's last contacted time
    db.prepare('UPDATE user SET lastContactedAt = datetime("now") WHERE email = ?').run(to);
    db.close();

    return {
      success: true,
      emailSent: true,
      paymentLinkIncluded: !!paymentLink,
      message: `Quote email sent to ${client_name}`
    };
  } catch (error) {
    return { error: `Failed to send quote email: ${error.message}` };
  }
}

/**
 * Send order status update email
 */
async function sendOrderUpdate({ to, client_name, order_id, new_status, tracking_number, carrier, additional_message }) {
  try {
    const statusMessages = {
      'accepted': 'Your order has been accepted! We will begin working on it shortly.',
      'paid': 'Thank you! Your payment has been received and confirmed.',
      'in_progress': 'Great news! Work on your order is now in progress.',
      'shipped': `Your order has been shipped!${tracking_number ? `\n\nTracking Number: ${tracking_number}` : ''}${carrier ? `\nCarrier: ${carrier}` : ''}`,
      'completed': 'Your order has been delivered. Thank you for your purchase!'
    };

    const subject = new_status === 'shipped'
      ? `Your Artwork Has Been Shipped! - Order ${order_id}`
      : `Order Update - ${order_id} - Daamitha Gallery`;

    let body = `Dear ${client_name},\n\n${statusMessages[new_status] || `Your order status has been updated to: ${new_status}`}`;
    if (additional_message) body += `\n\n${additional_message}`;
    body += `\n\nOrder ID: ${order_id}\n\nWarm regards,\nDaamitha`;

    const result = await emailService.sendEmail({
      to,
      subject,
      body,
      template: new_status === 'shipped' ? 'shipping' : 'order_confirmation'
    });

    // Log the email
    const db = getDb();
    const emailId = 'email_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    db.prepare(`
      INSERT INTO email_log (id, order_id, recipient, subject, template, status, sent_at)
      VALUES (?, ?, ?, ?, ?, 'sent', datetime('now'))
    `).run(emailId, order_id, to, subject, new_status === 'shipped' ? 'shipping' : 'order_update');

    // Update contact's last contacted time
    db.prepare('UPDATE user SET lastContactedAt = datetime("now") WHERE email = ?').run(to);
    db.close();

    return {
      success: true,
      message: `Order update email sent for status: ${new_status}`
    };
  } catch (error) {
    return { error: `Failed to send order update: ${error.message}` };
  }
}

/**
 * Send follow-up email
 */
async function sendFollowUp({ to, client_name, subject, message, context }) {
  try {
    const emailSubject = subject || `Following Up - Daamitha Gallery`;

    let body = `Dear ${client_name},\n\n${message}`;
    body += `\n\nWarm regards,\nDaamitha`;

    const result = await emailService.sendEmail({
      to,
      subject: emailSubject,
      body,
      template: 'follow_up'
    });

    // Log the email
    const db = getDb();
    const emailId = 'email_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    db.prepare(`
      INSERT INTO email_log (id, recipient, subject, template, status, sent_at)
      VALUES (?, ?, ?, 'follow_up', 'sent', datetime('now'))
    `).run(emailId, to, emailSubject);

    // Update contact's last contacted time
    db.prepare('UPDATE user SET lastContactedAt = datetime("now") WHERE email = ?').run(to);
    db.close();

    return {
      success: true,
      message: `Follow-up email sent to ${client_name}`,
      context: context
    };
  } catch (error) {
    return { error: `Failed to send follow-up: ${error.message}` };
  }
}

// ============================================
// CRM ACTIVITY TOOLS
// ============================================

/**
 * Log an activity for CRM tracking
 */
async function logActivity({ client_email, activity_type, description, outcome }) {
  try {
    const db = getDb();

    // Create activity log table if not exists
    db.prepare(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY,
        client_email TEXT,
        activity_type TEXT,
        description TEXT,
        outcome TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    const activityId = 'activity_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

    db.prepare(`
      INSERT INTO activity_log (id, client_email, activity_type, description, outcome)
      VALUES (?, ?, ?, ?, ?)
    `).run(activityId, client_email, activity_type, description, outcome || null);

    // Update last contacted time for the client
    db.prepare('UPDATE user SET lastContactedAt = datetime("now") WHERE email = ?').run(client_email);

    db.close();

    return {
      success: true,
      activityId,
      message: `Activity logged: ${activity_type} with ${client_email}`
    };
  } catch (error) {
    return { error: `Failed to log activity: ${error.message}` };
  }
}

/**
 * Get CRM summary
 */
async function getCrmSummary({ days = 30, include_stats = true }) {
  try {
    const db = getDb();

    const result = {};

    if (include_stats) {
      // Total contacts
      result.totalContacts = db.prepare('SELECT COUNT(*) as count FROM user WHERE role = ?').get('client').count;

      // New contacts in period
      result.newContacts = db.prepare(`
        SELECT COUNT(*) as count FROM user
        WHERE role = 'client' AND createdAt > datetime('now', '-${days} days')
      `).get().count;

      // Order stats
      const orderStats = db.prepare(`
        SELECT
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status IN ('inquiry', 'quoted') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as revenue
        FROM orders
        WHERE created_at > datetime('now', '-${days} days')
      `).get();

      result.orders = {
        total: orderStats.total_orders || 0,
        completed: orderStats.completed || 0,
        pending: orderStats.pending || 0,
        revenue: orderStats.revenue || 0,
        revenueFormatted: `£${(orderStats.revenue || 0).toLocaleString()}`
      };

      // Clients needing follow-up
      result.needsFollowUp = db.prepare(`
        SELECT COUNT(*) as count FROM user
        WHERE role = 'client'
        AND (lastContactedAt IS NULL OR lastContactedAt < datetime('now', '-14 days'))
      `).get().count;
    }

    // Recent orders
    result.recentOrders = db.prepare(`
      SELECT o.*, a.title as artwork_title
      FROM orders o
      LEFT JOIN artworks a ON o.artwork_id = a.id
      ORDER BY o.created_at DESC LIMIT 5
    `).all();

    // Recent activity
    const activityExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_log'").get();
    if (activityExists) {
      result.recentActivity = db.prepare(`
        SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 5
      `).all();
    }

    db.close();

    return {
      success: true,
      period: `Last ${days} days`,
      ...result
    };
  } catch (error) {
    return { error: `Failed to get CRM summary: ${error.message}` };
  }
}

/**
 * Get list of clients needing follow-up
 */
async function getFollowUpList({ days_since_contact = 14, include_pending_orders = true, limit = 10 }) {
  try {
    const db = getDb();

    const clients = [];

    // Clients not contacted recently
    const notContacted = db.prepare(`
      SELECT u.*,
             (SELECT COUNT(*) FROM orders WHERE client_email = u.email) as order_count,
             (SELECT MAX(created_at) FROM orders WHERE client_email = u.email) as last_order
      FROM user u
      WHERE u.role = 'client'
      AND (u.lastContactedAt IS NULL OR u.lastContactedAt < datetime('now', '-${days_since_contact} days'))
      ORDER BY u.lastContactedAt ASC
      LIMIT ?
    `).all(limit);

    clients.push(...notContacted.map(c => ({
      ...c,
      reason: c.lastContactedAt ? `Not contacted in ${days_since_contact}+ days` : 'Never contacted',
      priority: c.order_count > 0 ? 'high' : 'normal'
    })));

    // Clients with pending orders
    if (include_pending_orders) {
      const pendingOrders = db.prepare(`
        SELECT DISTINCT u.*, o.id as order_id, o.status, o.title as order_title, o.created_at as order_created
        FROM user u
        JOIN orders o ON u.email = o.client_email
        WHERE u.role = 'client'
        AND o.status IN ('inquiry', 'quoted')
        ORDER BY o.created_at ASC
        LIMIT ?
      `).all(limit);

      pendingOrders.forEach(c => {
        if (!clients.find(existing => existing.email === c.email)) {
          clients.push({
            ...c,
            reason: `Pending order (${c.status}): ${c.order_title || c.order_id}`,
            priority: 'high'
          });
        }
      });
    }

    db.close();

    return {
      success: true,
      clients: clients.slice(0, limit).map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        lastContacted: c.lastContactedAt,
        orderCount: c.order_count || 0,
        reason: c.reason,
        priority: c.priority
      })),
      count: Math.min(clients.length, limit),
      criteria: { days_since_contact, include_pending_orders }
    };
  } catch (error) {
    return { error: `Failed to get follow-up list: ${error.message}` };
  }
}

module.exports = { executeTool };
