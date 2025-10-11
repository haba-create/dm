/**
 * Test Helpers for Daamitha Gallery E2E Tests
 *
 * Reusable functions to reduce code duplication and improve test maintainability
 */

/**
 * Admin login helper
 * @param {import('@playwright/test').Page} page
 */
async function loginAsAdmin(page) {
  await page.goto('/admin/login.html');
  await page.fill('input[type="email"]', 'admin@daamitha.art');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');

  // Wait for successful login (redirect to dashboard)
  await page.waitForURL('**/admin/dashboard.html', { timeout: 5000 });
}

/**
 * Logout helper
 * @param {import('@playwright/test').Page} page
 */
async function logout(page) {
  // Wait for navigation after clicking logout
  await Promise.all([
    page.waitForURL('**/admin/login.html', { timeout: 10000 }),
    page.click('button:has-text("Logout")')
  ]);
}

/**
 * Check if element is visible in viewport
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
async function isInViewport(page, selector) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }, selector);
}

/**
 * Check for horizontal scroll
 * @param {import('@playwright/test').Page} page
 */
async function hasHorizontalScroll(page) {
  return await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

/**
 * Get element dimensions
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
async function getElementDimensions(page, selector) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left
    };
  }, selector);
}

/**
 * Wait for gallery to load artworks
 * @param {import('@playwright/test').Page} page
 */
async function waitForGalleryLoad(page) {
  // Wait for gallery grid to be populated
  await page.waitForSelector('.gallery-grid .artwork-item', { timeout: 10000 });

  // Wait for loading message to disappear
  await page.waitForSelector('.gallery-grid .loading', { state: 'hidden', timeout: 5000 });
}

/**
 * Open chatbot widget
 * @param {import('@playwright/test').Page} page
 */
async function openChatbot(page) {
  await page.click('#chat-button');
  await page.waitForSelector('#chat-window.open', { timeout: 3000 });
}

/**
 * Send chatbot message
 * @param {import('@playwright/test').Page} page
 * @param {string} message
 */
async function sendChatMessage(page, message) {
  await page.fill('#chat-input', message);
  await page.click('#chat-send');
}

/**
 * Wait for chatbot response
 * @param {import('@playwright/test').Page} page
 */
async function waitForChatResponse(page) {
  // Wait for typing indicator to disappear
  await page.waitForSelector('.chat-message.typing', { state: 'hidden', timeout: 10000 });
}

/**
 * Create test artwork via API
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} token - JWT token
 * @param {object} artworkData
 */
async function createTestArtwork(request, token, artworkData = {}) {
  const defaultData = {
    title: 'Test Artwork',
    artist: 'Daamitha',
    technique: 'Oil on canvas',
    dimensions: '24" × 18"',
    year: 2025,
    price: 1500,
    description: 'Test artwork for E2E testing',
    category: 'Contemporary',
    available: 1,
    ...artworkData
  };

  const response = await request.post('/api/artworks', {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    data: defaultData
  });

  return await response.json();
}

/**
 * Delete test artwork via API
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} token - JWT token
 * @param {number} artworkId
 */
async function deleteTestArtwork(request, token, artworkId) {
  await request.delete(`/api/artworks/${artworkId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

/**
 * Get JWT token by logging in
 * @param {import('@playwright/test').APIRequestContext} request
 */
async function getAuthToken(request) {
  const response = await request.post('/api/auth/login', {
    data: {
      email: 'admin@daamitha.art',
      password: 'Admin@123'
    }
  });

  const data = await response.json();
  return data.token || data.authToken;
}

/**
 * Check if touch targets meet accessibility standards (44x44px minimum)
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
async function checkTouchTargetSize(page, selector) {
  const dimensions = await getElementDimensions(page, selector);
  if (!dimensions) return false;

  const MIN_SIZE = 44;
  return dimensions.width >= MIN_SIZE && dimensions.height >= MIN_SIZE;
}

module.exports = {
  loginAsAdmin,
  logout,
  isInViewport,
  hasHorizontalScroll,
  getElementDimensions,
  waitForGalleryLoad,
  openChatbot,
  sendChatMessage,
  waitForChatResponse,
  createTestArtwork,
  deleteTestArtwork,
  getAuthToken,
  checkTouchTargetSize
};
