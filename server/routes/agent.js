const express = require('express');
const router = express.Router();
const { Agent, run } = require('@openai/agents');

// Lazy initialization of agent
let galleryAgent = null;

function initializeAgent() {
  if (!galleryAgent) {
    // Create the Gallery Agent
    galleryAgent = new Agent({
      name: "Gallery Agent",
      instructions: `You are a helpful and knowledgeable AI curator and assistant for Daamitha's art gallery.

About the Artist:
- Daamitha is a contemporary oil painter based in London
- She's a medical student who maintains her artistic practice
- Born in India (Bangalore), her work bridges Eastern heritage and Western technique
- She's also a traditional Indian singer, keeping South Indian musical traditions alive
- Her paintings reflect multicultural experiences and cultural fusion

Your Role:
- Help customers learn about the gallery, paintings, and the artist
- Answer questions about artwork availability, pricing, and commissions
- Guide customers through the Lead-to-Order and Order-to-Cash processes
- Provide information about the artist's background, techniques, and inspiration

Website: https://www.daamitha.gallery/

Be warm, knowledgeable, and enthusiastic about art. Speak with passion about the cultural heritage and stories behind each piece.`,
      model: "gpt-5"
    });
  }
  return galleryAgent;
}

// Chat endpoint - handles conversation with the agent
router.post('/chat', async (req, res) => {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable in Railway.'
      });
    }

    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Initialize agent if not already done
    const agent = initializeAgent();

    // Build full conversation context as a single string
    let contextMessage = message;

    if (conversationHistory.length > 0) {
      const conversationContext = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      contextMessage = `Previous conversation:\n${conversationContext}\n\nUser: ${message}`;
    }

    // Run the agent with simple string input
    const result = await run(agent, contextMessage);

    res.json({
      response: result.finalOutput,
      conversationHistory: [...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: result.finalOutput }
      ]
    });

  } catch (error) {
    console.error('Agent chat error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check for agent
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: 'Gallery Agent',
    model: 'gpt-5',
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    apiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
    nodeEnv: process.env.NODE_ENV || 'not set',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to show all env var names (NOT values, for security)
router.get('/debug-env', (req, res) => {
  const envVarNames = Object.keys(process.env).sort();
  const relevantVars = envVarNames.filter(key =>
    key.includes('OPENAI') ||
    key.includes('CHATKIT') ||
    key.includes('JWT') ||
    key.includes('NODE_ENV') ||
    key.includes('PORT')
  );

  res.json({
    totalEnvVars: envVarNames.length,
    allEnvVarNames: envVarNames,
    relevantVars: relevantVars.reduce((acc, key) => {
      acc[key] = process.env[key] ? `SET (length: ${process.env[key].length})` : 'NOT SET';
      return acc;
    }, {}),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
