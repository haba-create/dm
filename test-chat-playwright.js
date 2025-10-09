const { chromium } = require('playwright');

async function testChatWidget() {
  console.log('🧪 Starting chat widget test...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error') {
      console.log(`❌ Browser error: ${msg.text()}`);
    }
  });

  // Catch page errors
  page.on('pageerror', error => {
    console.log(`❌ Page error: ${error.message}`);
  });

  // Catch network errors
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`❌ HTTP ${response.status()}: ${response.url()}`);
    }
  });

  try {
    // Navigate to the gallery
    console.log('📄 Loading page: http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded\n');

    // Wait for chat widget to initialize
    console.log('🔍 Waiting for chat widget...');
    await page.waitForSelector('#chat-toggle', { timeout: 5000 });
    console.log('✅ Chat toggle button found\n');

    // Open chat
    console.log('🖱️  Clicking chat toggle...');
    await page.click('#chat-toggle');
    await page.waitForSelector('#chat-window.open', { timeout: 2000 });
    console.log('✅ Chat window opened\n');

    // Type a message
    const testMessage = 'Hello, tell me about the gallery';
    console.log(`💬 Sending message: "${testMessage}"`);
    await page.fill('#chat-input', testMessage);

    // Listen for API request
    const requestPromise = page.waitForRequest(request =>
      request.url().includes('/api/agent/chat') && request.method() === 'POST'
    );

    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/agent/chat')
    );

    // Click send button
    await page.click('#chat-send');
    console.log('📤 Message sent\n');

    // Wait for request and response
    console.log('⏳ Waiting for API response...');
    const request = await requestPromise;
    const response = await responsePromise;

    console.log(`📨 Request URL: ${request.url()}`);
    console.log(`📊 Response status: ${response.status()}`);

    if (response.status() !== 200) {
      const responseBody = await response.text();
      console.log(`❌ Response body: ${responseBody}\n`);
      throw new Error(`API returned status ${response.status()}`);
    }

    const responseData = await response.json();
    console.log(`✅ Response received`);
    console.log(`📝 Agent response: ${responseData.response.substring(0, 100)}...\n`);

    // Wait for message to appear in UI
    console.log('🔍 Waiting for message in UI...');
    await page.waitForSelector('.assistant-message', { timeout: 5000 });
    console.log('✅ Message appeared in chat window\n');

    // Take screenshot
    await page.screenshot({ path: 'chat-test-success.png', fullPage: true });
    console.log('📸 Screenshot saved: chat-test-success.png\n');

    console.log('✅ ✅ ✅ All tests passed! Chat is working correctly.\n');

  } catch (error) {
    console.log(`\n❌ ❌ ❌ Test failed: ${error.message}\n`);

    // Take error screenshot
    await page.screenshot({ path: 'chat-test-error.png', fullPage: true });
    console.log('📸 Error screenshot saved: chat-test-error.png\n');

    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testChatWidget()
  .then(() => {
    console.log('🎉 Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  });
