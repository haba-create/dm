const { chromium } = require('playwright');

async function testInBrowser() {
    console.log('🌐 Testing ChatKit in headed browser mode...\n');

    const browser = await chromium.launch({
        headless: false, // Launch visible browser
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
        await page.goto('http://localhost:3000');

        console.log('⏳ Waiting 10 seconds for ChatKit...');
        await page.waitForTimeout(10000);

        // Check for element
        const chatkitElement = await page.$('openai-chatkit');
        console.log(`\nChatKit element: ${chatkitElement ? '✅ Found' : '❌ Not Found'}`);

        // Take screenshot
        await page.screenshot({ path: '/workspaces/dm/browser-test.png', fullPage: true });
        console.log('📸 Screenshot saved to browser-test.png');

        console.log('\n⏸️  Browser will remain open. Press Ctrl+C to close.');
        await page.waitForTimeout(300000); // Wait 5 minutes

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testInBrowser().catch(console.error);
