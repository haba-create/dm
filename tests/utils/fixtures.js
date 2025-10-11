/**
 * Test Fixtures - Mock data for consistent testing
 */

const mockArtworks = [
  {
    title: 'Test Spirit Twin',
    artist: 'Daamitha',
    technique: 'Oil on linen canvas',
    dimensions: '30" × 24"',
    year: 2024,
    price: 1800,
    description: 'Test artwork - Spirit Twin variant',
    category: 'Contemporary',
    available: 1
  },
  {
    title: 'Test Cat Portrait',
    artist: 'Daamitha',
    technique: 'Oil on canvas',
    dimensions: '36" × 28"',
    year: 2024,
    price: 2400,
    description: 'Test artwork - Cat portrait',
    category: 'Animals',
    available: 1
  },
  {
    title: 'Test Unavailable Piece',
    artist: 'Daamitha',
    technique: 'Oil on canvas',
    dimensions: '24" × 20"',
    year: 2023,
    price: 3000,
    description: 'Test artwork - Not available',
    category: 'Abstract',
    available: 0
  }
];

const adminCredentials = {
  email: 'admin@daamitha.art',
  password: 'Admin@123'
};

const invalidCredentials = {
  email: 'fake@example.com',
  password: 'wrongpassword'
};

const chatbotTestMessages = [
  {
    user: 'Hello',
    expectedKeywords: ['hello', 'hi', 'namaste', 'help']
  },
  {
    user: 'Tell me about the artist',
    expectedKeywords: ['daamitha', 'london', 'india', 'oil', 'painting']
  },
  {
    user: 'What artworks are available?',
    expectedKeywords: ['artwork', 'painting', 'collection', 'gallery']
  },
  {
    user: 'How much does a painting cost?',
    expectedKeywords: ['price', 'pricing', 'cost', 'pricelist', 'contact']
  }
];

const responsiveBreakpoints = [
  { name: 'Mobile Small', width: 375, height: 667 },
  { name: 'Mobile Medium', width: 414, height: 896 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Laptop', width: 1024, height: 768 },
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Large Desktop', width: 1920, height: 1080 }
];

const criticalSelectors = {
  // Navigation
  logo: '.logo',
  navLinks: '.nav-links',
  mobileMenu: '.mobile-menu-toggle',

  // Hero
  heroTitle: '.hero h1',
  ctaButton: '.cta-button',

  // Gallery
  galleryGrid: '.gallery-grid',
  artworkItem: '.artwork-item',
  artworkImage: '.artwork-image',
  artworkTitle: '.artwork-title',

  // Admin
  loginForm: 'form',
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  loginButton: 'button[type="submit"]',
  adminDashboard: '.dashboard-container',
  addArtworkButton: 'button:has-text("Add New Artwork")',
  artworkModal: '#artwork-modal',

  // Chatbot
  chatButton: '#chat-button',
  chatWindow: '#chat-window',
  chatInput: '#chat-input',
  chatSend: '#chat-send',
  chatMessage: '.chat-message'
};

module.exports = {
  mockArtworks,
  adminCredentials,
  invalidCredentials,
  chatbotTestMessages,
  responsiveBreakpoints,
  criticalSelectors
};
