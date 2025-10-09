const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport size
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Navigate to the site
  await page.goto('http://localhost:3000');

  // Wait for page to load
  await page.waitForTimeout(3000);

  // Take full page screenshot
  await page.screenshot({ path: 'website-screenshot.png', fullPage: true });

  console.log('Screenshot saved to website-screenshot.png');

  await browser.close();
})();
