# Deployment Options - Where to Store Credentials Safely

Railway is not loading environment variables properly. Here are 3 reliable alternatives:

---

## ✅ Option 1: Vercel (RECOMMENDED - Easiest)

**Pros:**
- Best environment variable management
- Free tier perfect for your use case
- Automatic deployments from GitHub
- Excellent uptime
- Simple CLI commands

**Setup:**

1. **Install & Login:**
   ```bash
   vercel login
   ```

2. **Deploy with environment variables:**
   ```bash
   ./deploy-vercel.sh
   ```

   Or manually:
   ```bash
   vercel
   ```
   Then set variables in dashboard: https://vercel.com/dashboard

3. **Set custom domain:**
   - Go to Vercel dashboard → Your project → Settings → Domains
   - Add: `daamitha.gallery`

**Cost:** FREE

---

## ✅ Option 2: Render

**Pros:**
- Very similar to Railway but more reliable
- PostgreSQL and Redis included
- Great for Node.js apps
- Easy environment variable UI

**Setup:**

1. **Go to:** https://render.com

2. **Create Web Service:**
   - Connect GitHub repo: `haba-create/dm`
   - Name: `daamitha-gallery`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Add Environment Variables:**
   - Go to Environment tab
   - Click "Add Environment Variable"
   - Add all 6 variables:
     - `OPENAI_API_KEY`
     - `JWT_SECRET`
     - `CHATKIT_WORKFLOW_ID`
     - `ADMIN_EMAIL`
     - `ADMIN_PASSWORD`
     - `NODE_ENV=production`

4. **Deploy:**
   - Click "Create Web Service"
   - Render automatically deploys

**Cost:** FREE tier available

---

## ✅ Option 3: Fly.io

**Pros:**
- Excellent secrets management via CLI
- Good for global deployment
- Fast deployment
- Reliable

**Setup:**

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Initialize app:**
   ```bash
   fly launch --name daamitha-gallery
   ```

4. **Set secrets (one command):**
   ```bash
   fly secrets set \
     OPENAI_API_KEY="<your-api-key>" \
     JWT_SECRET="<your-jwt-secret>" \
     CHATKIT_WORKFLOW_ID="<your-workflow-id>" \
     ADMIN_EMAIL="<your-email>" \
     ADMIN_PASSWORD="<your-password>" \
     NODE_ENV="production"
   ```

5. **Deploy:**
   ```bash
   fly deploy
   ```

**Cost:** $5/month minimum (more expensive but very reliable)

---

## ✅ Option 4: Heroku (Most Mature)

**Pros:**
- Most mature platform
- 100% reliable environment variables
- Great documentation
- Easy CLI

**Setup:**

1. **Install Heroku CLI:**
   ```bash
   curl https://cli-assets.heroku.com/install.sh | sh
   ```

2. **Login:**
   ```bash
   heroku login
   ```

3. **Create app:**
   ```bash
   heroku create daamitha-gallery
   ```

4. **Set config vars:**
   ```bash
   heroku config:set \
     OPENAI_API_KEY="<your-api-key>" \
     JWT_SECRET="<your-jwt-secret>" \
     CHATKIT_WORKFLOW_ID="<your-workflow-id>" \
     ADMIN_EMAIL="<your-email>" \
     ADMIN_PASSWORD="<your-password>" \
     NODE_ENV="production"
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   ```

**Cost:** $5-7/month (no free tier anymore)

---

## 📋 My Recommendation

**For you: Use Vercel** because:
1. ✅ FREE
2. ✅ Best environment variable UI
3. ✅ Easiest to deploy
4. ✅ Perfect for Node.js
5. ✅ Can use custom domain (daamitha.gallery)
6. ✅ Automatic GitHub deployments

**To deploy to Vercel right now:**

```bash
vercel login
./deploy-vercel.sh
```

---

## 🔒 Alternative: Environment Variable Management Services

If you want to keep Railway but fix the env var issue, use a secrets manager:

### Doppler (Recommended)
```bash
npm install -g @dopplerhq/cli
doppler login
doppler setup
doppler secrets set OPENAI_API_KEY="sk-..."
```

### Infisical
- Open source secrets manager
- Free tier available
- https://infisical.com

---

## Current Status

✅ **Code**: Working perfectly
✅ **Local development**: All env vars loading
❌ **Railway production**: Env vars not loading (Railway bug)

**Next Step:** Choose one of the options above and I'll help you deploy!
