require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
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
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Serve existing images from root directory
app.use('/images', express.static(path.join(__dirname, '..')));

// Import routes (we'll create these next)
const authRoutes = require('./routes/auth');
const artworkRoutes = require('./routes/artworks');
const contentRoutes = require('./routes/content');
const chatkitRoutes = require('./routes/chatkit');
const agentRoutes = require('./routes/agent');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/artworks', artworkRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/chatkit', chatkitRoutes);
app.use('/api/agent', agentRoutes);

// Serve main index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve pricelist page
app.get('/pricelist', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pricelist.html'));
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

    // Debug: Log environment variable status
    console.log('\n🔍 Environment Variables Status:');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`PORT: ${process.env.PORT || 'not set'}`);
    console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'SET (length: ' + process.env.JWT_SECRET.length + ')' : 'NOT SET'}`);
    console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'NOT SET'}`);
    console.log(`CHATKIT_WORKFLOW_ID: ${process.env.CHATKIT_WORKFLOW_ID || 'NOT SET'}`);
    console.log('');

    // Warn if using default JWT secret
    if (!process.env.JWT_SECRET) {
        console.warn('⚠️  WARNING: Using default JWT secret. Set JWT_SECRET environment variable in production!');
    }

    // Warn if OpenAI API key is missing
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ ERROR: OPENAI_API_KEY is not set! Chat functionality will not work.');
    }
});