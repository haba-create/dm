const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client
let anthropicClient = null;

function getAnthropicClient() {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropicClient = new Anthropic({
      apiKey: apiKey
    });
  }
  return anthropicClient;
}

// System prompt for Daamitha (the artist)
const DAAMITHA_SYSTEM_PROMPT = `You are Daamitha, a contemporary oil painter currently based in London.

About You:
- You are a medical student who maintains your artistic practice alongside your studies
- Born in Bangalore, India, your work bridges Eastern heritage and Western technique
- You are also a traditional South Indian singer, keeping musical traditions alive
- Your paintings reflect your multicultural experiences and cultural fusion
- You work primarily with oil on linen canvas, focusing on meticulous detail and layering

Your Artistic Style:
- Contemporary oil paintings with deep cultural roots
- Inspired by both Indian heritage and Western artistic techniques
- Each piece takes time and patience through careful layering
- You explore themes of cultural identity, tradition, and modern life

When Interacting:
- Speak in first person as the artist Daamitha
- Share your passion for art, culture, and the stories behind your work
- Discuss your paintings, techniques, and creative process
- Help visitors learn about specific artworks and commissions
- Be warm, authentic, and enthusiastic about your art and heritage
- When asked your name, say "I'm Daamitha, the artist"

Your Website: https://www.daamitha.gallery/

Respond naturally as yourself - an artist passionate about cultural fusion through oil painting.`;

// Chat endpoint - handles conversation with Anthropic (NON-STREAMING)
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get Anthropic client
    const client = getAnthropicClient();

    // Build messages array for Anthropic
    const messages = [...conversationHistory, { role: 'user', content: message }];

    // Create message with Anthropic
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',  // Claude 3.5 Haiku (latest)
      max_tokens: 1024,
      system: DAAMITHA_SYSTEM_PROMPT,
      messages: messages
    });

    const assistantMessage = response.content[0].text;

    res.json({
      response: assistantMessage,
      conversationHistory: [...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: assistantMessage }
      ]
    });

  } catch (error) {
    console.error('Anthropic chat error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Chat endpoint with STREAMING support using Anthropic
router.post('/chat-stream', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    });

    // Get Anthropic client
    const client = getAnthropicClient();

    // Build messages array for Anthropic
    const messages = [...conversationHistory, { role: 'user', content: message }];

    let fullResponse = '';

    // Create streaming message with Anthropic
    const stream = await client.messages.stream({
      model: 'claude-3-5-haiku-20241022',  // Claude 3.5 Haiku (latest)
      max_tokens: 1024,
      system: DAAMITHA_SYSTEM_PROMPT,
      messages: messages
    });

    // Process the stream
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const content = event.delta.text;
        fullResponse += content;
        // Send chunk to client
        res.write(`data: ${JSON.stringify({ chunk: content, done: false })}\n\n`);
      }
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({
      chunk: '',
      done: true,
      fullResponse,
      conversationHistory: [...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: fullResponse }
      ]
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('Anthropic streaming error:', error);
    res.write(`data: ${JSON.stringify({
      error: 'Failed to process message',
      message: error.message,
      done: true
    })}\n\n`);
    res.end();
  }
});

// Health check for agent
router.get('/health', (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  res.json({
    status: 'ok',
    agent: 'Daamitha (Artist AI)',
    model: 'claude-3-5-haiku-20241022',
    apiKeyConfigured: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    nodeEnv: process.env.NODE_ENV || 'not set',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to show all env var names (NOT values, for security)
router.get('/debug-env', (req, res) => {
  const envVarNames = Object.keys(process.env).sort();
  const relevantVars = envVarNames.filter(key =>
    key.includes('ANTHROPIC') ||
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
