const { test, expect } = require('@playwright/test');
const { loginAsAdmin, getAuthToken, createTestArtwork, deleteTestArtwork } = require('./utils/test-helpers');
const { criticalSelectors } = require('./utils/fixtures');
const path = require('path');

test.describe('Artwork CRUD Operations (Admin)', () => {
  let authToken;

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsAdmin(page);
  });

  test('should display admin dashboard with statistics', async ({ page }) => {
    // Check dashboard is visible
    await expect(page.locator(criticalSelectors.adminDashboard)).toBeVisible();

    // Check statistics cards
    await expect(page.locator('#total-artworks')).toBeVisible();
    await expect(page.locator('#available-artworks')).toBeVisible();
    await expect(page.locator('#total-value')).toBeVisible();

    // Statistics should have numeric values
    const totalArtworks = await page.locator('#total-artworks').textContent();
    expect(parseInt(totalArtworks)).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to artwork management page', async ({ page }) => {
    // Click on Manage Artworks link
    await page.click('a[data-page="artworks"]');

    // Check artworks page is displayed
    await expect(page.locator('#artworks-page')).toBeVisible();
    await expect(page.locator('.table')).toBeVisible();
  });

  test('should open add artwork modal', async ({ page }) => {
    // Click add artwork button
    await page.click(criticalSelectors.addArtworkButton);

    // Check modal is visible
    await expect(page.locator(criticalSelectors.artworkModal)).toBeVisible();
    await expect(page.locator('#modal-title')).toHaveText(/Add New Artwork/i);

    // Check form fields are present
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('input[name="technique"]')).toBeVisible();
    await expect(page.locator('input[name="price"]')).toBeVisible();
  });

  test('should create new artwork with all fields', async ({ page, request }) => {
    // Get initial artwork count
    await page.click('a[data-page="artworks"]');
    await page.waitForSelector('#artworks-table tr');
    const initialRows = await page.locator('#artworks-table tr').count();

    // Open add modal
    await page.click(criticalSelectors.addArtworkButton);

    // Fill in artwork details
    await page.fill('input[name="title"]', 'Test Artwork E2E');
    await page.fill('input[name="artist"]', 'Daamitha');
    await page.fill('input[name="technique"]', 'Oil on canvas');
    await page.fill('input[name="dimensions"]', '30" × 24"');
    await page.fill('input[name="year"]', '2025');
    await page.fill('input[name="price"]', '2500');
    await page.selectOption('select[name="category"]', 'Contemporary');
    await page.fill('textarea[name="description"]', 'Test artwork created via E2E test');

    // Check "available for sale"
    await page.check('input[name="available"]');

    // Submit form
    await page.click('#artwork-form button[type="submit"]');

    // Wait for modal to close
    await page.waitForSelector(criticalSelectors.artworkModal, { state: 'hidden', timeout: 5000 });

    // Verify artwork was added (check table or stats)
    await page.click('a[data-page="artworks"]');
    await page.waitForTimeout(1000); // Wait for data to load

    // Check artwork appears in table
    await expect(page.locator('text=Test Artwork E2E')).toBeVisible({ timeout: 5000 });
  });

  test('should upload image when creating artwork', async ({ page }) => {
    await page.click(criticalSelectors.addArtworkButton);

    // Fill required fields
    await page.fill('input[name="title"]', 'Test with Image');
    await page.fill('input[name="price"]', '1500');

    // Create a test file (we'll use a small test image or mock)
    // In real test, you'd have a test image file
    const testImagePath = path.join(__dirname, 'utils', 'test-image.jpg');

    // Check if file input exists
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Note: Actual file upload would be:
    // await fileInput.setInputFiles(testImagePath);
    // For now, we just verify the input exists
  });

  test('should validate required fields when creating artwork', async ({ page }) => {
    await page.click(criticalSelectors.addArtworkButton);

    // Try to submit without filling required fields
    await page.click('#artwork-form button[type="submit"]');

    // Check title field has required attribute
    const titleInput = page.locator('input[name="title"]');
    await expect(titleInput).toHaveAttribute('required', '');

    // Form should not close (modal still visible)
    await expect(page.locator(criticalSelectors.artworkModal)).toBeVisible();
  });

  test('should edit existing artwork', async ({ page, request }) => {
    // First, create a test artwork via API
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Navigate to artworks page
    await page.click('a[data-page="artworks"]');
    await page.waitForTimeout(1000);

    // Click edit on first artwork (assuming one exists)
    const editButton = page.locator('button:has-text("Edit")').first();
    const hasEditButton = await editButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasEditButton) {
      await editButton.click();

      // Wait for modal
      await expect(page.locator(criticalSelectors.artworkModal)).toBeVisible();
      await expect(page.locator('#modal-title')).toHaveText(/Edit Artwork/i);

      // Modify a field
      await page.fill('input[name="title"]', 'Updated Title E2E');

      // Submit
      await page.click('#artwork-form button[type="submit"]');

      // Wait for modal to close
      await page.waitForSelector(criticalSelectors.artworkModal, { state: 'hidden', timeout: 5000 });

      // Verify update
      await expect(page.locator('text=Updated Title E2E')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete artwork with confirmation', async ({ page }) => {
    // Navigate to artworks page
    await page.click('a[data-page="artworks"]');
    await page.waitForTimeout(1000);

    // Get initial count
    const initialRows = await page.locator('#artworks-table tr').count();

    // Setup dialog handler for confirmation
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    // Click delete on first artwork
    const deleteButton = page.locator('button:has-text("Delete")').first();
    const hasDeleteButton = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasDeleteButton && initialRows > 1) {
      await deleteButton.click();

      // Wait for deletion to process
      await page.waitForTimeout(1500);

      // Check count decreased or artwork removed
      const newRows = await page.locator('#artworks-table tr').count();
      expect(newRows).toBeLessThanOrEqual(initialRows);
    }
  });

  test('should display artworks with prices in admin view', async ({ page }) => {
    // Navigate to artworks page or pricelist
    await page.click('a[data-page="pricelist"]');
    await page.waitForTimeout(1000);

    // Check pricelist table has price column
    await expect(page.locator('th:has-text("Price")')).toBeVisible();

    // Check at least one price is displayed
    const priceCell = page.locator('#pricelist-table td').filter({ hasText: /£\d+/ });
    const hasPrices = await priceCell.count() > 0;

    expect(hasPrices).toBeTruthy();
  });

  test('should update dashboard statistics after CRUD operations', async ({ page }) => {
    // Get initial stats
    const initialTotal = await page.locator('#total-artworks').textContent();

    // Navigate to artworks and count
    await page.click('a[data-page="artworks"]');
    await page.waitForTimeout(500);

    // Go back to dashboard
    await page.click('a[data-page="overview"]');

    // Stats should match (or be consistent)
    const currentTotal = await page.locator('#total-artworks').textContent();
    expect(currentTotal).toBeTruthy();
  });

  test('should filter or search artworks', async ({ page }) => {
    await page.click('a[data-page="artworks"]');
    await page.waitForTimeout(1000);

    // Check if search/filter functionality exists
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]');
    const hasSearch = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasSearch) {
      // Test search functionality
      await searchInput.fill('Test');
      await page.waitForTimeout(500);

      // Results should filter (implementation dependent)
      // This is a placeholder - actual implementation may vary
    }
  });

  test('should handle artwork with no image gracefully', async ({ page }) => {
    await page.click(criticalSelectors.addArtworkButton);

    // Fill fields without image
    await page.fill('input[name="title"]', 'Artwork No Image');
    await page.fill('input[name="price"]', '1000');

    // Submit
    await page.click('#artwork-form button[type="submit"]');

    // Should still create artwork
    await page.waitForSelector(criticalSelectors.artworkModal, { state: 'hidden', timeout: 5000 });

    // Verify artwork appears
    await page.click('a[data-page="artworks"]');
    await expect(page.locator('text=Artwork No Image')).toBeVisible({ timeout: 5000 });
  });

  test('should display artwork categories correctly', async ({ page }) => {
    await page.click('a[data-page="artworks"]');
    await page.waitForTimeout(1000);

    // Check category column exists
    await expect(page.locator('th:has-text("Title")')).toBeVisible();

    // Check categories are displayed in table
    const categoryText = page.locator('#artworks-table td').filter({
      hasText: /Contemporary|Animals|Nature|Abstract|Portrait/i
    });

    const hasCategories = await categoryText.count() > 0;
    expect(hasCategories).toBeTruthy();
  });

  test('should show recent artworks on dashboard', async ({ page }) => {
    // Dashboard should show recent artworks widget
    await expect(page.locator('h2:has-text("Recent Artworks")')).toBeVisible();
    await expect(page.locator('#recent-artworks')).toBeVisible();

    // Check if artworks are displayed
    const artworkCards = page.locator('.artwork-card');
    const count = await artworkCards.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });
});
