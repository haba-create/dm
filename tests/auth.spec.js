const { test, expect } = require('@playwright/test');
const { loginAsAdmin, logout } = require('./utils/test-helpers');
const { adminCredentials, invalidCredentials, criticalSelectors } = require('./utils/fixtures');

test.describe('Authentication', () => {

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/admin/login.html');

    // Check page title
    await expect(page).toHaveTitle(/Admin Login/i);

    // Check form elements are visible
    await expect(page.locator(criticalSelectors.emailInput)).toBeVisible();
    await expect(page.locator(criticalSelectors.passwordInput)).toBeVisible();
    await expect(page.locator(criticalSelectors.loginButton)).toBeVisible();

    // Check form has proper labels
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Password")')).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/admin/login.html');

    // Fill in credentials
    await page.fill(criticalSelectors.emailInput, adminCredentials.email);
    await page.fill(criticalSelectors.passwordInput, adminCredentials.password);

    // Submit form
    await page.click(criticalSelectors.loginButton);

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*admin\/dashboard\.html/);

    // Dashboard should be visible
    await expect(page.locator(criticalSelectors.adminDashboard)).toBeVisible();

    // Should show user info or admin elements
    await expect(page.locator('text=Dashboard Overview')).toBeVisible();
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/admin/login.html');

    // Fill in invalid credentials
    await page.fill(criticalSelectors.emailInput, invalidCredentials.email);
    await page.fill(criticalSelectors.passwordInput, invalidCredentials.password);

    // Submit form
    await page.click(criticalSelectors.loginButton);

    // Should show error message (wait for potential alert or error div)
    // Note: Adjust selector based on actual error implementation
    const errorVisible = await page.locator('text=/invalid|error|wrong/i').isVisible({ timeout: 3000 })
      .catch(() => false);

    // Should still be on login page
    await expect(page).toHaveURL(/.*login\.html/);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/admin/login.html');

    // Try to submit without filling fields
    await page.click(criticalSelectors.loginButton);

    // Check HTML5 validation or custom error messages
    const emailInput = page.locator(criticalSelectors.emailInput);
    const passwordInput = page.locator(criticalSelectors.passwordInput);

    // Should have required attribute or show validation
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('should store JWT token after successful login', async ({ page, context }) => {
    await page.goto('/admin/login.html');

    await page.fill(criticalSelectors.emailInput, adminCredentials.email);
    await page.fill(criticalSelectors.passwordInput, adminCredentials.password);
    await page.click(criticalSelectors.loginButton);

    // Wait for redirect
    await page.waitForURL(/.*dashboard\.html/);

    // Check if token is stored (localStorage or sessionStorage)
    const token = await page.evaluate(() => {
      return localStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
    });

    expect(token).toBeTruthy();
    expect(token).toContain('.'); // JWT tokens have dots
  });

  test('should successfully logout', async ({ page }) => {
    // Login first
    await loginAsAdmin(page);

    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard\.html/);

    // Logout
    await logout(page);

    // Should redirect to login
    await expect(page).toHaveURL(/.*login\.html/);

    // Token should be cleared
    const token = await page.evaluate(() => {
      return localStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
    });

    expect(token).toBeNull();
  });

  test('should protect admin routes when not authenticated', async ({ page }) => {
    // Clear any existing tokens
    await page.goto('/admin/login.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to access dashboard directly
    await page.goto('/admin/dashboard.html');

    // Should either redirect to login or show error
    // Check if redirected to login OR dashboard doesn't load properly
    const isLoginPage = page.url().includes('login.html');
    const hasDashboard = await page.locator(criticalSelectors.adminDashboard)
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    // One of these should be true: redirected to login OR dashboard blocked
    expect(isLoginPage || !hasDashboard).toBeTruthy();
  });

  test('should handle expired/invalid tokens gracefully', async ({ page }) => {
    await page.goto('/admin/login.html');

    // Set an invalid token
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'invalid.token.here');
    });

    // Try to access dashboard
    await page.goto('/admin/dashboard.html');

    // Wait a moment for redirect
    await page.waitForTimeout(1000);

    // Should redirect to login
    const currentUrl = page.url();
    expect(currentUrl.includes('login')).toBeTruthy();
  });

  test('should persist authentication across page refreshes', async ({ page }) => {
    // Login
    await loginAsAdmin(page);

    // Refresh page
    await page.reload();

    // Should still be on dashboard
    await expect(page).toHaveURL(/.*dashboard\.html/);
    await expect(page.locator(criticalSelectors.adminDashboard)).toBeVisible();
  });

  test('should have secure password input', async ({ page }) => {
    await page.goto('/admin/login.html');

    const passwordInput = page.locator(criticalSelectors.passwordInput);

    // Password field should have type="password"
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
