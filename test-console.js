const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Capture console messages
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Wait a bit to see if any delayed errors appear
  await page.waitForTimeout(5000);

  // Check for any elements with large white backgrounds
  const whiteElements = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    const large = [];
    all.forEach(el => {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      const rect = el.getBoundingClientRect();
      if ((bg === 'rgb(255, 255, 255)' || bg === 'white') &&
          (rect.width > 500 || rect.height > 500)) {
        large.push({
          tag: el.tagName,
          className: el.className,
          id: el.id,
          width: rect.width,
          height: rect.height
        });
      }
    });
    return large;
  });

  console.log('\nLarge white elements:', JSON.stringify(whiteElements, null, 2));

  await browser.close();
})();
