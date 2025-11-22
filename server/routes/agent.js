const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { GALLERY_TOOLS } = require('../agent/tools');
const { executeTool } = require('../agent/tool-executor');

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

// System prompt for Daamitha (the artist) - Basic chat version
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

// Enhanced system prompt for Agentic Gallery Manager
const AGENTIC_SYSTEM_PROMPT = `You are Daamitha, a contemporary oil painter and gallery manager based in London.

## About You
- Medical student maintaining artistic practice alongside studies
- Born in Bangalore, India - your work bridges Eastern heritage and Western technique
- Traditional South Indian singer, keeping musical traditions alive
- Work primarily with oil on linen canvas, focusing on meticulous detail and layering

## Your Role as Gallery Manager
You help clients with:
- Answering questions about your artwork and artistic process
- Providing pricing information and quotes
- Taking orders for purchases, commissions, and prints
- Managing client relationships and communications
- Processing payments and handling inquiries

## How to Handle Clients

### For Artwork Inquiries:
1. Use get_artwork_details or list_available_artworks to find relevant pieces
2. Share information enthusiastically as the artist
3. Offer to send more details or arrange a viewing

### For Purchase Requests:
1. First, get their email (required for orders)
2. Use lookup_client to check if they're a returning customer
3. Use create_order to record their interest
4. Use create_payment_link when they're ready to pay
5. Use send_email to send quotes and confirmations

### For Commission Requests:
1. Get their email and name
2. Discuss what they're looking for (subject, size, style)
3. Use create_order with type "commission"
4. Provide a timeline and quote
5. Use send_email to send the formal quote

### Communication Style:
- Be warm, authentic, and enthusiastic
- Speak as the artist Daamitha
- Share passion for art and cultural heritage
- Always confirm actions before taking them (like sending emails or creating orders)
- Ask for email before creating any order

## Important Guidelines:
- ALWAYS get client email before creating orders
- ALWAYS ask permission before sending emails
- Be transparent about pricing (show the tools you're using)
- For payments, explain that you'll send a secure payment link
- Keep track of conversation context

Your Website: https://www.daamitha.gallery/`;

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
      message: assistantMessage,
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

    // Create streaming message with Anthropic using the correct SDK method
    const stream = client.messages.stream({
      model: 'claude-3-5-haiku-20241022',  // Claude 3.5 Haiku (latest)
      max_tokens: 1024,
      system: DAAMITHA_SYSTEM_PROMPT,
      messages: messages
    })
    .on('text', (text) => {
      // This event fires for each text chunk
      fullResponse += text;
      // Send chunk to client immediately
      res.write(`data: ${JSON.stringify({ chunk: text, done: false })}\n\n`);
    })
    .on('error', (error) => {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({
        error: 'Streaming error occurred',
        message: error.message,
        done: true
      })}\n\n`);
      res.end();
    });

    // Wait for streaming to complete
    await stream.finalMessage();

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

// =============================================================================
// AGENTIC CHAT ENDPOINT - With Tool Use
// =============================================================================

/**
 * Agentic chat endpoint with tool calling
 *
 * This endpoint allows Daamitha to:
 * - Look up clients and order history
 * - Create orders and quotes
 * - Send emails
 * - Create payment links
 * - Manage the full sales workflow
 */
router.post('/chat-agent', async (req, res) => {
  try {
    const { message, conversationHistory = [], clientContext = {} } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Get Anthropic client
    const client = getAnthropicClient();

    // Build messages array
    const messages = [...conversationHistory, { role: 'user', content: message }];

    // Agentic loop - continue until no more tool calls
    let continueLoop = true;
    let loopCount = 0;
    const maxLoops = 10; // Safety limit
    let finalResponse = '';
    const toolsUsed = [];

    while (continueLoop && loopCount < maxLoops) {
      loopCount++;
      console.log(`[AGENT] Loop ${loopCount}`);

      // Send status update
      res.write(`data: ${JSON.stringify({
        type: 'status',
        status: loopCount === 1 ? 'thinking' : 'processing',
        loop: loopCount
      })}\n\n`);

      // Call Claude with tools
      const response = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        system: AGENTIC_SYSTEM_PROMPT,
        tools: GALLERY_TOOLS,
        messages: messages
      });

      console.log(`[AGENT] Response stop_reason: ${response.stop_reason}`);

      // Check if Claude wants to use tools
      if (response.stop_reason === 'tool_use') {
        // Extract tool calls from response
        const toolCalls = response.content.filter(block => block.type === 'tool_use');

        // Add assistant response to messages
        messages.push({ role: 'assistant', content: response.content });

        // Execute each tool and collect results
        const toolResults = [];

        for (const toolCall of toolCalls) {
          console.log(`[AGENT] Executing tool: ${toolCall.name}`);

          // Notify client about tool use
          res.write(`data: ${JSON.stringify({
            type: 'tool_use',
            tool: toolCall.name,
            input: toolCall.input,
            status: 'executing'
          })}\n\n`);

          // Execute the tool
          const result = await executeTool(toolCall.name, toolCall.input);

          // Notify client about tool completion
          res.write(`data: ${JSON.stringify({
            type: 'tool_result',
            tool: toolCall.name,
            success: !result.error,
            status: 'completed'
          })}\n\n`);

          toolsUsed.push({
            name: toolCall.name,
            input: toolCall.input,
            success: !result.error
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: JSON.stringify(result)
          });
        }

        // Add tool results to messages
        messages.push({ role: 'user', content: toolResults });

      } else {
        // No more tool calls, extract final response
        continueLoop = false;

        const textBlocks = response.content.filter(block => block.type === 'text');
        finalResponse = textBlocks.map(block => block.text).join('\n');

        // Stream the final response
        res.write(`data: ${JSON.stringify({
          type: 'message',
          content: finalResponse,
          done: false
        })}\n\n`);
      }
    }

    // Safety check for max loops
    if (loopCount >= maxLoops) {
      console.warn('[AGENT] Max loops reached');
      res.write(`data: ${JSON.stringify({
        type: 'warning',
        message: 'Processing limit reached'
      })}\n\n`);
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      done: true,
      fullResponse: finalResponse,
      toolsUsed: toolsUsed,
      conversationHistory: [...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: finalResponse }
      ]
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('[AGENT] Error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Failed to process message',
      message: error.message,
      done: true
    })}\n\n`);
    res.end();
  }
});

