const { chromium } = require('playwright');

async function testChatKit() {
    console.log('🚀 Starting ChatKit integration test...\n');

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Collect console messages
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push({ type: msg.type(), text });
        console.log(`[Browser ${msg.type()}] ${text}`);
    });

    // Collect page errors
    const pageErrors = [];
    page.on('pageerror', error => {
        pageErrors.push(error.message);
        console.error(`[Page Error] ${error.message}`);
    });

    try {
        console.log('\n📄 Navigating to http://localhost:3000...');
        await page.goto('http://localhost:3000', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        console.log('\n⏳ Waiting 5 seconds for ChatKit to initialize...');
        await page.waitForTimeout(5000);

        // Check if ChatKit element exists
        console.log('\n🔍 Checking for ChatKit element...');
        const chatkitElement = await page.$('openai-chatkit');

        if (chatkitElement) {
            console.log('✅ ChatKit element found in DOM');

            // Get element properties
            const elementInfo = await chatkitElement.evaluate(el => ({
                tagName: el.tagName,
                isConnected: el.isConnected,
                hasSetOptions: typeof el.setOptions === 'function',
                childCount: el.children.length,
                innerHTML: el.innerHTML.substring(0, 200),
                computedStyle: {
                    display: window.getComputedStyle(el).display,
                    visibility: window.getComputedStyle(el).visibility,
                    position: window.getComputedStyle(el).position,
                    width: window.getComputedStyle(el).width,
                    height: window.getComputedStyle(el).height,
                    bottom: window.getComputedStyle(el).bottom,
                    right: window.getComputedStyle(el).right,
                }
            }));

            console.log('\n📊 ChatKit Element Info:');
            console.log(JSON.stringify(elementInfo, null, 2));

            // Check bounding box
            const boundingBox = await chatkitElement.boundingBox();
            if (boundingBox) {
                console.log('\n📐 Element Bounding Box:');
                console.log(JSON.stringify(boundingBox, null, 2));
            } else {
                console.log('\n⚠️  Element has no bounding box (might be invisible)');
            }

            // Take a screenshot
            console.log('\n📸 Taking screenshot...');
            await page.screenshot({
                path: '/workspaces/dm/chatkit-test-screenshot.png',
                fullPage: true
            });
            console.log('✅ Screenshot saved to chatkit-test-screenshot.png');

        } else {
            console.log('❌ ChatKit element NOT found in DOM');
        }

        // Check for ChatKit script
        console.log('\n🔍 Checking for ChatKit script...');
        const chatkitScript = await page.$('script[src*="chatkit"]');
        if (chatkitScript) {
            const src = await chatkitScript.getAttribute('src');
            console.log(`✅ ChatKit script found: ${src}`);
        } else {
            console.log('❌ ChatKit script NOT found');
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📋 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Console logs: ${consoleLogs.length}`);
        console.log(`Page errors: ${pageErrors.length}`);
        console.log(`ChatKit element: ${chatkitElement ? '✅ Found' : '❌ Not Found'}`);

        if (pageErrors.length > 0) {
            console.log('\n❌ Errors detected:');
            pageErrors.forEach(err => console.log(`  - ${err}`));
        }

        // Filter relevant console logs
        const relevantLogs = consoleLogs.filter(log =>
            log.text.toLowerCase().includes('chatkit') ||
            log.text.toLowerCase().includes('session') ||
            log.text.toLowerCase().includes('error') ||
            log.text.toLowerCase().includes('failed')
        );

        if (relevantLogs.length > 0) {
            console.log('\n📝 Relevant console logs:');
            relevantLogs.forEach(log => {
                console.log(`  [${log.type}] ${log.text}`);
            });
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    } finally {
        await browser.close();
        console.log('\n✅ Browser closed');
    }
}

// Run the test
testChatKit().catch(console.error);
