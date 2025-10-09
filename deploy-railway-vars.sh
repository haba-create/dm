#!/bin/bash

# Railway Environment Variable Deployment Script
# This script sets all required environment variables for the Daamitha Gallery

echo "🚂 Railway Environment Variable Deployment"
echo "=========================================="
echo ""

# Check if logged in
if ! railway whoami &>/dev/null; then
    echo "❌ Not logged in to Railway"
    echo "Please run: railway login"
    exit 1
fi

echo "✅ Logged in to Railway"
echo ""

# Check if linked to project
if ! railway status &>/dev/null; then
    echo "❌ Not linked to a Railway project"
    echo "Please run: railway link"
    exit 1
fi

echo "✅ Linked to Railway project"
echo ""

# Read .env file
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    exit 1
fi

echo "📝 Reading environment variables from .env..."
echo ""

# Source the .env file
set -a
source .env
set +a

# Set variables in Railway
echo "🚀 Deploying environment variables to Railway..."
echo ""

railway variables --set "OPENAI_API_KEY=$OPENAI_API_KEY"
echo "✅ Set OPENAI_API_KEY"

railway variables --set "JWT_SECRET=$JWT_SECRET"
echo "✅ Set JWT_SECRET"

railway variables --set "CHATKIT_WORKFLOW_ID=$CHATKIT_WORKFLOW_ID"
echo "✅ Set CHATKIT_WORKFLOW_ID"

railway variables --set "ADMIN_EMAIL=$ADMIN_EMAIL"
echo "✅ Set ADMIN_EMAIL"

railway variables --set "ADMIN_PASSWORD=$ADMIN_PASSWORD"
echo "✅ Set ADMIN_PASSWORD"

railway variables --set "NODE_ENV=production"
echo "✅ Set NODE_ENV=production"

echo ""
echo "✅ ✅ ✅ All environment variables deployed to Railway!"
echo ""
echo "Railway will automatically redeploy your application."
echo "Check the status with: railway status"
echo ""
