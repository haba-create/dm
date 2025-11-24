require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (required for Railway and other cloud platforms)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdn.platform.openai.com", "https://d3js.org"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:*", "https://*.openai.com", "https://cdn.platform.openai.com", "wss://*.openai.com"],
            frameSrc: ["'self'", "https://*.openai.com"],
            workerSrc: ["'self'", "blob:"]
        }
    }
}));

// Rate limiting (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    });
    app.use('/api/', limiter);
}

// Middleware
app.use(compression());

// CORS configuration for Better Auth (supports credentials/cookies)
app.use(cors({
    origin: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Cookie parser for Better Auth sessions
app.use(cookieParser());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Serve existing images from root directory
app.use('/images', express.static(path.join(__dirname, '..')));

// Import routes
const authRoutes = require('./routes/auth');
const artworkRoutes = require('./routes/artworks');
const contentRoutes = require('./routes/content');
const chatkitRoutes = require('./routes/chatkit');
const agentRoutes = require('./routes/agent');
const crmRoutes = require('./routes/crm');

// API routes
app.use('/api/auth', authRoutes);                    // Unified auth (Better Auth) for all users
app.use('/api/artworks', artworkRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/chatkit', chatkitRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/crm', crmRoutes);                      // CRM management routes

// Serve main index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve pricelist page
app.get('/pricelist', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pricelist.html'));
});

// Serve client portal page
app.get('/client', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/client-auth.html'));
});

// Serve client portal (alias for /login)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/client-auth.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Something went wrong!'
            : err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin/login.html`);
    console.log(`Client portal: http://localhost:${PORT}/login`);

    // Debug: Log environment variable status
    console.log('\n🔍 Environment Variables Status:');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`PORT: ${process.env.PORT || 'not set'}`);
    console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET'}`);
    console.log(`CHATKIT_WORKFLOW_ID: ${process.env.CHATKIT_WORKFLOW_ID || 'NOT SET'}`);

    // Better Auth configuration (unified auth for all users)
    console.log('\n🔐 Better Auth Configuration (Unified Auth):');
    console.log(`BETTER_AUTH_SECRET: ${process.env.BETTER_AUTH_SECRET ? 'SET' : 'NOT SET (using dev default)'}`);
    console.log(`BETTER_AUTH_URL: ${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}`);
    console.log(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'SET (Google OAuth enabled)' : 'NOT SET'}`);

    // Gmail configuration
    console.log('\n📧 Gmail Configuration:');
    console.log(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET'}`);
    console.log(`GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
    console.log(`GOOGLE_REFRESH_TOKEN: ${process.env.GOOGLE_REFRESH_TOKEN ? 'SET' : 'NOT SET'}`);
    console.log(`GMAIL_SENDER_EMAIL: ${process.env.GMAIL_SENDER_EMAIL || 'daamitha@daamitha.art (default)'}`);

    // Payments configuration
    console.log('\n💳 Payments Configuration:');
    console.log(`POLAR_ACCESS_TOKEN: ${process.env.POLAR_ACCESS_TOKEN ? 'SET' : 'NOT SET'}`);
    console.log('');

    // Warn if Better Auth secret is using default
    if (!process.env.BETTER_AUTH_SECRET) {
        console.warn('⚠️  WARNING: Using default Better Auth secret. Set BETTER_AUTH_SECRET environment variable in production!');
    }

    // Warn if Anthropic API key is missing
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ ERROR: ANTHROPIC_API_KEY is not set! Chat functionality will not work.');
    }

    // Warn if Gmail is not configured
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
        console.warn('⚠️  Gmail not fully configured. Emails will be logged to console instead of sent.');
    }
});