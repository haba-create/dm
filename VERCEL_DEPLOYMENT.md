# Vercel Deployment Guide

## Quick Start

Your project is already configured for Vercel! Here's how to deploy:

### Method 1: Using the Deployment Script (Recommended)

```bash
# Make sure you have Vercel CLI installed
npm install -g vercel

# Run the deployment script (sets env vars and deploys)
./deploy-vercel.sh
```

### Method 2: Manual Deployment

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Set Environment Variables**:
   ```bash
   # Set each variable for production
   vercel env add OPENAI_API_KEY production
   # Paste your API key when prompted

   vercel env add JWT_SECRET production
   # Enter a secure JWT secret

   vercel env add CHATKIT_WORKFLOW_ID production
   # Paste your workflow ID

   vercel env add ADMIN_EMAIL production
   # Enter admin email

   vercel env add ADMIN_PASSWORD production
   # Enter admin password
   ```

4. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

## Required Environment Variables

Your Vercel deployment needs these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for ChatKit | `sk-proj-...` |
| `JWT_SECRET` | Secret for JWT token signing | `your_super_secret_key` |
| `CHATKIT_WORKFLOW_ID` | ChatKit workflow ID | `wf_...` |
| `ADMIN_EMAIL` | Admin login email | `admin@daamitha.art` |
| `ADMIN_PASSWORD` | Admin login password | `Admin@123` |
| `NODE_ENV` | Environment (auto-set to production) | `production` |

**Note**: PORT is automatically set by Vercel, so you don't need to configure it.

## After Deployment

1. **Get your deployment URL**:
   After deployment, Vercel will provide a URL like: `https://your-project.vercel.app`

2. **Test the deployment**:
   ```bash
   # Test main site
   curl https://your-project.vercel.app

   # Test API health
   curl https://your-project.vercel.app/api/agent/health

   # Test admin access
   # Open in browser: https://your-project.vercel.app/admin/login.html
   ```

3. **Add custom domain** (optional):
   - Go to your project in Vercel dashboard
   - Click "Settings" → "Domains"
   - Add your custom domain
   - Update DNS records as instructed

## Switching Between Railway and Vercel

You can keep both deployments active:

1. **Railway deployment**: `https://your-app.railway.app`
2. **Vercel deployment**: `https://your-app.vercel.app`

To switch your custom domain:
- **For Railway**: Update domain in Railway dashboard
- **For Vercel**: Update domain in Vercel dashboard
- Only one can use your custom domain at a time

## Troubleshooting

### Database Issues
Vercel uses serverless functions, so SQLite may have issues. Consider:
- Using Vercel Postgres (recommended)
- Using external database (PostgreSQL/MySQL)
- Keeping Railway for database persistence

### File Uploads
Vercel's serverless functions are ephemeral. Uploaded files may not persist. Consider:
- Using Vercel Blob Storage
- Using AWS S3
- Keeping Railway for file uploads

### Environment Variables Not Working
```bash
# Check if variables are set
vercel env ls

# Pull environment variables to local
vercel env pull

# Re-add a variable
vercel env rm OPENAI_API_KEY production
vercel env add OPENAI_API_KEY production
```

## Vercel vs Railway

| Feature | Vercel | Railway |
|---------|--------|---------|
| **Best for** | Static sites, serverless APIs | Full-stack apps, databases |
| **Database** | External only | Built-in support |
| **File uploads** | Requires blob storage | Native filesystem |
| **Deployment** | Instant | Fast |
| **Free tier** | Generous | Good |
| **Custom domains** | Easy | Easy |

## Recommendation

Given your app uses SQLite and file uploads, I recommend:
- **Try Vercel** to see if it works for your needs
- **Keep Railway** as backup since it handles databases/files better
- **Consider upgrading** to Vercel Postgres + Blob Storage if you stick with Vercel

## Next Steps

1. Run `./deploy-vercel.sh` to deploy
2. Test the deployment URL
3. If it works, add your custom domain
4. Keep Railway deployment as backup
5. Point your domain to whichever works best
