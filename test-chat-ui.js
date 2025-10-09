const { chromium } = require('playwright');

async function testChatUI() {
    console.log('🎨 Testing Custom Gallery Chat UI...\n');

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Collect console messages
    page.on('console', msg => {
        console.log(`[Browser ${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', error => {
        console.error(`[Page Error] ${error.message}`);
    });

    try {
        console.log('📄 Navigating to http://localhost:3000...');
        await page.goto('http://localhost:3000', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        console.log('⏳ Waiting for chat widget to load...');
        await page.waitForTimeout(2000);

        // Check for chat toggle button
        const toggleButton = await page.$('#chat-toggle');
        console.log(`\n🔘 Chat toggle button: ${toggleButton ? '✅ Found' : '❌ Not Found'}`);

        if (toggleButton) {
            // Get button properties
            const isVisible = await toggleButton.isVisible();
            console.log(`   Visible: ${isVisible ? '✅ Yes' : '❌ No'}`);

            // Click to open chat
            console.log('\n🖱️  Clicking chat button to open...');
            await toggleButton.click();
            await page.waitForTimeout(500);

            // Check if chat window is open
            const chatWindow = await page.$('#chat-window');
            const hasOpenClass = await chatWindow?.evaluate(el => el.classList.contains('open'));
            console.log(`   Chat window open: ${hasOpenClass ? '✅ Yes' : '❌ No'}`);

            // Check for welcome message
            const welcomeMsg = await page.$('.welcome-message');
            console.log(`   Welcome message: ${welcomeMsg ? '✅ Found' : '❌ Not Found'}`);

            // Get welcome message text
            if (welcomeMsg) {
                const text = await welcomeMsg.textContent();
                console.log(`\n💬 Welcome message preview:\n   "${text.substring(0, 100)}..."`);
            }

            // Check chat input
            const chatInput = await page.$('#chat-input');
            console.log(`\n✍️  Chat input field: ${chatInput ? '✅ Found' : '❌ Not Found'}`);

            // Take screenshot
            console.log('\n📸 Taking screenshot of open chat...');
            await page.screenshot({
                path: '/workspaces/dm/chat-ui-open.png',
                fullPage: true
            });
            console.log('   Saved to: chat-ui-open.png');

            // Test sending a message
            if (chatInput) {
                console.log('\n🧪 Testing message send...');
                await chatInput.fill('Hello! Can you tell me about the gallery?');

                const sendButton = await page.$('#chat-send');
                await sendButton?.click();

                console.log('   Message sent, waiting for response...');
                await page.waitForTimeout(5000);

                // Check for assistant response
                const assistantMessages = await page.$$('.assistant-message');
                console.log(`   Assistant messages: ${assistantMessages.length > 1 ? '✅ Received' : '⏳ Waiting'}`);

                // Take final screenshot
                await page.screenshot({
                    path: '/workspaces/dm/chat-ui-conversation.png',
                    fullPage: true
                });
                console.log('   Final screenshot: chat-ui-conversation.png');
            }

        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ CHAT UI TEST COMPLETE');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    } finally {
        await browser.close();
        console.log('\n🔒 Browser closed');
    }
}

testChatUI().catch(console.error);
