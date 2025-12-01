# Google Cloud Setup Guide for Daamitha

This guide will help you set up Google services so your gallery website can:
- Allow visitors to sign in with their Google account
- Send emails from daamitha@daamitha.gallery

---

## Step 1: Access Google Cloud Console

1. Go to: **https://console.cloud.google.com**
2. Sign in with your **daamitha@daamitha.gallery** Google account
3. You should see a project already created (the one Stephen set up)

---

## Step 2: Enable Gmail API

1. In the left sidebar, click **"APIs & Services"** → **"Library"**
2. In the search box, type **"Gmail API"**
3. Click on **"Gmail API"** in the results
4. Click the blue **"Enable"** button
5. Wait for it to enable (takes a few seconds)

---

## Step 3: Configure OAuth Consent Screen

This tells Google what your app does when users sign in.

1. In the left sidebar, click **"APIs & Services"** → **"OAuth consent screen"**
2. If asked, select **"External"** and click **"Create"**
3. Fill in the form:
   - **App name**: `Daamitha Gallery`
   - **User support email**: `daamitha@daamitha.gallery`
   - **App logo**: (optional - can skip)
   - **App domain**: Leave blank for now
   - **Developer contact email**: `daamitha@daamitha.gallery`
4. Click **"Save and Continue"**

### Scopes Page:
1. Click **"Add or Remove Scopes"**
2. Find and check these scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
3. Click **"Update"** at the bottom
4. Click **"Save and Continue"**

### Test Users Page:
1. Click **"Add Users"**
2. Add: `daamitha@daamitha.gallery`
3. Click **"Add"**
4. Click **"Save and Continue"**

### Summary Page:
1. Review everything looks correct
2. Click **"Back to Dashboard"**

---

## Step 4: Add Redirect URIs to OAuth Credentials

1. In the left sidebar, click **"APIs & Services"** → **"Credentials"**
2. Find your OAuth 2.0 Client ID (the one Stephen created)
3. Click on it to edit
4. Under **"Authorized redirect URIs"**, click **"Add URI"**
5. Add these two URIs:
   ```
   https://wonderful-grace-production-d7f3.up.railway.app/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```
6. Click **"Save"**

---

## Step 5: Get the Gmail Refresh Token

Stephen will help you with this step. He needs to run a script on his computer that will:
1. Open a web page
2. Ask you to sign in with daamitha@daamitha.gallery
3. Generate a special token for sending emails

**Tell Stephen**: "I've completed steps 1-4, ready for the token generation step"

---

## What Stephen Needs to Do

After Daamitha completes the above:

### Run the token generator:
```bash
cd /path/to/dm
node scripts/get-gmail-token.js
```

This will:
1. Show a URL - open it in browser
2. Sign in as daamitha@daamitha.gallery
3. Authorize the app
4. Display the refresh token

### Add to Railway:
Copy the token and add it as `GOOGLE_REFRESH_TOKEN` in Railway.

---

## Summary of Railway Variables Needed

| Variable | Value | Status |
|----------|-------|--------|
| `NODE_ENV` | `production` | Add this |
| `BETTER_AUTH_SECRET` | (generate random string) | Add this |
| `BETTER_AUTH_URL` | `https://wonderful-grace-production-d7f3.up.railway.app` | Add this |
| `GOOGLE_CLIENT_ID` | (from Google Cloud Console) | Add this |
| `GOOGLE_CLIENT_SECRET` | (from Google Cloud Console) | Add this |
| `GOOGLE_REFRESH_TOKEN` | (from step 5) | After Daamitha completes setup |
| `GMAIL_SENDER_EMAIL` | `daamitha@daamitha.gallery` | Add this |

---

## Need Help?

If you get stuck, take a screenshot and send it to Stephen!
