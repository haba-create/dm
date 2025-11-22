/**
 * Tool Executor
 *
 * Executes tools called by the Claude agent.
 * Each tool function takes input parameters and returns a result.
 */

const db = require('../models/database');
const emailService = require('../services/email');
const paymentService = require('../services/polar');

/**
 * Execute a tool by name with given input
 */
async function executeTool(toolName, input) {
  console.log(`[TOOL] Executing: ${toolName}`, input);

  try {
    switch (toolName) {
      case 'lookup_client':
        return await lookupClient(input);

      case 'get_artwork_details':
        return await getArtworkDetails(input);

      case 'list_available_artworks':
        return await listAvailableArtworks(input);

      case 'create_order':
        return await createOrder(input);

      case 'update_order_status':
        return await updateOrderStatus(input);

      case 'get_client_orders':
        return await getClientOrders(input);

      case 'send_email':
        return await sendEmail(input);

      case 'create_payment_link':
        return await createPaymentLink(input);

      case 'check_payment_status':
        return await checkPaymentStatus(input);

      case 'save_conversation_context':
        return await saveConversationContext(input);

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

module.exports = { executeTool };
