const { chromium } = require('playwright');

async function quickTest() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const errors = [];
    const logs = [];

    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => errors.push(err.message));

    console.log('Loading page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });

    // Wait a bit for JS to execute
    await page.waitForTimeout(3000);

    console.log('\n=== ERRORS ===');
    errors.forEach(e => console.log('❌', e));

    console.log('\n=== CONSOLE LOGS ===');
    logs.forEach(l => console.log(l));

    console.log('\n=== PAGE CHECKS ===');

    // Check if nav links work
    const navLinks = await page.$$('.nav-links a');
    console.log(`Nav links found: ${navLinks.length}`);

    // Check if gallery.js loaded
    const galleryLoaded = await page.evaluate(() => typeof window !== 'undefined');
    console.log(`Window object: ${galleryLoaded ? 'OK' : 'MISSING'}`);

    // Check if page has content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`Body has content: ${bodyText.length > 100 ? 'YES' : 'NO'}`);
    console.log(`Body preview: ${bodyText.substring(0, 200)}`);

    await browser.close();
}

quickTest().catch(console.error);
