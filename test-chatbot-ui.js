const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting Chatbot UI Test...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error') {
      console.log(`❌ Browser Error: ${msg.text()}`);
    } else if (type === 'log') {
      console.log(`📝 Browser Log: ${msg.text()}`);
    }
  });

  // Enable request/response monitoring
  page.on('requestfailed', request => {
    console.log(`❌ Request Failed: ${request.url()} - ${request.failure().errorText}`);
  });

  page.on('response', async response => {
    if (response.url().includes('/api/agent/chat')) {
      console.log(`\n📡 API Response Status: ${response.status()}`);
      try {
        const data = await response.json();
        console.log(`✅ Response received (${data.response?.length || 0} chars)`);
        if (data.response) {
          console.log(`📄 First 200 chars: ${data.response.substring(0, 200)}...`);
        }
      } catch (e) {
        console.log(`❌ Failed to parse response: ${e.message}`);
      }
    }
  });

  try {
    // Navigate to the gallery
    console.log('🌐 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded successfully\n');

    // Wait for chat widget to be visible
    console.log('🔍 Looking for chat button...');
    await page.waitForSelector('#chat-button', { timeout: 5000 });
    console.log('✅ Chat button found\n');

    // Click the chat button to open the widget
    console.log('👆 Opening chat widget...');
    await page.click('#chat-button');
    await page.waitForSelector('#chat-window.open', { timeout: 5000 });
    console.log('✅ Chat widget opened\n');

    // Type a message
    const testMessage = 'Tell me about Daamitha\'s paintings';
    console.log(`📝 Typing message: "${testMessage}"`);
    await page.fill('#chat-input', testMessage);
    console.log('✅ Message typed\n');

    // Send the message
    console.log('📤 Sending message...');
    await page.click('#chat-send');
    console.log('✅ Message sent\n');

    // Wait for the response
    console.log('⏳ Waiting for AI response...');
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('.chat-message.assistant');
      const typingMessages = document.querySelectorAll('.chat-message.assistant.typing');
      return messages.length >= 2 && typingMessages.length === 0; // Initial greeting + new response, no typing indicator
    }, { timeout: 45000 });

    console.log('✅ Response received!\n');

    // Wait for send button to be enabled again
    await page.waitForFunction(() => {
      const sendButton = document.querySelector('#chat-send');
      return sendButton && !sendButton.disabled;
    }, { timeout: 5000 });

    // Get all chat messages
    const messages = await page.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.chat-message'));
      return msgs.map(msg => ({
        type: msg.classList.contains('user') ? 'user' : 'assistant',
        text: msg.textContent.substring(0, 150) + '...'
      }));
    });

    console.log('💬 Chat Messages:');
    messages.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.type}] ${msg.text}`);
    });

    // Test a follow-up message
    console.log('\n📝 Testing follow-up message...');
    const followUpMessage = 'What art styles does she use?';
    await page.fill('#chat-input', followUpMessage);
    await page.click('#chat-send');

    console.log('⏳ Waiting for follow-up response...');
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('.chat-message.assistant');
      const typingMessages = document.querySelectorAll('.chat-message.assistant.typing');
      return messages.length >= 3 && typingMessages.length === 0; // Initial + first response + second response, no typing
    }, { timeout: 45000 });

    console.log('✅ Follow-up response received!\n');

    // Final message count
    const finalMessages = await page.evaluate(() => {
      return document.querySelectorAll('.chat-message').length;
    });

    console.log(`\n✅ TEST PASSED! Total messages: ${finalMessages}`);
    console.log('🎉 Chatbot is working perfectly in the UI!\n');

  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${error.message}\n`);
    console.error(error.stack);

    // Take a screenshot for debugging
    await page.screenshot({ path: 'chatbot-error.png', fullPage: true });
    console.log('📸 Screenshot saved to chatbot-error.png');
  } finally {
    await browser.close();
  }
})();
