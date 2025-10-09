#!/bin/bash

echo "🚀 Deploying to Vercel with Environment Variables"
echo "=================================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    exit 1
fi

# Source .env
set -a
source .env
set +a

echo "📝 Setting environment variables in Vercel..."
echo ""

# Set all environment variables (for production)
vercel env add OPENAI_API_KEY production <<EOF
$OPENAI_API_KEY
EOF

vercel env add JWT_SECRET production <<EOF
$JWT_SECRET
EOF

vercel env add CHATKIT_WORKFLOW_ID production <<EOF
$CHATKIT_WORKFLOW_ID
EOF

vercel env add ADMIN_EMAIL production <<EOF
$ADMIN_EMAIL
EOF

vercel env add ADMIN_PASSWORD production <<EOF
$ADMIN_PASSWORD
EOF

echo ""
echo "✅ Environment variables set!"
echo ""
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Get your deployment URL and test with:"
echo "  curl https://your-domain.vercel.app/api/agent/health"
