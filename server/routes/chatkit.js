const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Lazy initialization of OpenAI client
let openai = null;

function getOpenAIClient() {
    if (!openai && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openai;
}

// Create ChatKit session endpoint
router.post('/session', async (req, res) => {
    try {
        // Validate API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'
            });
        }

        // Validate workflow ID is configured
        if (!process.env.CHATKIT_WORKFLOW_ID) {
            return res.status(500).json({
                error: 'ChatKit workflow ID not configured. Please set CHATKIT_WORKFLOW_ID environment variable.'
            });
        }

        // Get or create OpenAI client
        const client = getOpenAIClient();
        if (!client) {
            return res.status(500).json({
                error: 'Failed to initialize OpenAI client'
            });
        }

        // Create a ChatKit session
        // Note: You can customize the session parameters based on your needs
        const session = await client.chatkit.sessions.create({
            workflow_id: process.env.CHATKIT_WORKFLOW_ID,
            // Optional: Add user context or metadata
            metadata: {
                source: 'daamitha-gallery',
                timestamp: new Date().toISOString()
            }
        });

        // Return the client secret for frontend use
        res.json({
            client_secret: session.client_secret,
            session_id: session.id
        });

    } catch (error) {
        console.error('ChatKit session creation error:', error);

        // Handle specific error types
        if (error.status === 401) {
            return res.status(401).json({
                error: 'Invalid OpenAI API key'
            });
        }

        if (error.status === 404) {
            return res.status(404).json({
                error: 'ChatKit workflow not found. Verify your workflow ID.'
            });
        }

        res.status(500).json({
            error: 'Failed to create ChatKit session',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        chatkit_configured: !!(process.env.OPENAI_API_KEY && process.env.CHATKIT_WORKFLOW_ID)
    });
});

module.exports = router;
