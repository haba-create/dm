# 🧪 Testing Guide - Daamitha Gallery

## Quick Start

```bash
# Install Playwright browsers (first time only)
npm run test:install

# Run all tests
npm test

# Run tests with visible browser
npm run test:headed

# Run tests with Playwright UI (recommended for debugging)
npm run test:ui

# Run specific test suite
npm run test:auth        # Authentication tests
npm run test:gallery     # Gallery browsing tests
npm run test:crud        # Artwork CRUD tests
npm run test:responsive  # Responsive design tests
npm run test:chatbot     # Chatbot tests

# Run tests on specific devices
npm run test:mobile      # iPhone 13 & Pixel 5
npm run test:desktop     # Desktop Chrome

# Debug mode (step through tests)
npm run test:debug

# View test report
npm run test:report
```

---

## 📊 Test Coverage

### Test Suites

| Suite | Tests | Description |
|-------|-------|-------------|
| **auth.spec.js** | 10 | Admin authentication, JWT tokens, session management |
| **gallery.spec.js** | 16 | Public gallery browsing, navigation, SEO |
| **artwork-crud.spec.js** | 14 | Admin artwork management (Create, Read, Update, Delete) |
| **responsive.spec.js** | 60+ | Responsive design across 6 breakpoints × 11 devices |
| **chatbot.spec.js** | 17 | AI chatbot functionality, error handling |

**Total: 117+ E2E tests**

---

## 🎯 What's Tested

### ✅ Authentication & Security
- Admin login/logout
- JWT token management
- Protected route access
- Session persistence
- Invalid credentials handling
- Token expiration
- Password field security

### ✅ Public Gallery
- Homepage loading
- Navigation menu
- Hero section
- Gallery grid display
- Artwork details (without prices)
- About & process sections
- Contact information
- Image loading
- Smooth scrolling
- SEO meta tags
- Footer

### ✅ Admin Dashboard
- Dashboard statistics
- Artwork creation with image upload
- Artwork editing
- Artwork deletion with confirmation
- Price list management
- Form validation
- Real-time statistics updates
- Category management

### ✅ Responsive Design (6 Breakpoints)
- **375px** - Mobile Small (iPhone SE)
- **414px** - Mobile Medium (iPhone 13)
- **768px** - Tablet (iPad)
- **1024px** - Laptop
- **1440px** - Desktop
- **1920px** - Large Desktop

**Responsive Checks:**
- No horizontal scroll
- Navigation adaptation (desktop/mobile)
- Grid layout adjustments
- Touch target sizes (44×44px minimum)
- Text readability
- Image scaling
- Admin dashboard mobile layout
- Orientation changes (portrait/landscape)

### ✅ AI Chatbot
- Widget visibility
- Open/close functionality
- Welcome message
- Send/receive messages
- Conversation history
- Typing indicators
- Error handling
- Keyboard shortcuts (Enter to send)
- Auto-scroll to latest message
- Accessibility (ARIA labels)
- Mobile responsiveness
- Empty message handling

---

## 🌐 Browser & Device Coverage

### Browsers
- ✅ Chrome (Desktop & Mobile)
- ✅ Firefox (Desktop)
- ✅ Safari (Desktop)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

### Devices
- ✅ iPhone 13, 13 Pro Max, SE
- ✅ iPad Pro, iPad Mini
- ✅ Google Pixel 5
- ✅ Samsung Galaxy S21
- ✅ Desktop (1440p, 1920p)
- ✅ Laptop (1024p)

---

## 🏃 Running Tests

### Prerequisites

```bash
# Make sure dependencies are installed
npm install

# Install Playwright browsers (required first time)
npm run test:install
```

### Basic Usage

```bash
# Run all tests (headless)
npm test

# Run with browser visible
npm run test:headed

# Interactive UI mode (best for development)
npm run test:ui
```

### Debugging

```bash
# Debug mode - pause at breakpoints
npm run test:debug

# Run specific test file with debug
npx playwright test tests/auth.spec.js --debug

# Run specific test by name
npx playwright test -g "should login successfully"
```

### CI/CD

```bash
# Run in CI mode (no retries, strict)
CI=true npm test

# Generate report
npm test && npm run test:report
```

---

## 📁 Test File Structure

```
/tests
├── auth.spec.js          # Authentication tests
├── gallery.spec.js       # Public gallery tests
├── artwork-crud.spec.js  # Admin CRUD tests
├── responsive.spec.js    # Responsive design tests
├── chatbot.spec.js       # AI chatbot tests
└── utils/
    ├── test-helpers.js   # Reusable test functions
    └── fixtures.js       # Mock data & constants
```

---

## 🔧 Configuration

### playwright.config.js

Key settings:
- **Timeout**: 30 seconds per test
- **Retries**: 2 in CI, 0 locally
- **Base URL**: http://localhost:3000
- **Screenshots**: On failure
- **Video**: Retained on failure
- **Trace**: On first retry

### Environment Variables

```bash
# .env (for testing)
JWT_SECRET=your-test-secret
OPENAI_API_KEY=your-api-key  # For chatbot tests
NODE_ENV=test
PORT=3000
```

---

## 📈 Test Reports

After running tests:

```bash
# View HTML report
npm run test:report

# Reports are saved to:
# - playwright-report/  (HTML report)
# - test-results/       (JSON results, screenshots, videos)
```

---

## ✍️ Writing New Tests

### Example Test

```javascript
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./utils/test-helpers');

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');

    // Your test logic
    await expect(page.locator('.my-element')).toBeVisible();
  });

  test('admin-only feature', async ({ page }) => {
    await loginAsAdmin(page);

    // Test admin functionality
  });
});
```

### Helper Functions Available

```javascript
// From test-helpers.js
loginAsAdmin(page)              // Login as admin
logout(page)                    // Logout
waitForGalleryLoad(page)        // Wait for gallery to load
openChatbot(page)               // Open chat widget
sendChatMessage(page, message)  // Send chat message
hasHorizontalScroll(page)       // Check for overflow
checkTouchTargetSize(page, sel) // Verify accessibility
getAuthToken(request)           // Get JWT token
createTestArtwork(...)          // Create via API
// ... and more
```

---

## 🐛 Troubleshooting

### Tests Timing Out

```bash
# Increase timeout for slow tests
npx playwright test --timeout=60000
```

### Browser Installation Issues

```bash
# Reinstall browsers
npm run test:install

# Or manually:
npx playwright install --with-deps chromium firefox webkit
```

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in playwright.config.js
```

### Chatbot Tests Failing

Make sure `OPENAI_API_KEY` is set in your `.env` file. If not configured, some chatbot tests will gracefully skip.

---

## 🎯 Next Steps

### Week 2: Run Tests & Fix Issues
1. Run the full test suite
2. Fix any failing tests
3. Document known issues
4. Improve test coverage where needed

### Week 3: CI/CD Integration
1. Setup GitHub Actions
2. Configure test reporting
3. Add status badges
4. Setup automatic deployments

---

## 📞 Support

For questions about tests:
- Review `IMPLEMENTATION_PROGRESS.md` for context
- Check `playwright.config.js` for configuration
- See `tests/utils/test-helpers.js` for available helpers
- Consult [Playwright Docs](https://playwright.dev)

---

**Ready to test!** Run `npm test` to start.
