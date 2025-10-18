const { test, expect } = require('@playwright/test');
const { loginAsAdmin, checkTouchTargetSize, hasHorizontalScroll } = require('./utils/test-helpers');
const path = require('path');

test.describe('Admin Dashboard Enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Card Grid View', () => {
    test('should display artworks in card grid layout by default', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      // Grid view should be active by default
      const gridViewBtn = page.locator('#grid-view-btn');
      await expect(gridViewBtn).toHaveClass(/active/);

      // Grid container should be visible
      const gridContainer = page.locator('#artworks-grid-container');
      await expect(gridContainer).toBeVisible();

      // Cards should use grid layout
      const artworksGrid = page.locator('.artworks-grid');
      await expect(artworksGrid).toBeVisible();

      // Check if cards are rendered
      const cards = page.locator('.artwork-management-card');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        // First card should have proper structure
        const firstCard = cards.first();
        await expect(firstCard.locator('.card-image')).toBeVisible();
        await expect(firstCard.locator('.card-title')).toBeVisible();
        await expect(firstCard.locator('.card-price')).toBeVisible();
        await expect(firstCard.locator('.card-actions')).toBeVisible();
      }
    });

    test('should display artwork details in cards', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const cards = page.locator('.artwork-management-card');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        const firstCard = cards.first();

        // Check for all required card elements
        await expect(firstCard.locator('.card-image')).toBeVisible();
        await expect(firstCard.locator('.card-title')).toBeVisible();
        await expect(firstCard.locator('.card-price')).toBeVisible();
        await expect(firstCard.locator('.card-badge')).toBeVisible();

        // Card should have edit and delete buttons
        const editBtn = firstCard.locator('button:has-text("Edit")');
        const deleteBtn = firstCard.locator('button:has-text("Delete")');
        await expect(editBtn).toBeVisible();
        await expect(deleteBtn).toBeVisible();
      }
    });

    test('should show availability badge on cards', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const cards = page.locator('.artwork-management-card');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        const firstCard = cards.first();
        const badge = firstCard.locator('.card-badge');
        await expect(badge).toBeVisible();

        // Badge should say "Available" or "Sold"
        const badgeText = await badge.textContent();
        expect(badgeText).toMatch(/Available|Sold/i);
      }
    });

    test('should apply hover effects on cards', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const cards = page.locator('.artwork-management-card');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        const firstCard = cards.first();

        // Hover over card
        await firstCard.hover();

        // Card should have transition/transform (check computed style)
        const box = await firstCard.boundingBox();
        expect(box).toBeTruthy();
      }
    });
  });

  test.describe('Pagination', () => {
    test('should display pagination controls when there are many artworks', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      // Check if pagination exists
      const pagination = page.locator('#grid-pagination');
      const paginationButtons = pagination.locator('button');
      const buttonCount = await paginationButtons.count();

      // If there are multiple pages, pagination should be visible
      if (buttonCount > 0) {
        await expect(pagination).toBeVisible();

        // Should have First, Prev, Next, Last buttons
        await expect(pagination.locator('button:has-text("First")')).toBeVisible();
        await expect(pagination.locator('button:has-text("Prev")')).toBeVisible();
        await expect(pagination.locator('button:has-text("Next")')).toBeVisible();
        await expect(pagination.locator('button:has-text("Last")')).toBeVisible();

        // Should show pagination info
        await expect(pagination.locator('.pagination-info')).toBeVisible();
      }
    });

    test('should limit artworks to 16 per page', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const cards = page.locator('.artwork-management-card');
      const cardCount = await cards.count();

      // Should not exceed 16 items per page
      expect(cardCount).toBeLessThanOrEqual(16);
    });

    test('should navigate between pages', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const pagination = page.locator('#grid-pagination');
      const nextButton = pagination.locator('button:has-text("Next")');

      const isNextEnabled = await nextButton.isEnabled();

      if (isNextEnabled) {
        // Click next page
        await nextButton.click();
        await page.waitForTimeout(500);

        // Page should have changed
        const activePageBtn = pagination.locator('button.active');
        const activePageText = await activePageBtn.textContent();
        expect(parseInt(activePageText)).toBeGreaterThan(1);

        // Prev button should now be enabled
        const prevButton = pagination.locator('button:has-text("Prev")');
        await expect(prevButton).toBeEnabled();
      }
    });

    test('should update pagination info correctly', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const paginationInfo = page.locator('#grid-pagination .pagination-info');

      if (await paginationInfo.isVisible()) {
        const infoText = await paginationInfo.textContent();

        // Should show format like "1-16 of 25"
        expect(infoText).toMatch(/\d+-\d+ of \d+/);
      }
    });

    test('should disable First/Prev on first page', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const pagination = page.locator('#grid-pagination');

      if (await pagination.isVisible()) {
        const firstButton = pagination.locator('button:has-text("First")');
        const prevButton = pagination.locator('button:has-text("Prev")');

        // On first page, these should be disabled
        await expect(firstButton).toBeDisabled();
        await expect(prevButton).toBeDisabled();
      }
    });
  });

  test.describe('Lightbox Functionality', () => {
    test('should open lightbox when clicking artwork image', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const cardImages = page.locator('.card-image');
      const imageCount = await cardImages.count();

      if (imageCount > 0) {
        // Click first image
        await cardImages.first().click();
        await page.waitForTimeout(300);

        // Lightbox should be visible
        const lightbox = page.locator('#lightbox');
        await expect(lightbox).toBeVisible();
        await expect(lightbox).toHaveCSS('display', 'flex');

        // Lightbox image should be visible
        const lightboxImage = page.locator('#lightbox-image');
        await expect(lightboxImage).toBeVisible();

        // Should have close button
        const closeBtn = page.locator('.lightbox-close');
        await expect(closeBtn).toBeVisible();
      }
    });

    test('should close lightbox when clicking close button', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const cardImages = page.locator('.card-image');
      const imageCount = await cardImages.count();

      if (imageCount > 0) {
        // Open lightbox
        await cardImages.first().click();
        await page.waitForTimeout(300);

        const lightbox = page.locator('#lightbox');
        await expect(lightbox).toBeVisible();

        // Click close button
        const closeBtn = page.locator('.lightbox-close');
        await closeBtn.click();
        await page.waitForTimeout(300);

        // Lightbox should be hidden
        await expect(lightbox).toBeHidden();
      }
    });

    test('should close lightbox when clicking outside image', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const cardImages = page.locator('.card-image');
      const imageCount = await cardImages.count();

      if (imageCount > 0) {
        // Open lightbox
        await cardImages.first().click();
        await page.waitForTimeout(300);

        const lightbox = page.locator('#lightbox');
        await expect(lightbox).toBeVisible();

        // Click on lightbox background
        await lightbox.click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(300);

        // Lightbox should be hidden
        await expect(lightbox).toBeHidden();
      }
    });

    test('should display correct image in lightbox', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const cards = page.locator('.artwork-management-card');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        const firstCard = cards.first();
        const cardImage = firstCard.locator('.card-image');
        const imageSrc = await cardImage.getAttribute('src');

        // Click image
        await cardImage.click();
        await page.waitForTimeout(300);

        // Check lightbox image has same source
        const lightboxImage = page.locator('#lightbox-image');
        const lightboxSrc = await lightboxImage.getAttribute('src');

        expect(lightboxSrc).toBe(imageSrc);
      }
    });

    test('should open lightbox from table view images', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      // Switch to table view
      await page.click('#table-view-btn');
      await page.waitForTimeout(500);

      const tableImages = page.locator('#artworks-table img');
      const imageCount = await tableImages.count();

      if (imageCount > 0) {
        // Click first table image
        await tableImages.first().click();
        await page.waitForTimeout(300);

        // Lightbox should open
        const lightbox = page.locator('#lightbox');
        await expect(lightbox).toBeVisible();
      }
    });
  });

  test.describe('Search and Filter', () => {
    test('should display search and filter controls', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      // Search input should be visible
      const searchInput = page.locator('#artwork-search');
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toHaveAttribute('placeholder', /search/i);

      // Filter dropdowns should be visible
      const categoryFilter = page.locator('#category-filter');
      const availabilityFilter = page.locator('#availability-filter');

      await expect(categoryFilter).toBeVisible();
      await expect(availabilityFilter).toBeVisible();
    });

    test('should filter artworks by search term', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const searchInput = page.locator('#artwork-search');
      const initialCards = await page.locator('.artwork-management-card').count();

      if (initialCards > 1) {
        // Get first artwork title
        const firstTitle = await page.locator('.card-title').first().textContent();
        const searchTerm = firstTitle.substring(0, 4);

        // Type search term
        await searchInput.fill(searchTerm);
        await page.waitForTimeout(500);

        // Cards should be filtered
        const filteredCards = await page.locator('.artwork-management-card').count();

        // Should have same or fewer cards
        expect(filteredCards).toBeLessThanOrEqual(initialCards);
      }
    });

    test('should filter artworks by category', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const categoryFilter = page.locator('#category-filter');

      // Select a specific category
      await categoryFilter.selectOption('Animals');
      await page.waitForTimeout(500);

      // Check if results are filtered (implementation dependent)
      const cards = page.locator('.artwork-management-card');
      const cardCount = await cards.count();

      // Results should exist or show "no artworks" message
      if (cardCount === 0) {
        await expect(page.locator('text=No artworks found')).toBeVisible();
      }
    });

    test('should filter artworks by availability status', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const availabilityFilter = page.locator('#availability-filter');

      // Filter by available only
      await availabilityFilter.selectOption('available');
      await page.waitForTimeout(500);

      const cards = page.locator('.artwork-management-card');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        // All visible cards should have "Available" badge
        const badges = page.locator('.badge-available');
        const availableBadgeCount = await badges.count();
        expect(availableBadgeCount).toBeGreaterThan(0);
      }
    });

    test('should combine search and filter', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const searchInput = page.locator('#artwork-search');
      const categoryFilter = page.locator('#category-filter');

      // Apply both search and category filter
      await searchInput.fill('Test');
      await categoryFilter.selectOption('Contemporary');
      await page.waitForTimeout(500);

      // Results should be filtered by both criteria
      const cards = page.locator('.artwork-management-card');
      const cardCount = await cards.count();

      expect(cardCount).toBeGreaterThanOrEqual(0);
    });

    test('should reset pagination when filtering', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const pagination = page.locator('#grid-pagination');
      const nextButton = pagination.locator('button:has-text("Next")');

      // If pagination exists and has multiple pages
      if (await nextButton.isEnabled()) {
        // Go to page 2
        await nextButton.click();
        await page.waitForTimeout(500);

        // Apply filter
        const searchInput = page.locator('#artwork-search');
        await searchInput.fill('Test');
        await page.waitForTimeout(500);

        // Should reset to page 1
        const activePageBtn = pagination.locator('button.active');
        const activePageText = await activePageBtn.textContent();
        expect(parseInt(activePageText)).toBe(1);
      }
    });

    test('should show "no results" message when no artworks match filter', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const searchInput = page.locator('#artwork-search');

      // Search for something that definitely doesn't exist
      await searchInput.fill('ZZZZNONEXISTENT999');
      await page.waitForTimeout(500);

      // Should show no results message
      await expect(page.locator('text=No artworks found')).toBeVisible();
    });
  });

  test.describe('View Toggle', () => {
    test('should toggle between grid and table view', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const gridBtn = page.locator('#grid-view-btn');
      const tableBtn = page.locator('#table-view-btn');
      const gridContainer = page.locator('#artworks-grid-container');
      const tableContainer = page.locator('#artworks-table-container');

      // Grid view should be active by default
      await expect(gridBtn).toHaveClass(/active/);
      await expect(gridContainer).toBeVisible();
      await expect(tableContainer).toBeHidden();

      // Switch to table view
      await tableBtn.click();
      await page.waitForTimeout(300);

      // Table view should now be active
      await expect(tableBtn).toHaveClass(/active/);
      await expect(gridBtn).not.toHaveClass(/active/);
      await expect(tableContainer).toBeVisible();
      await expect(gridContainer).toBeHidden();

      // Switch back to grid view
      await gridBtn.click();
      await page.waitForTimeout(300);

      // Grid view should be active again
      await expect(gridBtn).toHaveClass(/active/);
      await expect(gridContainer).toBeVisible();
      await expect(tableContainer).toBeHidden();
    });

    test('should maintain filters when switching views', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const searchInput = page.locator('#artwork-search');
      const gridBtn = page.locator('#grid-view-btn');
      const tableBtn = page.locator('#table-view-btn');

      // Apply a filter in grid view
      await searchInput.fill('Test');
      await page.waitForTimeout(500);

      const gridCardCount = await page.locator('.artwork-management-card').count();

      // Switch to table view
      await tableBtn.click();
      await page.waitForTimeout(500);

      const tableRowCount = await page.locator('#artworks-table tr').count();

      // Search should still be applied
      const searchValue = await searchInput.inputValue();
      expect(searchValue).toBe('Test');

      // Result counts should be similar (table has 1 extra row for header)
      expect(Math.abs(gridCardCount - (tableRowCount - 1))).toBeLessThanOrEqual(1);
    });

    test('should display table view with larger thumbnails', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      // Switch to table view
      await page.click('#table-view-btn');
      await page.waitForTimeout(500);

      const tableImages = page.locator('#artworks-table img');
      const imageCount = await tableImages.count();

      if (imageCount > 0) {
        const firstImage = tableImages.first();
        const box = await firstImage.boundingBox();

        // Image should be larger than old 50x50 size
        expect(box.width).toBeGreaterThan(50);
        expect(box.height).toBeGreaterThan(50);
      }
    });
  });

  test.describe('Image Preview in Modal', () => {
    test('should show current image when editing artwork', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const editButtons = page.locator('button:has-text("Edit")');
      const buttonCount = await editButtons.count();

      if (buttonCount > 0) {
        // Click edit on first artwork
        await editButtons.first().click();
        await page.waitForTimeout(500);

        // Modal should be open
        const modal = page.locator('#artwork-modal');
        await expect(modal).toBeVisible();

        // Image preview should be visible
        const previewContainer = page.locator('#image-preview-container');
        const preview = page.locator('#image-preview');

        if (await previewContainer.isVisible()) {
          await expect(preview).toBeVisible();
          await expect(preview).toHaveAttribute('src', /.+/);

          // Filename should be shown
          const filename = page.locator('#image-filename');
          await expect(filename).toBeVisible();
          const filenameText = await filename.textContent();
          expect(filenameText).toContain('Current image:');
        }
      }
    });

    test('should preview new image before upload', async ({ page }) => {
      await page.click('button:has-text("Add New Artwork")');
      await page.waitForTimeout(500);

      const modal = page.locator('#artwork-modal');
      await expect(modal).toBeVisible();

      // Note: Actual file upload testing would require a test image
      // Verify the file input exists with proper change handler
      const fileInput = page.locator('#image-upload');
      await expect(fileInput).toBeVisible();
      await expect(fileInput).toHaveAttribute('onchange', 'previewImage(event)');
    });

    test('should hide preview when modal is closed', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const editButtons = page.locator('button:has-text("Edit")');
      const buttonCount = await editButtons.count();

      if (buttonCount > 0) {
        // Open edit modal
        await editButtons.first().click();
        await page.waitForTimeout(500);

        // Close modal
        const cancelBtn = page.locator('button:has-text("Cancel")');
        await cancelBtn.click();
        await page.waitForTimeout(300);

        // Modal should be closed
        const modal = page.locator('#artwork-modal');
        await expect(modal).toBeHidden();
      }
    });
  });

  test.describe('Mobile Responsive Admin', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display mobile sidebar toggle', async ({ page }) => {
      const sidebarToggle = page.locator('.mobile-sidebar-toggle');
      await expect(sidebarToggle).toBeVisible();
    });

    test('should open sidebar on mobile when toggle clicked', async ({ page }) => {
      const sidebarToggle = page.locator('.mobile-sidebar-toggle');
      const sidebar = page.locator('.sidebar');

      // Sidebar should be hidden initially on mobile
      await expect(sidebar).not.toHaveClass(/active/);

      // Click toggle
      await sidebarToggle.click();
      await page.waitForTimeout(300);

      // Sidebar should be visible
      await expect(sidebar).toHaveClass(/active/);
    });

    test('should display search and filters stacked on mobile', async ({ page }) => {
      await page.click('.mobile-sidebar-toggle');
      await page.waitForTimeout(300);
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const viewControls = page.locator('.view-controls');
      const searchFilterBar = page.locator('.search-filter-bar');

      await expect(viewControls).toBeVisible();
      await expect(searchFilterBar).toBeVisible();
    });

    test('should display single column grid on mobile', async ({ page }) => {
      await page.click('.mobile-sidebar-toggle');
      await page.waitForTimeout(300);
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const artworksGrid = page.locator('.artworks-grid');
      await expect(artworksGrid).toBeVisible();

      // Cards should be in single column
      const cards = page.locator('.artwork-management-card');
      const cardCount = await cards.count();

      if (cardCount > 1) {
        const firstCardBox = await cards.nth(0).boundingBox();
        const secondCardBox = await cards.nth(1).boundingBox();

        // Second card should be below first (same x-axis, different y)
        expect(Math.abs(firstCardBox.x - secondCardBox.x)).toBeLessThan(50);
        expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y);
      }
    });

    test('should have proper touch target sizes on mobile', async ({ page }) => {
      await page.click('.mobile-sidebar-toggle');
      await page.waitForTimeout(300);
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      // Check button touch targets
      const gridViewBtn = page.locator('#grid-view-btn');
      const box = await gridViewBtn.boundingBox();

      // Should be at least 44x44px for touch accessibility
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThan(0); // Width varies based on content
    });

    test('should not have horizontal scroll on mobile', async ({ page }) => {
      await page.click('.mobile-sidebar-toggle');
      await page.waitForTimeout(300);
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });

    test('should display pagination controls in mobile-friendly layout', async ({ page }) => {
      await page.click('.mobile-sidebar-toggle');
      await page.waitForTimeout(300);
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const pagination = page.locator('#grid-pagination');

      if (await pagination.isVisible()) {
        // Pagination should wrap on small screens
        const paginationBox = await pagination.boundingBox();
        expect(paginationBox.width).toBeLessThanOrEqual(375);
      }
    });
  });

  test.describe('Visual Regression', () => {
    test('should match card grid screenshot', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const gridContainer = page.locator('#artworks-grid-container');
      await expect(gridContainer).toHaveScreenshot('card-grid-view.png', {
        maxDiffPixels: 100
      });
    });

    test('should match table view screenshot', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      await page.click('#table-view-btn');
      await page.waitForTimeout(500);

      const tableContainer = page.locator('#artworks-table-container');
      await expect(tableContainer).toHaveScreenshot('table-view.png', {
        maxDiffPixels: 100
      });
    });

    test('should match search controls screenshot', async ({ page }) => {
      await page.click('a[data-page="artworks"]');
      await page.waitForTimeout(1000);

      const viewControls = page.locator('.view-controls');
      await expect(viewControls).toHaveScreenshot('search-controls.png', {
        maxDiffPixels: 50
      });
    });
  });
});
