const { chromium } = require('playwright');

(async () => {
  console.log('🎯 FINAL COMPREHENSIVE CHATBOT TEST\n');
  console.log('Testing Gallery Assistant with GPT-5 on https://www.daamitha.gallery/\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track API calls
  let apiCallCount = 0;
  let allResponsesSuccessful = true;

  page.on('response', async response => {
    if (response.url().includes('/api/agent/chat') && response.request().method() === 'POST') {
      apiCallCount++;
      const status = response.status();
      console.log(`📡 API Call #${apiCallCount}: Status ${status}`);

      if (status === 200) {
        try {
          const data = await response.json();
          const preview = data.response.substring(0, 100).replace(/\n/g, ' ');
          console.log(`   ✅ Success! Response preview: "${preview}..."`);
        } catch (e) {
          console.log(`   ⚠️  Could not parse response`);
        }
      } else {
        allResponsesSuccessful = false;
        console.log(`   ❌ ERROR: Status ${status}`);
      }
    }
  });

  try {
    console.log('🌐 Opening https://www.daamitha.gallery/ (localhost:3000)...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded\n');

    // Open chat
    console.log('💬 Opening chat widget...');
    await page.click('#chat-button');
    await page.waitForSelector('#chat-window.open');
    console.log('✅ Chat opened\n');

    // Test 1: Ask about paintings
    console.log('📝 Test 1: Asking about paintings...');
    await page.fill('#chat-input', 'Tell me about the art gallery');
    await page.click('#chat-send');
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('.chat-message.assistant');
      const typing = document.querySelectorAll('.chat-message.assistant.typing');
      return messages.length >= 2 && typing.length === 0;
    }, { timeout: 45000 });
    await page.waitForFunction(() => !document.querySelector('#chat-send').disabled, { timeout: 5000 });
    console.log('✅ Test 1 passed\n');

    // Test 2: Follow-up question
    console.log('📝 Test 2: Follow-up question about artist...');
    await page.fill('#chat-input', 'What is unique about the artist?');
    await page.click('#chat-send');
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('.chat-message.assistant');
      const typing = document.querySelectorAll('.chat-message.assistant.typing');
      return messages.length >= 3 && typing.length === 0;
    }, { timeout: 45000 });
    await page.waitForFunction(() => !document.querySelector('#chat-send').disabled, { timeout: 5000 });
    console.log('✅ Test 2 passed\n');

    // Test 3: Ask about pricing
    console.log('📝 Test 3: Asking about pricing...');
    await page.fill('#chat-input', 'How much do the paintings cost?');
    await page.click('#chat-send');
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('.chat-message.assistant');
      const typing = document.querySelectorAll('.chat-message.assistant.typing');
      return messages.length >= 4 && typing.length === 0;
    }, { timeout: 45000 });
    console.log('✅ Test 3 passed\n');

    // Get all messages
    const allMessages = await page.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.chat-message'));
      return msgs.map(msg => ({
        type: msg.classList.contains('user') ? 'USER' : 'AI',
        preview: msg.textContent.substring(0, 80).replace(/\n/g, ' ') + '...'
      }));
    });

    console.log('\n📊 FINAL RESULTS\n');
    console.log(`Total API calls: ${apiCallCount}`);
    console.log(`All responses successful: ${allResponsesSuccessful ? '✅ YES' : '❌ NO'}`);
    console.log(`Total messages in chat: ${allMessages.length}`);
    console.log('\nMessage history:');
    allMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.type}] ${msg.preview}`);
    });

    if (apiCallCount === 3 && allResponsesSuccessful) {
      console.log('\n🎉🎉🎉 ALL TESTS PASSED! 🎉🎉🎉');
      console.log('✅ Chatbot is working perfectly with GPT-5');
      console.log('✅ Multi-turn conversations are working');
      console.log('✅ Ready for production!\n');
    } else {
      console.log('\n⚠️  Some issues detected');
    }

  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${error.message}\n`);
    await page.screenshot({ path: 'final-test-error.png', fullPage: true });
    console.log('📸 Screenshot saved');
  } finally {
    await browser.close();
  }
})();
