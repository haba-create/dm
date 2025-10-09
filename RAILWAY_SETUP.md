# Railway Environment Variables Setup Guide

## Problem
Railway is not loading the environment variables (`OPENAI_API_KEY`, `JWT_SECRET`, etc.), causing the chat to fail with a 500 error.

## Solution: Manual Setup via Railway Dashboard

### Step-by-Step Instructions:

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Login to your account

2. **Select Your Project**
   - Project name: **"audable-playfulness"**
   - Project ID: `5475b48d-a6e8-4d62-82b1-043a6a9b06e0`

3. **Select Your Service**
   - Click on the service running your Node.js application
   - (Usually named "web" or "dm" or similar)

4. **Go to Variables Tab**
   - Click on the **"Variables"** tab at the top

5. **Add Each Variable**
   - Click **"+ New Variable"** button
   - Enter the following variables ONE BY ONE:

   ```
   Name: OPENAI_API_KEY
   Value: <your-openai-api-key-from-.env>
   ```

   ```
   Name: JWT_SECRET
   Value: your_super_secret_jwt_key_change_this_in_production
   ```

   ```
   Name: CHATKIT_WORKFLOW_ID
   Value: wf_68e68da138f48190af56ca40b203db28032abb6cab16bcc6
   ```

   ```
   Name: ADMIN_EMAIL
   Value: admin@daamitha.art
   ```

   ```
   Name: ADMIN_PASSWORD
   Value: Admin@123
   ```

   ```
   Name: NODE_ENV
   Value: production
   ```

6. **CRITICAL: No Quotes!**
   - ❌ WRONG: `OPENAI_API_KEY="sk-proj-..."`
   - ✅ CORRECT: `OPENAI_API_KEY=sk-proj-...`
   - Enter values WITHOUT quotes

7. **Save and Deploy**
   - Click "Add" or "Save" for each variable
   - Railway will automatically redeploy
   - Wait 1-2 minutes for deployment

8. **Verify It Worked**
   - Visit: https://www.daamitha.gallery/api/agent/health
   - Should show: `"apiKeyConfigured": true`
   - Or check: https://www.daamitha.gallery/api/agent/debug-env

## Alternative: Using Raw Editor

If the UI is buggy, try the **Raw Editor**:

1. In the Variables tab, switch to **"Raw Editor"** mode
2. Paste this (NO quotes):

```
OPENAI_API_KEY=<your-openai-api-key>
JWT_SECRET=<your-jwt-secret>
CHATKIT_WORKFLOW_ID=<your-chatkit-workflow-id>
ADMIN_EMAIL=<your-admin-email>
ADMIN_PASSWORD=<your-admin-password>
NODE_ENV=production
```

3. Click "Update Variables"

## Troubleshooting

### If variables still don't load:

1. **Check you're editing the right service**
   - Make sure you selected the correct service (the one running Node.js)

2. **Check environment**
   - Ensure you're editing the "production" environment

3. **Force redeploy**
   - Go to "Deployments" tab
   - Click "Redeploy" on the latest deployment

4. **Check server logs**
   - Go to "Deployments" → Select latest deployment → View logs
   - Look for the "🔍 Environment Variables Status:" section
   - Should show: `OPENAI_API_KEY: SET (length: ...)`

## Current Status

✅ **Local development**: Working perfectly
❌ **Production (Railway)**: Environment variables not loading

The issue is purely with Railway's environment variable configuration, not the code.
