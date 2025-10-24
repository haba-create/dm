const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Featured Gallery Management', () => {
    let authToken;

    test.beforeAll(async ({ request }) => {
        // Login and get auth token
        const response = await request.post('http://localhost:3000/api/auth/login', {
            data: {
                email: 'admin@daamitha.art',
                password: 'Admin@123'
            }
        });
        const data = await response.json();
        authToken = data.token;
    });

    test('front page displays 6 featured artworks with correct images', async ({ page }) => {
        await page.goto('http://localhost:3000');

        // Wait for gallery to load
        await page.waitForSelector('.gallery-grid');

        // Check exactly 6 artworks are displayed
        const artworkItems = await page.locator('.artwork-item').count();
        expect(artworkItems).toBe(6);

        // Check all images load successfully (no broken images)
        const images = page.locator('.artwork-image');
        const imageCount = await images.count();

        for (let i = 0; i < imageCount; i++) {
            const img = images.nth(i);
            const src = await img.getAttribute('src');

            // Verify src exists and starts with /images/
            expect(src).toBeTruthy();
            expect(src).toMatch(/^\/images\//);

            // Verify image actually loads (naturalWidth > 0)
            const naturalWidth = await img.evaluate(el => el.naturalWidth);
            expect(naturalWidth).toBeGreaterThan(0);
        }

        // Verify expected artwork titles are present
        const titles = [
            'Spirit Twin',
            'Deep within thought',
            'Treetop Reverie',
            'Feathered Jewel',
            "Mother's Love",
            "Predator's gaze"
        ];

        for (const title of titles) {
            await expect(page.locator('.artwork-title', { hasText: title })).toBeVisible();
        }
    });

    test('admin dashboard displays artworks with correct images', async ({ page, context }) => {
        // Set auth token in localStorage
        await context.addCookies([]);
        await page.goto('http://localhost:3000/admin/dashboard.html');
        await page.evaluate((token) => {
            localStorage.setItem('authToken', token);
        }, authToken);

        await page.reload();

        // Navigate to artworks section
        await page.click('a[data-page="artworks"]');
        await page.waitForSelector('.artwork-management-card');

        // Check that artworks are displayed
        const artworkCards = await page.locator('.artwork-management-card').count();
        expect(artworkCards).toBeGreaterThan(0);

        // Check all 6 have featured badges
        const featuredBadges = await page.locator('.featured-badge').count();
        expect(featuredBadges).toBe(6);

        // Check images load in admin
        const images = page.locator('.card-image');
        const imageCount = await images.count();

        for (let i = 0; i < Math.min(imageCount, 6); i++) {
            const img = images.nth(i);
            const src = await img.getAttribute('src');

            expect(src).toBeTruthy();
            expect(src).toMatch(/^\/images\//);

            // Verify image loads
            const naturalWidth = await img.evaluate(el => el.naturalWidth);
            expect(naturalWidth).toBeGreaterThan(0);
        }
    });

    test('upload new artwork with image', async ({ page, context }) => {
        await context.addCookies([]);
        await page.goto('http://localhost:3000/admin/dashboard.html');
        await page.evaluate((token) => {
            localStorage.setItem('authToken', token);
        }, authToken);

        await page.reload();
        await page.click('a[data-page="artworks"]');
        await page.waitForSelector('[data-action="add-artwork"]');

        // Click add artwork button
        await page.click('[data-action="add-artwork"]');
        await page.waitForSelector('#artwork-modal');

        // Fill in the form
        await page.fill('#artwork-title', 'Test Artwork Playwright');
        await page.fill('#artwork-artist', 'Daamitha');
        await page.fill('#artwork-technique', 'Oil on canvas');
        await page.fill('#artwork-dimensions', '20" × 16"');
        await page.fill('#artwork-year', '2025');
        await page.fill('#artwork-price', '1500');
        await page.selectOption('#artwork-category', 'Contemporary');
        await page.fill('#artwork-description', 'Test artwork created by Playwright');

        // Create a test image file
        const testImagePath = path.join(__dirname, '../tiger.jpg');

        // Upload image
        const fileInput = await page.locator('input[type="file"]');
        await fileInput.setInputFiles(testImagePath);

        // Wait for preview
        await page.waitForTimeout(1000);

        // Submit form
        page.on('dialog', dialog => dialog.accept());
        await page.click('button[type="submit"]');

        // Wait for success and reload
        await page.waitForTimeout(2000);

        // Verify artwork appears in list
        await expect(page.locator('.artwork-title', { hasText: 'Test Artwork Playwright' })).toBeVisible();

        // Verify it's NOT featured (no badge)
        const testCard = page.locator('.artwork-management-card', {
            has: page.locator('.artwork-title', { hasText: 'Test Artwork Playwright' })
        });
        await expect(testCard.locator('.featured-badge')).not.toBeVisible();

        // Verify green "Feature" button is shown
        await expect(testCard.locator('button', { hasText: '☆ Feature' })).toBeVisible();
    });

    test('featured toggle enforces 6-item limit', async ({ page, context }) => {
        await context.addCookies([]);
        await page.goto('http://localhost:3000/admin/dashboard.html');
        await page.evaluate((token) => {
            localStorage.setItem('authToken', token);
        }, authToken);

        await page.reload();
        await page.click('a[data-page="artworks"]');
        await page.waitForSelector('.artwork-management-card');

        // Find the test artwork
        const testCard = page.locator('.artwork-management-card', {
            has: page.locator('.artwork-title', { hasText: 'Test Artwork Playwright' })
        });

        // Try to feature it (should fail - already have 6)
        page.on('dialog', dialog => {
            expect(dialog.message()).toContain('Maximum of 6 featured artworks reached');
            dialog.accept();
        });

        await testCard.locator('button[data-action="toggle-featured"]').click();
        await page.waitForTimeout(1000);
    });

    test('can unfeature artwork and then feature another', async ({ page, context }) => {
        await context.addCookies([]);
        await page.goto('http://localhost:3000/admin/dashboard.html');
        await page.evaluate((token) => {
            localStorage.setItem('authToken', token);
        }, authToken);

        await page.reload();
        await page.click('a[data-page="artworks"]');
        await page.waitForSelector('.artwork-management-card');

        // Unfeature one of the original 6
        const featuredCard = page.locator('.artwork-management-card.featured-artwork').first();
        const titleBeforeUnfeature = await featuredCard.locator('.artwork-title').textContent();

        page.on('dialog', dialog => {
            expect(dialog.message()).toContain('removed from homepage');
            dialog.accept();
        });

        await featuredCard.locator('button[data-action="toggle-featured"]').click();
        await page.waitForTimeout(2000);

        // Verify it's no longer featured
        const unfeaturedCard = page.locator('.artwork-management-card', {
            has: page.locator('.artwork-title', { hasText: titleBeforeUnfeature })
        });
        await expect(unfeaturedCard.locator('.featured-badge')).not.toBeVisible();

        // Now feature the test artwork
        const testCard = page.locator('.artwork-management-card', {
            has: page.locator('.artwork-title', { hasText: 'Test Artwork Playwright' })
        });

        page.on('dialog', dialog => {
            expect(dialog.message()).toContain('featured on homepage');
            dialog.accept();
        });

        await testCard.locator('button[data-action="toggle-featured"]').click();
        await page.waitForTimeout(2000);

        // Verify it now has the featured badge
        await expect(testCard.locator('.featured-badge')).toBeVisible();

        // Check front page shows test artwork
        await page.goto('http://localhost:3000');
        await page.waitForSelector('.gallery-grid');
        await expect(page.locator('.artwork-title', { hasText: 'Test Artwork Playwright' })).toBeVisible();
    });

    test('delete artwork removes file and database record', async ({ page, context, request }) => {
        await context.addCookies([]);
        await page.goto('http://localhost:3000/admin/dashboard.html');
        await page.evaluate((token) => {
            localStorage.setItem('authToken', token);
        }, authToken);

        await page.reload();
        await page.click('a[data-page="artworks"]');
        await page.waitForSelector('.artwork-management-card');

        // Find test artwork
        const testCard = page.locator('.artwork-management-card', {
            has: page.locator('.artwork-title', { hasText: 'Test Artwork Playwright' })
        });

        // Get the image src before deletion
        const imageSrc = await testCard.locator('.card-image').getAttribute('src');

        // Delete it
        page.on('dialog', dialog => dialog.accept());
        await testCard.locator('button[data-action="delete-artwork"]').click();

        await page.waitForTimeout(2000);

        // Verify it's gone from admin
        await expect(page.locator('.artwork-title', { hasText: 'Test Artwork Playwright' })).not.toBeVisible();

        // Verify it's gone from front page
        await page.goto('http://localhost:3000');
        await page.waitForSelector('.gallery-grid');
        await expect(page.locator('.artwork-title', { hasText: 'Test Artwork Playwright' })).not.toBeVisible();

        // Verify image file returns 404 (only for uploaded files, not /images/)
        if (imageSrc && imageSrc.startsWith('/uploads/')) {
            const imageResponse = await request.get(`http://localhost:3000${imageSrc}`);
            expect(imageResponse.status()).toBe(404);
        }
    });

    test('front page images have proper styling (no cropping)', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('.gallery-grid');

        const firstImage = page.locator('.artwork-image').first();

        // Check CSS properties
        const objectFit = await firstImage.evaluate(el => getComputedStyle(el).objectFit);
        expect(objectFit).toBe('contain');

        // Check height
        const height = await firstImage.evaluate(el => getComputedStyle(el).height);
        expect(parseInt(height)).toBeGreaterThanOrEqual(380);

        // Verify padding exists
        const padding = await firstImage.evaluate(el => getComputedStyle(el).padding);
        expect(padding).not.toBe('0px');
    });
});
