/**
 * Polar Payment Service
 *
 * Handles payment processing via Polar.sh
 * Creates checkout sessions and handles webhooks
 */

const { Polar } = require('@polar-sh/sdk');

// Check if Polar is configured
function isConfigured() {
  return !!(process.env.POLAR_ACCESS_TOKEN);
}

// Get Polar client
function getClient() {
  if (!isConfigured()) {
    return null;
  }

  return new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN
  });
}

/**
 * Create a checkout session for payment
 */
async function createCheckout({ orderId, amount, description, clientEmail }) {
  // If not configured, return simulated response
  if (!isConfigured()) {
    console.log('\n💳 PAYMENT (simulated - Polar not configured):');
    console.log('Order ID:', orderId);
    console.log('Amount: £', amount);
    console.log('Client:', clientEmail);
    console.log('---\n');

    const simulatedCheckoutId = 'sim_' + Date.now().toString(36);
    const simulatedUrl = `https://checkout.polar.sh/simulated/${simulatedCheckoutId}`;

    return {
      success: true,
      simulated: true,
      checkoutId: simulatedCheckoutId,
      checkoutUrl: simulatedUrl,
      message: 'Payment link simulated (Polar not configured)',
      amount,
      currency: 'GBP'
    };
  }

  try {
    const polar = getClient();
    const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

    // Create checkout session
    // Note: Polar API structure may vary - adjust according to actual SDK
    const checkout = await polar.checkouts.custom.create({
      productPriceAmount: Math.round(amount * 100), // Convert to cents
      productPriceCurrency: 'gbp',
      successUrl: `${baseUrl}/payment/success?order_id=${orderId}`,
      customerEmail: clientEmail,
      metadata: {
        orderId: orderId,
        description: description
      }
    });

    console.log(`✅ Polar checkout created for order ${orderId}: ${checkout.url}`);

    return {
      success: true,
      checkoutId: checkout.id,
      checkoutUrl: checkout.url,
      amount,
      currency: 'GBP'
    };

  } catch (error) {
    console.error('❌ Polar checkout error:', error);

    // Return helpful error for debugging
    return {
      success: false,
      error: error.message,
      suggestion: 'Check your POLAR_ACCESS_TOKEN and ensure your Polar account is set up correctly.'
    };
  }
}

/**
 * Handle Polar webhook events
 */
async function handleWebhook(event, signature) {
  // Verify webhook signature if secret is configured
  if (process.env.POLAR_WEBHOOK_SECRET) {
    // Signature verification would go here
    // This depends on Polar's webhook signature format
  }

  const eventType = event.type;
  const data = event.data;

  console.log(`📥 Polar webhook received: ${eventType}`);

  switch (eventType) {
    case 'checkout.completed':
    case 'payment.succeeded':
      return {
        action: 'payment_completed',
        checkoutId: data.checkoutId || data.id,
        orderId: data.metadata?.orderId,
        amount: data.amount / 100, // Convert from cents
        currency: data.currency
      };

    case 'checkout.failed':
    case 'payment.failed':
      return {
        action: 'payment_failed',
        checkoutId: data.checkoutId || data.id,
        orderId: data.metadata?.orderId,
        error: data.error || 'Payment failed'
      };

    case 'refund.created':
      return {
        action: 'refund_created',
        checkoutId: data.checkoutId,
        orderId: data.metadata?.orderId,
        amount: data.amount / 100
      };

    default:
      console.log(`Unhandled Polar event: ${eventType}`);
      return { action: 'unknown', eventType };
  }
}

/**
 * Get payment status for a checkout
 */
async function getCheckoutStatus(checkoutId) {
  if (!isConfigured()) {
    return {
      success: false,
      error: 'Polar not configured'
    };
  }

  try {
    const polar = getClient();
    const checkout = await polar.checkouts.custom.get(checkoutId);

    return {
      success: true,
      checkoutId: checkout.id,
      status: checkout.status,
      isPaid: checkout.status === 'succeeded' || checkout.status === 'completed',
      amount: checkout.amount / 100,
      currency: checkout.currency
    };

  } catch (error) {
    console.error('❌ Polar status check error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a product in Polar (for recurring items like prints)
 */
async function createProduct({ name, description, price, currency = 'gbp' }) {
  if (!isConfigured()) {
    return {
      success: false,
      error: 'Polar not configured'
    };
  }

  try {
    const polar = getClient();
    const organizationId = process.env.POLAR_ORGANIZATION_ID;

    const product = await polar.products.create({
      name,
      description,
      organizationId,
      prices: [
        {
          priceAmount: Math.round(price * 100),
          priceCurrency: currency,
          recurringInterval: null // One-time payment
        }
      ]
    });

    return {
      success: true,
      productId: product.id,
      name: product.name
    };

  } catch (error) {
    console.error('❌ Polar product creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  createCheckout,
  handleWebhook,
  getCheckoutStatus,
  createProduct,
  isConfigured
};
