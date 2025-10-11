const { test, expect } = require('@playwright/test');
const { waitForGalleryLoad } = require('./utils/test-helpers');
const { criticalSelectors } = require('./utils/fixtures');

test.describe('Gallery Browsing (Public)', () => {

  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Daamitha.*Contemporary Oil Paintings/i);

    // Check main sections are visible
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('.about')).toBeVisible();
    await expect(page.locator('.gallery-section')).toBeVisible();
  });

  test('should display navigation menu', async ({ page }) => {
    await page.goto('/');

    // Check logo
    await expect(page.locator(criticalSelectors.logo)).toBeVisible();
    await expect(page.locator(criticalSelectors.logo)).toHaveText(/Daamitha/i);

    // Check navigation links (on desktop)
    const navLinks = page.locator(criticalSelectors.navLinks);
    const isVisible = await navLinks.isVisible();

    if (isVisible) {
      // Desktop navigation - use more specific selectors
      await expect(page.locator('.nav-links a[href="#home"]')).toBeVisible();
      await expect(page.locator('.nav-links a[href="#gallery"]')).toBeVisible();
      await expect(page.locator('.nav-links a[href="#about"]')).toBeVisible();
      await expect(page.locator('.nav-links a[href="#contact"]')).toBeVisible();
    }
  });

  test('should display hero section with artist info', async ({ page }) => {
    await page.goto('/');

    // Check hero content
    await expect(page.locator(criticalSelectors.heroTitle)).toBeVisible();
    await expect(page.locator(criticalSelectors.heroTitle)).toHaveText(/Daamitha/i);

    // Check subtitle
    await expect(page.locator('.hero-subtitle')).toBeVisible();

    // Check CTA buttons
    await expect(page.locator(criticalSelectors.ctaButton).first()).toBeVisible();
  });

  test('should load and display artworks in gallery', async ({ page }) => {
    await page.goto('/');

    // Scroll to gallery section
    await page.locator('#gallery').scrollIntoViewIfNeeded();

    // Wait for gallery to load
    await waitForGalleryLoad(page);

    // Check artworks are displayed
    const artworkItems = page.locator(criticalSelectors.artworkItem);
    const count = await artworkItems.count();

    expect(count).toBeGreaterThan(0);

    // Check first artwork has required elements
    const firstArtwork = artworkItems.first();
    await expect(firstArtwork.locator(criticalSelectors.artworkImage)).toBeVisible();
    await expect(firstArtwork.locator(criticalSelectors.artworkTitle)).toBeVisible();
  });

  test('should NOT display prices for public users', async ({ page }) => {
    await page.goto('/');

    // Wait for gallery to load
    await page.locator('#gallery').scrollIntoViewIfNeeded();
    await waitForGalleryLoad(page);

    // Check that price elements show "Inquire for pricing" instead of actual prices
    const priceElements = page.locator('.artwork-price');
    const count = await priceElements.count();

    // Prices should exist but show inquiry text
    if (count > 0) {
      const firstPriceText = await priceElements.first().textContent();
      // Should contain "Inquire" or not show actual price numbers starting with £
      const hasInquireText = firstPriceText.toLowerCase().includes('inquire') ||
                             !firstPriceText.match(/£\d+/);
      expect(hasInquireText).toBeTruthy();
    }
  });

  test('should display artwork details', async ({ page }) => {
    await page.goto('/');

    await page.locator('#gallery').scrollIntoViewIfNeeded();
    await waitForGalleryLoad(page);

    const firstArtwork = page.locator(criticalSelectors.artworkItem).first();

    // Check artwork has title
    const title = await firstArtwork.locator(criticalSelectors.artworkTitle).textContent();
    expect(title).toBeTruthy();

    // Check artwork has details (dimensions, technique, etc.)
    const hasDetails = await firstArtwork.locator('.artwork-details').isVisible();
    expect(hasDetails).toBeTruthy();
  });

  test('should have smooth scroll navigation', async ({ page }) => {
    await page.goto('/');

    // Click gallery link
    await page.click('.nav-links a[href="#gallery"]');

    // Wait for scroll animation
    await page.waitForTimeout(1000);

    // Check if gallery section is in view
    const gallerySection = page.locator('#gallery');
    const isInView = await gallerySection.isVisible();

    expect(isInView).toBeTruthy();
  });

  test('should display about section with artist information', async ({ page }) => {
    await page.goto('/');

    await page.locator('#about').scrollIntoViewIfNeeded();

    // Check about section content
    await expect(page.locator('.about h2')).toBeVisible();
    await expect(page.locator('.about p').first()).toBeVisible();

    // Check cultural highlights
    await expect(page.locator('.highlight-card').first()).toBeVisible();
  });

  test('should display process section', async ({ page }) => {
    await page.goto('/');

    await page.locator('#process').scrollIntoViewIfNeeded();

    // Check process section
    await expect(page.locator('.process h2')).toBeVisible();
    await expect(page.locator('.process-steps')).toBeVisible();

    // Check process images
    const processImages = page.locator('.process-image');
    const imageCount = await processImages.count();
    expect(imageCount).toBeGreaterThan(0);
  });

  test('should display heritage section', async ({ page }) => {
    await page.goto('/');

    await page.locator('#heritage').scrollIntoViewIfNeeded();

    // Check heritage content
    await expect(page.locator('.heritage h2')).toBeVisible();
    await expect(page.locator('.heritage p').first()).toBeVisible();
  });

  test('should display contact section', async ({ page }) => {
    await page.goto('/');

    await page.locator('#contact').scrollIntoViewIfNeeded();

    // Check contact section
    await expect(page.locator('.contact h2')).toBeVisible();
    await expect(page.locator('.contact-card').first()).toBeVisible();
  });

  test('should have working pricelist link', async ({ page }) => {
    await page.goto('/');

    // Click pricelist link
    await page.click('a[href="/pricelist"]');

    // Should navigate to pricelist page
    await expect(page).toHaveURL(/.*pricelist/);
  });

  test('should load all artwork images successfully', async ({ page }) => {
    await page.goto('/');

    await page.locator('#gallery').scrollIntoViewIfNeeded();
    await waitForGalleryLoad(page);

    // Get all artwork images
    const images = page.locator(criticalSelectors.artworkImage);
    const count = await images.count();

    // Check each image loaded
    for (let i = 0; i < Math.min(count, 5); i++) { // Check first 5 images
      const img = images.nth(i);
      await img.scrollIntoViewIfNeeded();

      // Check if image has valid src
      const src = await img.getAttribute('src');
      expect(src).toBeTruthy();

      // Check if image loaded (naturalWidth > 0)
      const isLoaded = await img.evaluate((el) => {
        return el.complete && el.naturalWidth > 0;
      });
      expect(isLoaded).toBeTruthy();
    }
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/');

    // Check viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');

    // Check page has title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should display footer', async ({ page }) => {
    await page.goto('/');

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Check footer is visible
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('footer').locator('text=/Daamitha/i')).toBeVisible();
  });
});
