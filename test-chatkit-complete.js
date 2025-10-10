const { chromium } = require('playwright');

/**
 * Comprehensive ChatKit Integration Test
 *
 * This test validates the complete ChatKit integration:
 * 1. Page loads successfully
 * 2. ChatKit button appears
 * 3. Chat window opens when clicked
 * 4. User can send a message
 * 5. Assistant responds to the message
 * 6. Styling matches site design
 */

async function testChatKitIntegration() {
    console.log('🧪 Starting Comprehensive ChatKit Integration Test\n');
    console.log('=' .repeat(60));

    const browser = await chromium.launch({
        headless: true, // Run in headless mode for CI/Codespaces
        slowMo: 100 // Slow down actions slightly
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Track console messages and errors
    const consoleMessages = [];
    const errors = [];

    page.on('console', msg => {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
        console.log(`[Browser ${msg.type()}]`, msg.text());
    });

    page.on('pageerror', error => {
        errors.push(error.message);
        console.error(`[Browser error]`, error.message);
    });

    try {
        // ============================================
        // TEST 1: Page Load
        // ============================================
        console.log('\n📍 TEST 1: Loading page...');
        const response = await page.goto('http://localhost:3000', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        if (!response.ok()) {
            throw new Error(`Page failed to load: ${response.status()} ${response.statusText()}`);
        }
        console.log('✅ Page loaded successfully');

        // Wait for page content to render
        await page.waitForSelector('.hero', { timeout: 10000 });
        console.log('✅ Main content rendered');

        // ============================================
        // TEST 2: ChatKit Script Load
        // ============================================
        console.log('\n📍 TEST 2: Checking ChatKit script load...');

        // Wait a bit for the ES module to load
        await page.waitForTimeout(3000);

        // Check if ChatKit initialization message appears
        const chatkitInitialized = consoleMessages.some(msg =>
            msg.text.includes('ChatKit initialized')
        );

        if (chatkitInitialized) {
            console.log('✅ ChatKit initialized successfully');
        } else {
            console.log('⚠️  ChatKit initialization message not found (may still be loading)');
        }

        // ============================================
        // TEST 3: ChatKit Button Presence
        // ============================================
        console.log('\n📍 TEST 3: Checking for ChatKit button...');

        // Try multiple possible selectors for ChatKit button
        const possibleSelectors = [
            '.openai-chatkit-button',
            '[class*="chatkit"]',
            '[class*="chat-button"]',
            'button[class*="openai"]',
            '#chatkit-button',
            '[aria-label*="chat" i]'
        ];

        let chatButton = null;
        for (const selector of possibleSelectors) {
            try {
                chatButton = await page.waitForSelector(selector, { timeout: 5000 });
                if (chatButton) {
                    console.log(`✅ ChatKit button found with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }

        if (!chatButton) {
            console.log('❌ ChatKit button not found with any known selector');
            console.log('\n🔍 Searching for all buttons on page:');
            const allButtons = await page.$$('button');
            console.log(`Found ${allButtons.length} buttons total`);

            for (let i = 0; i < allButtons.length; i++) {
                const buttonText = await allButtons[i].textContent();
                const buttonClass = await allButtons[i].getAttribute('class');
                console.log(`  Button ${i + 1}: "${buttonText}" (class: ${buttonClass})`);
            }

            throw new Error('ChatKit button not found on page');
        }

        // Check button styling
        const buttonStyles = await chatButton.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
                background: styles.background,
                borderRadius: styles.borderRadius,
                fontFamily: styles.fontFamily
            };
        });
        console.log('📊 Button styles:', buttonStyles);

        // ============================================
        // TEST 4: Open Chat Window
        // ============================================
        console.log('\n📍 TEST 4: Opening chat window...');

        await chatButton.click();
        console.log('✅ Clicked chat button');

        // Wait for chat window to appear
        await page.waitForTimeout(2000);

        const chatWindow = await page.$('.openai-chatkit-window, [class*="chatkit-window"], [class*="chat-window"]');

        if (!chatWindow) {
            console.log('❌ Chat window did not open');
            // Take screenshot for debugging
            await page.screenshot({ path: '/workspaces/dm/chatkit-debug.png', fullPage: true });
            console.log('📸 Screenshot saved to chatkit-debug.png');
            throw new Error('Chat window did not appear after clicking button');
        }

        console.log('✅ Chat window opened successfully');

        // ============================================
        // TEST 5: Check Welcome Message
        // ============================================
        console.log('\n📍 TEST 5: Checking welcome message...');

        await page.waitForTimeout(1000);

        const messages = await page.$$('.openai-chatkit-message, [class*="message"]');
        console.log(`Found ${messages.length} messages in chat`);

        if (messages.length > 0) {
            const welcomeText = await messages[0].textContent();
            console.log(`📝 Welcome message: "${welcomeText}"`);

            if (welcomeText.includes('Namaste') || welcomeText.includes('Daamitha')) {
                console.log('✅ Custom welcome message displayed');
            }
        }

        // ============================================
        // TEST 6: Send a Test Message
        // ============================================
        console.log('\n📍 TEST 6: Sending test message...');

        const inputSelectors = [
            '.openai-chatkit-input',
            'input[placeholder*="Ask"]',
            'input[type="text"]',
            'textarea'
        ];

        let chatInput = null;
        for (const selector of inputSelectors) {
            try {
                chatInput = await page.$(selector);
                if (chatInput) {
                    console.log(`✅ Found input field with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }

        if (!chatInput) {
            console.log('❌ Chat input field not found');
            throw new Error('Could not find chat input field');
        }

        // Type a test message
        const testMessage = 'Tell me about Daamitha\'s artwork';
        await chatInput.fill(testMessage);
        console.log(`✅ Typed message: "${testMessage}"`);

        // Find and click send button
        const sendButton = await page.$('.openai-chatkit-send-button, button[aria-label*="send" i], button[type="submit"]');

        if (sendButton) {
            await sendButton.click();
            console.log('✅ Clicked send button');
        } else {
            // Try pressing Enter as fallback
            await chatInput.press('Enter');
            console.log('✅ Pressed Enter to send');
        }

        // ============================================
        // TEST 7: Wait for AI Response
        // ============================================
        console.log('\n📍 TEST 7: Waiting for AI response...');
        console.log('⏳ This may take 10-30 seconds...');

        const messageCountBefore = messages.length;
        let responseReceived = false;
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds

        while (!responseReceived && attempts < maxAttempts) {
            await page.waitForTimeout(1000);
            attempts++;

            const currentMessages = await page.$$('.openai-chatkit-message, [class*="message"]');

            if (currentMessages.length > messageCountBefore) {
                responseReceived = true;
                const lastMessage = currentMessages[currentMessages.length - 1];
                const responseText = await lastMessage.textContent();
                console.log(`\n✅ AI Response received after ${attempts} seconds:`);
                console.log(`📝 "${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}"`);

                // Check if response mentions Daamitha or art
                if (responseText.toLowerCase().includes('daamitha') ||
                    responseText.toLowerCase().includes('art') ||
                    responseText.toLowerCase().includes('painting')) {
                    console.log('✅ Response is relevant to the query');
                } else {
                    console.log('⚠️  Response may not be relevant to the query');
                }
            } else {
                process.stdout.write(`\r⏳ Waiting... ${attempts}s`);
            }
        }

        if (!responseReceived) {
            console.log('\n❌ No response received within timeout period');
            console.log('This could mean:');
            console.log('  - Workflow ID is incorrect');
            console.log('  - Domain key is not authorized');
            console.log('  - OpenAI API is experiencing issues');
            console.log('  - Network connectivity problems');
        }

        // ============================================
        // TEST 8: Visual Styling Check
        // ============================================
        console.log('\n📍 TEST 8: Checking visual styling...');

        const headerStyles = await page.evaluate(() => {
            const header = document.querySelector('.openai-chatkit-header, [class*="chatkit-header"]');
            if (!header) return null;
            const styles = window.getComputedStyle(header);
            return {
                background: styles.background,
                color: styles.color,
                fontFamily: styles.fontFamily
            };
        });

        if (headerStyles) {
            console.log('📊 Header styles:', headerStyles);

            if (headerStyles.fontFamily.includes('Crimson Text')) {
                console.log('✅ Custom font family applied');
            }
            if (headerStyles.background.includes('gradient')) {
                console.log('✅ Custom gradient background applied');
            }
        }

        // ============================================
        // TEST SUMMARY
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Page Load: SUCCESS`);
        console.log(`${chatkitInitialized ? '✅' : '⚠️ '} ChatKit Initialization: ${chatkitInitialized ? 'SUCCESS' : 'UNCERTAIN'}`);
        console.log(`${chatButton ? '✅' : '❌'} Button Appearance: ${chatButton ? 'SUCCESS' : 'FAILED'}`);
        console.log(`${chatWindow ? '✅' : '❌'} Window Open: ${chatWindow ? 'SUCCESS' : 'FAILED'}`);
        console.log(`${chatInput ? '✅' : '❌'} Message Input: ${chatInput ? 'SUCCESS' : 'FAILED'}`);
        console.log(`${responseReceived ? '✅' : '❌'} AI Response: ${responseReceived ? 'SUCCESS' : 'FAILED'}`);
        console.log(`${errors.length === 0 ? '✅' : '❌'} No Errors: ${errors.length === 0 ? 'SUCCESS' : `FAILED (${errors.length} errors)`}`);

        console.log('\n📝 Console Messages:', consoleMessages.length);
        console.log('❌ Errors:', errors.length);

        if (errors.length > 0) {
            console.log('\nErrors encountered:');
            errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
        }

        // Take final screenshot
        await page.screenshot({ path: '/workspaces/dm/chatkit-final.png', fullPage: true });
        console.log('\n📸 Final screenshot saved to chatkit-final.png');

        // Keep browser open for manual inspection
        console.log('\n⏸️  Browser will remain open for 30 seconds for manual inspection...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);

        // Take error screenshot
        try {
            await page.screenshot({ path: '/workspaces/dm/chatkit-error.png', fullPage: true });
            console.log('📸 Error screenshot saved to chatkit-error.png');
        } catch (e) {
            // Ignore screenshot errors
        }

        throw error;
    } finally {
        await browser.close();
        console.log('\n✅ Test completed');
    }
}

// Run the test
testChatKitIntegration()
    .then(() => {
        console.log('\n🎉 All tests completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Test suite failed:', error.message);
        process.exit(1);
    });
