#!/bin/bash

echo "🔍 Verifying Railway deployment..."
echo ""

echo "1. Checking health endpoint..."
curl -s https://www.daamitha.gallery/api/agent/health | json_pp
echo ""

echo "2. Checking environment variables..."
curl -s https://www.daamitha.gallery/api/agent/debug-env | json_pp | grep -A 10 "relevantVars"
echo ""

echo "3. Testing chat endpoint..."
curl -X POST https://www.daamitha.gallery/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}' \
  -s | json_pp | head -20

echo ""
echo "✅ Verification complete!"
