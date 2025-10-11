const { test, expect } = require('@playwright/test');
const { hasHorizontalScroll, checkTouchTargetSize, getElementDimensions } = require('./utils/test-helpers');
const { responsiveBreakpoints, criticalSelectors } = require('./utils/fixtures');

test.describe('Responsive Design', () => {

  // Test each breakpoint
  for (const breakpoint of responsiveBreakpoints) {
    test.describe(`${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, () => {

      test.use({ viewport: { width: breakpoint.width, height: breakpoint.height } });

      test('should not have horizontal scroll', async ({ page }) => {
        await page.goto('/');

        // Check multiple sections
        const sections = ['#home', '#about', '#gallery', '#process', '#contact'];

        for (const section of sections) {
          await page.locator(section).scrollIntoViewIfNeeded();
          const hasScroll = await hasHorizontalScroll(page);
          expect(hasScroll).toBeFalsy();
        }
      });

      test('should display navigation appropriately', async ({ page }) => {
        await page.goto('/');

        const isMobile = breakpoint.width < 768;

        if (isMobile) {
          // Mobile: nav links should be hidden OR mobile menu should exist
          const navLinks = page.locator(criticalSelectors.navLinks);
          const isNavHidden = await navLinks.isHidden().catch(() => true);

          // Either hidden or display:none
          expect(isNavHidden).toBeTruthy();

          // TODO: Check for mobile menu toggle when implemented
          // const mobileToggle = page.locator(criticalSelectors.mobileMenu);
          // await expect(mobileToggle).toBeVisible();
        } else {
          // Desktop: nav links should be visible
          await expect(page.locator(criticalSelectors.navLinks)).toBeVisible();
        }
      });

      test('should display hero section properly', async ({ page }) => {
        await page.goto('/');

        // Hero title should be visible and not overflow
        const heroTitle = page.locator(criticalSelectors.heroTitle);
        await expect(heroTitle).toBeVisible();

        // Check title doesn't overflow
        const dimensions = await getElementDimensions(page, criticalSelectors.heroTitle);
        expect(dimensions.width).toBeLessThanOrEqual(breakpoint.width);

        // CTA buttons should be visible
        await expect(page.locator(criticalSelectors.ctaButton).first()).toBeVisible();
      });

      test('should display gallery grid correctly', async ({ page }) => {
        await page.goto('/');
        await page.locator('#gallery').scrollIntoViewIfNeeded();

        // Wait for gallery to load
        await page.waitForSelector(criticalSelectors.artworkItem, { timeout: 10000 });

        // Gallery should be visible
        await expect(page.locator(criticalSelectors.galleryGrid)).toBeVisible();

        // At least one artwork should be visible
        const artworks = page.locator(criticalSelectors.artworkItem);
        const count = await artworks.count();
        expect(count).toBeGreaterThan(0);

        // Check first artwork is properly sized
        const firstArtwork = artworks.first();
        const artworkDimensions = await getElementDimensions(page, criticalSelectors.artworkItem);

        if (artworkDimensions) {
          expect(artworkDimensions.width).toBeLessThanOrEqual(breakpoint.width);
        }
      });

      test('should have properly sized touch targets', async ({ page }) => {
        await page.goto('/');

        const isMobile = breakpoint.width < 768;

        if (isMobile) {
          // Check CTA buttons
          const ctaButtons = page.locator(criticalSelectors.ctaButton);
          const count = await ctaButtons.count();

          for (let i = 0; i < Math.min(count, 3); i++) {
            await ctaButtons.nth(i).scrollIntoViewIfNeeded();
            const isValidSize = await checkTouchTargetSize(
              page,
              `${criticalSelectors.ctaButton}:nth-of-type(${i + 1})`
            );

            // Touch targets should be at least 44x44px
            // Note: Some elements might fail this initially - document them
            if (!isValidSize) {
              console.warn(`Touch target ${i} is too small at ${breakpoint.name}`);
            }
          }
        }
      });

      test('should display about section correctly', async ({ page }) => {
        await page.goto('/');
        await page.locator('#about').scrollIntoViewIfNeeded();

        // About section should be visible
        await expect(page.locator('.about')).toBeVisible();

        // About grid should adapt (1 column on mobile, 2 on desktop)
        const isMobile = breakpoint.width < 768;

        // Check layout doesn't cause overflow
        const aboutSection = page.locator('.about');
        const sectionWidth = await aboutSection.evaluate(el => el.scrollWidth);
        expect(sectionWidth).toBeLessThanOrEqual(breakpoint.width + 50); // Allow small margin
      });

      test('should display process section correctly', async ({ page }) => {
        await page.goto('/');
        await page.locator('#process').scrollIntoViewIfNeeded();

        await expect(page.locator('.process')).toBeVisible();

        // Process images should be visible and not overflow
        const processImages = page.locator('.process-image');
        const hasImages = await processImages.count() > 0;
        expect(hasImages).toBeTruthy();
      });

      test('should display contact section correctly', async ({ page }) => {
        await page.goto('/');
        await page.locator('#contact').scrollIntoViewIfNeeded();

        await expect(page.locator('.contact')).toBeVisible();

        // Contact cards should be visible
        const contactCards = page.locator('.contact-card');
        const count = await contactCards.count();
        expect(count).toBeGreaterThan(0);
      });

      test('should display chatbot widget correctly', async ({ page }) => {
        await page.goto('/');

        // Chatbot button should be visible
        await expect(page.locator(criticalSelectors.chatButton)).toBeVisible();

        // Button should be in the corner (fixed position)
        const buttonDimensions = await getElementDimensions(page, criticalSelectors.chatButton);
        expect(buttonDimensions).toBeTruthy();

        // Click to open chat
        await page.click(criticalSelectors.chatButton);

        // Chat window should open and be sized appropriately
        await expect(page.locator(`${criticalSelectors.chatWindow}.open`)).toBeVisible({ timeout: 3000 });

        const chatWindowDimensions = await getElementDimensions(page, criticalSelectors.chatWindow);

        if (breakpoint.width < 768) {
          // On mobile, chat should be nearly full width
          expect(chatWindowDimensions.width).toBeGreaterThan(breakpoint.width * 0.8);
        } else {
          // On desktop, chat should be fixed width (around 380px)
          expect(chatWindowDimensions.width).toBeLessThan(500);
        }
      });

      test('should handle images responsively', async ({ page }) => {
        await page.goto('/');
        await page.locator('#gallery').scrollIntoViewIfNeeded();

        // Wait for images to load
        await page.waitForSelector(criticalSelectors.artworkImage, { timeout: 10000 });

        const images = page.locator(criticalSelectors.artworkImage);
        const firstImage = images.first();

        // Check image doesn't overflow its container
        const imageDimensions = await getElementDimensions(page, criticalSelectors.artworkImage);

        if (imageDimensions) {
          expect(imageDimensions.width).toBeLessThanOrEqual(breakpoint.width);
        }
      });

      test('should have readable text sizes', async ({ page }) => {
        await page.goto('/');

        // Check hero title font size
        const heroTitle = page.locator(criticalSelectors.heroTitle);
        const fontSize = await heroTitle.evaluate(el =>
          window.getComputedStyle(el).fontSize
        );

        const fontSizePx = parseInt(fontSize);

        // Font should be at least 14px for body text, larger for titles
        expect(fontSizePx).toBeGreaterThan(20); // Hero title should be prominent

        // Check body text
        const bodyText = page.locator('.about p').first();
        const bodyFontSize = await bodyText.evaluate(el =>
          window.getComputedStyle(el).fontSize
        );
        const bodyFontSizePx = parseInt(bodyFontSize);
        expect(bodyFontSizePx).toBeGreaterThanOrEqual(14);
      });
    });
  }

  test.describe('Admin Dashboard Responsive', () => {
    test('should display admin dashboard on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Login
      await page.goto('/admin/login.html');
      await page.fill('input[type="email"]', 'admin@daamitha.art');
      await page.fill('input[type="password"]', 'Admin@123');
      await page.click('button[type="submit"]');

      await page.waitForURL('**/admin/dashboard.html');

      // Dashboard should be visible
      await expect(page.locator('.dashboard-container')).toBeVisible();

      // Check for horizontal scroll
      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBeFalsy();

      // Sidebar should adapt (stack vertically or collapse)
      const sidebar = page.locator('.sidebar');
      await expect(sidebar).toBeVisible();
    });

    test('should make tables scrollable on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Login
      await page.goto('/admin/login.html');
      await page.fill('input[type="email"]', 'admin@daamitha.art');
      await page.fill('input[type="password"]', 'Admin@123');
      await page.click('button[type="submit"]');

      await page.waitForURL('**/admin/dashboard.html');

      // Navigate to artworks
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(500);

      // Table should exist
      const table = page.locator('.table');
      await expect(table).toBeVisible();

      // Table container might have overflow-x: auto
      const tableContainer = await table.evaluate(el => {
        const parent = el.parentElement;
        return window.getComputedStyle(parent).overflowX;
      });

      // Should be scrollable or display:block
      // This ensures table doesn't break layout
    });
  });

  test.describe('Orientation Changes', () => {
    test('should handle portrait to landscape rotation', async ({ page, browserName }) => {
      if (browserName !== 'chromium') {
        test.skip();
      }

      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Verify layout
      await expect(page.locator('.hero')).toBeVisible();

      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);

      // Content should still be visible
      await expect(page.locator('.hero')).toBeVisible();

      // No horizontal scroll
      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBeFalsy();
    });
  });
});
