#!/bin/bash

# Railway Environment Variables Deployment
# Get your API token from: https://railway.app/account/tokens

# Check for Railway token
if [ -z "$1" ]; then
    echo "❌ Usage: ./set-railway-vars.sh <RAILWAY_API_TOKEN>"
    echo ""
    echo "Get your API token from: https://railway.app/account/tokens"
    echo ""
    exit 1
fi

RAILWAY_TOKEN=$1

# Export token for Railway CLI
export RAILWAY_TOKEN=$RAILWAY_TOKEN

echo "🚂 Setting Railway environment variables..."
echo "Project ID: 5475b48d-a6e8-4d62-82b1-043a6a9b06e0"
echo ""

# Source .env file
set -a
source .env
set +a

# Link to project
echo "📡 Linking to project..."
railway link 5475b48d-a6e8-4d62-82b1-043a6a9b06e0 || {
    echo "⚠️  Link failed, trying alternative method..."
}

# Set variables
echo "🔧 Setting environment variables..."
echo ""

railway variables \
  --set "OPENAI_API_KEY=$OPENAI_API_KEY" \
  --set "JWT_SECRET=$JWT_SECRET" \
  --set "CHATKIT_WORKFLOW_ID=$CHATKIT_WORKFLOW_ID" \
  --set "ADMIN_EMAIL=$ADMIN_EMAIL" \
  --set "ADMIN_PASSWORD=$ADMIN_PASSWORD" \
  --set "NODE_ENV=production"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ✅ ✅ Successfully deployed environment variables!"
    echo ""
    echo "Verify deployment with:"
    echo "  curl https://www.daamitha.gallery/api/agent/health | json_pp"
else
    echo ""
    echo "❌ Failed to deploy variables"
    echo "Please check your Railway token and project access"
fi
