/**
 * Email Service
 *
 * Sends emails using Gmail API with OAuth2 authentication.
 * Falls back to console logging if not configured.
 */

const nodemailer = require('nodemailer');
const { google } = require('googleapis');

// Email templates
const EMAIL_TEMPLATES = {
  quote: {
    subject: (data) => `Quote for ${data.artworkTitle || 'Your Inquiry'} - Daamitha Gallery`,
    body: (data) => `
Dear ${data.clientName || 'Art Enthusiast'},

Thank you for your interest in my artwork!

${data.body}

${data.artworkTitle ? `Artwork: ${data.artworkTitle}` : ''}
${data.amount ? `Quoted Price: £${data.amount.toLocaleString()}` : ''}

${data.paymentLink ? `To proceed with your purchase, please use this secure payment link:\n${data.paymentLink}\n` : ''}

If you have any questions or would like to discuss further, please don't hesitate to reach out.

Warm regards,
Daamitha
Contemporary Oil Painter
www.daamitha.gallery
    `.trim()
  },

  order_confirmation: {
    subject: (data) => `Order Confirmed - ${data.orderId} - Daamitha Gallery`,
    body: (data) => `
Dear ${data.clientName || 'Valued Client'},

Thank you for your order! I'm thrilled that my artwork will be finding a new home with you.

Order Details:
- Order ID: ${data.orderId}
- Item: ${data.artworkTitle || data.description || 'Artwork'}
- Amount: £${data.amount?.toLocaleString() || 'As quoted'}

${data.body}

I will begin preparing your artwork for shipment and will notify you once it's on its way.

With gratitude,
Daamitha
Contemporary Oil Painter
www.daamitha.gallery
    `.trim()
  },

  shipping: {
    subject: (data) => `Your Artwork Has Been Shipped! - Daamitha Gallery`,
    body: (data) => `
Dear ${data.clientName || 'Valued Client'},

Wonderful news! Your artwork has been carefully packaged and shipped.

${data.trackingNumber ? `Tracking Number: ${data.trackingNumber}` : ''}
${data.carrier ? `Carrier: ${data.carrier}` : ''}

${data.body}

Expected delivery: ${data.estimatedDelivery || '5-7 business days'}

Please ensure someone is available to receive the package, as it contains valuable artwork that requires a signature.

If you have any questions about your delivery, please don't hesitate to contact me.

Warmly,
Daamitha
Contemporary Oil Painter
www.daamitha.gallery
    `.trim()
  },

  follow_up: {
    subject: (data) => `Following Up - Daamitha Gallery`,
    body: (data) => `
Dear ${data.clientName || 'Art Enthusiast'},

I hope this message finds you well!

${data.body}

I'd love to hear from you and answer any questions you might have about my work.

Warm regards,
Daamitha
Contemporary Oil Painter
www.daamitha.gallery
    `.trim()
  },

  thank_you: {
    subject: (data) => `Thank You! - Daamitha Gallery`,
    body: (data) => `
Dear ${data.clientName || 'Valued Client'},

${data.body}

Thank you so much for your support of my art. It means the world to me to know that my work resonates with collectors like yourself.

I hope the artwork brings you joy for many years to come!

With heartfelt gratitude,
Daamitha
Contemporary Oil Painter
www.daamitha.gallery
    `.trim()
  },

  custom: {
    subject: (data) => data.subject,
    body: (data) => `
Dear ${data.clientName || 'Art Enthusiast'},

${data.body}

Warm regards,
Daamitha
Contemporary Oil Painter
www.daamitha.gallery
    `.trim()
  }
};

// Check if Gmail is configured
function isConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

// Create OAuth2 client
function createOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return oauth2Client;
}

// Create nodemailer transporter
async function createTransporter() {
  if (!isConfigured()) {
    return null;
  }

  const oauth2Client = createOAuth2Client();
  const accessToken = await oauth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_SENDER_EMAIL || 'daamitha@daamitha.art',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken: accessToken.token
    }
  });
}

/**
 * Send an email
 */
async function sendEmail({ to, subject, body, template = 'custom', data = {} }) {
  // Merge data with body
  const templateData = {
    ...data,
    body,
    subject
  };

  // Get template
  const emailTemplate = EMAIL_TEMPLATES[template] || EMAIL_TEMPLATES.custom;

  // Generate email content
  const finalSubject = emailTemplate.subject(templateData);
  const finalBody = emailTemplate.body(templateData);

  // If not configured, log to console (useful for development/testing)
  if (!isConfigured()) {
    console.log('\n📧 EMAIL (not sent - Gmail not configured):');
    console.log('To:', to);
    console.log('Subject:', finalSubject);
    console.log('Body:', finalBody);
    console.log('---\n');

    return {
      success: true,
      simulated: true,
      message: 'Email logged to console (Gmail not configured)',
      to,
      subject: finalSubject
    };
  }

  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Daamitha Gallery" <${process.env.GMAIL_SENDER_EMAIL || 'daamitha@daamitha.art'}>`,
      to,
      subject: finalSubject,
      text: finalBody,
      html: finalBody.replace(/\n/g, '<br>')
    };

    const result = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent to ${to}: ${finalSubject}`);

    return {
      success: true,
      messageId: result.messageId,
      to,
      subject: finalSubject
    };

  } catch (error) {
    console.error('❌ Email send error:', error);
    throw error;
  }
}

/**
 * Send a quote email with payment link
 */
async function sendQuoteEmail({ to, clientName, artworkTitle, amount, paymentLink, additionalNotes }) {
  return sendEmail({
    to,
    subject: `Quote for ${artworkTitle}`,
    body: additionalNotes || 'Please find your quote below.',
    template: 'quote',
    data: {
      clientName,
      artworkTitle,
      amount,
      paymentLink
    }
  });
}

/**
 * Send order confirmation email
 */
async function sendOrderConfirmation({ to, clientName, orderId, artworkTitle, amount, additionalNotes }) {
  return sendEmail({
    to,
    subject: `Order Confirmed - ${orderId}`,
    body: additionalNotes || 'Your order has been confirmed.',
    template: 'order_confirmation',
    data: {
      clientName,
      orderId,
      artworkTitle,
      amount
    }
  });
}

module.exports = {
  sendEmail,
  sendQuoteEmail,
  sendOrderConfirmation,
  isConfigured,
  EMAIL_TEMPLATES
};
