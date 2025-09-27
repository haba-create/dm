# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Important Context**: Current date is September 2025.

## Project Overview

This is a dynamic gallery management system for Daamitha, a contemporary oil painter, medical student, and traditional singer from India currently based in London. The system includes a public gallery website, admin dashboard for content management, and AI chatbot integration.

## Project Structure

### Backend (Node.js/Express)
- **/server**
  - **app.js**: Main Express server with middleware configuration
  - **/routes**: API endpoints (auth.js, artworks.js, content.js)
  - **/middleware**: JWT authentication middleware
  - **/models**: SQLite database models and initialization
- **gallery.db**: SQLite database (auto-created on first run)

### Frontend
- **/public**
  - **index.html**: Main gallery page (dynamically loads content)
  - **pricelist.html**: Authentication-protected price list
  - **/js**
    - **gallery.js**: Dynamic content loading for main site
    - **admin.js**: Admin dashboard functionality
- **/admin**
  - **login.html**: Admin authentication page
  - **dashboard.html**: Complete admin panel with CRUD operations

### Assets
- **/uploads/artworks**: Dynamically uploaded artwork images
- **Original images**: Legacy images in root directory

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (with nodemon)
npm run dev

# Start production server
npm start

# Default admin credentials
Email: admin@daamitha.art
Password: Admin@123
```

## API Endpoints

- **Authentication**
  - POST /api/auth/login - Admin login
  - GET /api/auth/verify - Verify JWT token

- **Artworks**
  - GET /api/artworks - Get all artworks (public)
  - GET /api/artworks/:id - Get single artwork
  - POST /api/artworks - Create artwork (admin)
  - PUT /api/artworks/:id - Update artwork (admin)
  - DELETE /api/artworks/:id - Delete artwork (admin)
  - GET /api/artworks/admin/pricelist - Get with prices (admin)

- **Content Management**
  - GET /api/content/:section - Get site content
  - PUT /api/content/:section - Update content (admin)

## Architecture Notes

### Database Schema
- **users**: Authentication for admin users
- **artworks**: Gallery items with full metadata
- **site_content**: Dynamic content sections (hero, about, process)

### Security Features
- JWT authentication with 24-hour expiry
- Bcrypt password hashing
- Rate limiting on API endpoints
- Input validation and sanitization
- Protected admin routes

### Frontend Features
- Dynamic content loading via fetch API
- Custom CSS variables for Indian-inspired color palette
- Smooth animations and parallax effects
- Responsive design with CSS Grid
- Flowise chatbot integration (placeholder ready)

### Admin Dashboard Features
- Real-time statistics (total artworks, available pieces, portfolio value)
- CRUD operations for artwork management
- Image upload with multer
- Content editing for hero, about, and process sections
- Protected price list management

## Important Considerations

- **Database**: SQLite for MVP (easily migrated to PostgreSQL for production)
- **File Storage**: Local filesystem (consider AWS S3 for production)
- **Flowise Integration**: Requires separate Flowise instance with chatflow ID
- **Image Optimization**: Large legacy images should be optimized
- **Browser Compatibility**: Modern features require recent browsers

## Testing with Playwright MCP

When testing, focus on:
1. Admin authentication flow
2. Artwork CRUD operations
3. Dynamic content loading
4. Price list authentication
5. Image upload functionality
6. API endpoint responses