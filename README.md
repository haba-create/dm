# Daamitha Gallery - Your Art Management System

Welcome to your gallery website! This system helps you showcase your beautiful oil paintings to the world, manage client relationships, and handle inquiries - all from one place.

## Quick Start

**Your Gallery**: Visit your live website at your domain
**Admin Dashboard**: Go to `/admin/login.html` to manage everything
**Default Login**: `admin@daamitha.art` / `Admin@123`

> Remember to change the default password in production!

---

## What Can You Do?

### As a Gallery Owner

| Feature | Description |
|---------|-------------|
| **Manage Artworks** | Add, edit, and remove paintings from your gallery |
| **Update Prices** | Set and update prices (only you can see them) |
| **Edit Website Content** | Change the text on your homepage without coding |
| **Featured Artworks** | Choose which paintings appear on the homepage |
| **Track Clients** | Keep notes on collectors and potential buyers |
| **Send Emails** | Notify clients about new works or order updates |

### For Your Visitors

| Feature | Description |
|---------|-------------|
| **Browse Gallery** | See all your beautiful artworks |
| **AI Assistant** | Chat with your gallery assistant bot |
| **Create Account** | Clients can sign up to save favorites |
| **Contact You** | Easy ways to get in touch |

---

## How the System Works

```
                    YOUR GALLERY WEBSITE
    ┌─────────────────────────────────────────────────┐
    │                                                 │
    │   Public Gallery     Admin Dashboard            │
    │   ┌──────────┐      ┌──────────────┐           │
    │   │  Browse  │      │  Manage      │           │
    │   │  Artworks│      │  Everything  │           │
    │   │  Chat Bot│      │  CRM & Email │           │
    │   └────┬─────┘      └──────┬───────┘           │
    │        │                   │                    │
    │        └───────┬───────────┘                    │
    │                │                                │
    │         ┌──────▼──────┐                        │
    │         │   Database  │  Stores all your       │
    │         │   (SQLite)  │  artworks, clients,    │
    │         │             │  orders, and content   │
    │         └─────────────┘                        │
    │                                                 │
    └─────────────────────────────────────────────────┘
```

For detailed technical documentation, see [docs/architecture.html](docs/architecture.html)

---

## Step-by-Step Guides

### Adding a New Artwork

1. Log into your Admin Dashboard
2. Click **"+ Add New Artwork"**
3. Fill in the details:
   - **Title**: Name of your painting
   - **Technique**: e.g., "Oil on canvas"
   - **Dimensions**: e.g., '24" × 18"'
   - **Price**: Your selling price (only you see this)
   - **Category**: Contemporary, Animals, Nature, etc.
4. Upload your image (drag & drop works!)
5. Click **Save** - it's now live on your gallery!

### Featuring Artworks on Homepage

1. Go to **Manage Artworks**
2. Find the painting you want to feature
3. Click the **star icon** to toggle featured status
4. Featured artworks appear prominently on your homepage

### Editing Website Text

1. Go to **Site Content** in the dashboard
2. Edit the **Hero Section** (main banner text)
3. Edit the **About Section** (your story)
4. Click **Update** to save changes

### Managing Client Relationships (CRM)

Your AI assistant can help track:
- Client contact information
- Previous conversations
- Order history
- Personal notes (preferences, interests)

---

## Configuration

### Environment Variables

Create a `.env` file with these settings:

```bash
# Required
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=YourSecurePassword123
BETTER_AUTH_SECRET=your-random-secret-key

# For Email Notifications (Gmail)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GMAIL_SENDER_EMAIL=your@gmail.com

# For AI Chat (if using Claude)
ANTHROPIC_API_KEY=your-api-key
```

### Deployment

This system is ready for deployment on:
- **Railway** (recommended - easy setup)
- **Vercel**
- **Any Node.js hosting**

---

## Support & Help

- **Documentation**: See `/docs/architecture.html` for technical details
- **Issues**: Report problems on GitHub Issues
- **Updates**: Pull latest changes from the repository

---

## Technology Overview

For the technically curious:

| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express |
| Database | SQLite (upgradeable to PostgreSQL) |
| Authentication | Better Auth (secure sessions) |
| Email | Gmail API |
| AI Chat | Claude (Anthropic) |
| Frontend | Vanilla JavaScript (fast!) |

---

Made with love for showcasing beautiful art to the world.
