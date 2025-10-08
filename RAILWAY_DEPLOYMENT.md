# Railway Deployment Guide - ChatKit Integration

## Environment Variables Required

Add these environment variables in your Railway dashboard:

```
OPENAI_API_KEY=your-openai-api-key-here

CHATKIT_WORKFLOW_ID=wf_68e68da138f48190af56ca40b203db28032abb6cab16bcc6

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

ADMIN_EMAIL=admin@daamitha.art

ADMIN_PASSWORD=Admin@123

NODE_ENV=production

PORT=3000
```

## What Was Changed

### 1. Backend Changes
- **Added OpenAI SDK** (`npm install openai`)
- **Created `/server/routes/chatkit.js`** - ChatKit session endpoint
- **Updated `/server/app.js`** - Added ChatKit routes and CSP headers

### 2. Frontend Changes
- **Updated `/public/index.html`** - Replaced Flowise with OpenAI ChatKit
- ChatKit loads as a floating button in bottom-right corner
- Auto-creates sessions via backend API

### 3. Security Updates
- Added OpenAI domains to Content Security Policy (CSP)
- WebSocket support for real-time chat (wss://*.openai.com)
- Secure session token generation

## API Endpoints

### POST /api/chatkit/session
Creates a new ChatKit session and returns client secret for frontend

**Response:**
```json
{
  "client_secret": "secret_abc123...",
  "session_id": "session_xyz789..."
}
```

### GET /api/chatkit/health
Health check to verify ChatKit is configured

**Response:**
```json
{
  "status": "ok",
  "chatkit_configured": true
}
```

## How ChatKit Works

1. **User visits website** → ChatKit button appears (bottom-right)
2. **User clicks button** → Frontend calls `/api/chatkit/session`
3. **Backend creates session** → Returns client_secret to frontend
4. **ChatKit initializes** → User can chat with AI assistant
5. **AI uses workflow** → Responds using your configured workflow ID

## Testing Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Server runs on http://localhost:3000
# ChatKit should appear as floating button
```

## Deployment Steps for Railway

1. **Push code to repository** (Git)
2. **Go to Railway dashboard** → Your project
3. **Navigate to Variables tab**
4. **Add all environment variables** listed above
5. **Deploy** - Railway will auto-deploy on push
6. **Verify** - Visit your domain and test ChatKit button

## Troubleshooting

### ChatKit not appearing
- Check browser console for errors
- Verify `OPENAI_API_KEY` is set in Railway
- Check `/api/chatkit/health` endpoint returns `configured: true`

### Session creation fails
- Verify API key is valid and has ChatKit access
- Check workflow ID is correct: `wf_68e68da138f48190af56ca40b203db28032abb6cab16bcc6`
- Review server logs in Railway dashboard

### CSP errors in browser
- Check helmet CSP configuration in `server/app.js`
- Ensure OpenAI domains are whitelisted

## Features

- **Floating chat button** styled to match gallery theme (#800020 burgundy)
- **Custom welcome message** about Daamitha's artwork
- **Session management** with automatic token refresh
- **Secure authentication** via backend-generated tokens
- **Production-ready** with rate limiting and security headers

## Support

If ChatKit doesn't initialize:
1. Check Railway logs for errors
2. Verify all environment variables are set
3. Test the health endpoint: `https://your-domain.railway.app/api/chatkit/health`
4. Check browser console for JavaScript errors