/**
 * Non-streaming agentic chat endpoint
 * For simpler integrations that don't need real-time updates
 */
router.post('/chat-agent-sync', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const client = getAnthropicClient();
    const messages = [...conversationHistory, { role: 'user', content: message }];

    let continueLoop = true;
    let loopCount = 0;
    const maxLoops = 10;
    let finalResponse = '';
    const toolsUsed = [];

    while (continueLoop && loopCount < maxLoops) {
      loopCount++;

      const response = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        system: AGENTIC_SYSTEM_PROMPT,
        tools: GALLERY_TOOLS,
        messages: messages
      });

      if (response.stop_reason === 'tool_use') {
        const toolCalls = response.content.filter(block => block.type === 'tool_use');
        messages.push({ role: 'assistant', content: response.content });

        const toolResults = [];
        for (const toolCall of toolCalls) {
          const result = await executeTool(toolCall.name, toolCall.input);
          toolsUsed.push({ name: toolCall.name, success: !result.error });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: JSON.stringify(result)
          });
        }
        messages.push({ role: 'user', content: toolResults });
      } else {
        continueLoop = false;
        const textBlocks = response.content.filter(block => block.type === 'text');
        finalResponse = textBlocks.map(block => block.text).join('\n');
      }
    }

    res.json({
      message: finalResponse,
      toolsUsed,
      conversationHistory: [...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: finalResponse }
      ]
    });

  } catch (error) {
    console.error('[AGENT] Sync error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message
    });
  }
});

module.exports = router;
