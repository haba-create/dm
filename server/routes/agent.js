const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { Agent, Runner } = require('@openai/agents');

// Lazy initialization of OpenAI client and agent
let client = null;
let galleryAgent = null;

function initializeAgent() {
  if (!galleryAgent) {
    // Initialize OpenAI client
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Create the Gallery Agent
    galleryAgent = new Agent({
  name: "Gallery Agent",
  instructions: `You are Daamitha, a helpful and knowledgeable AI curator and assistant for Daamitha's art gallery.

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
  model: "gpt-4o", // Using gpt-4o instead of gpt-5 (which doesn't exist yet)
  modelSettings: {
    temperature: 0.7,
    store: true
  }
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

    // Build conversation history
    const agentInput = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: [{ type: 'input_text', text: msg.content }]
      })),
      {
        role: 'user',
        content: [{ type: 'input_text', text: message }]
      }
    ];

    // Create runner with trace metadata
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: 'gallery-chat',
        workflow_id: process.env.CHATKIT_WORKFLOW_ID || 'custom-chat'
      }
    });

    // Run the agent
    const result = await runner.run(agent, agentInput);

    if (!result.finalOutput) {
      throw new Error('Agent did not return a response');
    }

    // Extract new conversation items
    const newMessages = result.newItems.map(item => ({
      role: item.rawItem.role,
      content: item.rawItem.content[0]?.text || ''
    }));

    res.json({
      response: result.finalOutput,
      conversationHistory: [...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: result.finalOutput }
      ],
      newItems: newMessages
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
    model: 'gpt-4o',
    apiKeyConfigured: !!process.env.OPENAI_API_KEY
  });
});

module.exports = router;
