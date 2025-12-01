/**
 * Gmail Refresh Token Generator
 *
 * This script helps you get a refresh token for sending emails via Gmail API.
 *
 * Usage:
 *   1. Make sure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are in your .env
 *   2. Run: node scripts/get-gmail-token.js
 *   3. Open the URL in your browser
 *   4. Sign in with daamitha@daamitha.gallery
 *   5. Copy the code from the redirect URL
 *   6. Paste it when prompted
 *   7. Copy the refresh token to your Railway environment variables
 */

require('dotenv').config();
const http = require('http');
const { URL } = require('url');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3333/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email'
];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  console.log('\nMake sure your .env file contains:');
  console.log('GOOGLE_CLIENT_ID=your_client_id');
  console.log('GOOGLE_CLIENT_SECRET=your_client_secret');
  process.exit(1);
}

// Generate the auth URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES.join(' '));
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n🔐 Gmail Refresh Token Generator\n');
console.log('=' .repeat(60));
console.log('\n1. Open this URL in your browser:\n');
console.log('\x1b[36m%s\x1b[0m', authUrl.toString());
console.log('\n2. Sign in with: daamitha@daamitha.gallery');
console.log('3. Click "Allow" to grant permissions');
console.log('4. You will be redirected - the token will be captured automatically\n');
console.log('=' .repeat(60));
console.log('\nWaiting for authorization...\n');

// Create a simple server to capture the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:3333`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error: ${error}</h1><p>Please try again.</p>`);
      console.error('❌ Authorization error:', error);
      server.close();
      process.exit(1);
    }

    if (code) {
      try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI
          })
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
          throw new Error(tokens.error_description || tokens.error);
        }

        // Success!
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Success!</title>
            <style>
              body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
              .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; }
              .token { background: #f8f9fa; padding: 15px; border-radius: 4px; word-break: break-all; margin: 10px 0; }
              code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>✅ Success!</h1>
              <p>Your Gmail refresh token has been generated.</p>
            </div>
            <h2>Your Refresh Token:</h2>
            <div class="token"><code>${tokens.refresh_token}</code></div>
            <h2>Add to Railway:</h2>
            <p>Go to your Railway dashboard and add this environment variable:</p>
            <div class="token"><code>GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</code></div>
            <p>You can close this window now.</p>
          </body>
          </html>
        `);

        console.log('\n✅ SUCCESS! Refresh token obtained:\n');
        console.log('=' .repeat(60));
        console.log('\nGOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
        console.log('\n' + '=' .repeat(60));
        console.log('\n📋 Copy the above and add it to your Railway environment variables.\n');

        server.close();
        process.exit(0);

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error exchanging code</h1><p>${err.message}</p>`);
        console.error('❌ Token exchange error:', err.message);
        server.close();
        process.exit(1);
      }
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3333, () => {
  console.log('🌐 Local server running on http://localhost:3333');
  console.log('   Waiting for Google to redirect back...\n');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  server.close();
  process.exit(0);
});
