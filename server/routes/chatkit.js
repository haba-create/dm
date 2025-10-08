const express = require('express');
const router = express.Router();

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

        // Make direct HTTP request to OpenAI ChatKit API
        // Note: Node.js OpenAI SDK doesn't support ChatKit yet
        const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'chatkit_beta=v1'
            },
            body: JSON.stringify({
                workflow: {
                    id: process.env.CHATKIT_WORKFLOW_ID
                },
                user: `gallery-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('ChatKit API error:', data);

            if (response.status === 401) {
                return res.status(401).json({
                    error: 'Invalid OpenAI API key'
                });
            }

            if (response.status === 404) {
                return res.status(404).json({
                    error: 'ChatKit workflow not found. Verify your workflow ID.',
                    details: data
                });
            }

            return res.status(response.status).json({
                error: 'Failed to create ChatKit session',
                message: data.message || data.error || 'Unknown error',
                details: data
            });
        }

        // Return the client secret for frontend use
        res.json({
            client_secret: data.client_secret,
            session_id: data.id
        });

    } catch (error) {
        console.error('ChatKit session creation error:', error);
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
