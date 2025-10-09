#!/bin/bash

# Railway API Deployment Script
# Get your token from: https://railway.app/account/tokens

if [ -z "$RAILWAY_TOKEN" ]; then
    echo "❌ RAILWAY_TOKEN environment variable not set"
    echo "Get your token from: https://railway.app/account/tokens"
    echo "Then run: export RAILWAY_TOKEN=your_token_here"
    exit 1
fi

if [ -z "$RAILWAY_PROJECT_ID" ]; then
    echo "❌ RAILWAY_PROJECT_ID environment variable not set"
    echo "Find it in your Railway project settings"
    exit 1
fi

if [ -z "$RAILWAY_ENVIRONMENT_ID" ]; then
    echo "❌ RAILWAY_ENVIRONMENT_ID environment variable not set"
    echo "Find it in your Railway environment settings"
    exit 1
fi

# Source .env
set -a
source .env
set +a

echo "🚀 Deploying variables via Railway API..."

# Function to set a variable
set_variable() {
    local key=$1
    local value=$2

    curl -X POST https://backboard.railway.app/graphql/v2 \
        -H "Authorization: Bearer $RAILWAY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"query\": \"mutation VariableUpsert(\$input: VariableUpsertInput!) { variableUpsert(input: \$input) }\",
            \"variables\": {
                \"input\": {
                    \"projectId\": \"$RAILWAY_PROJECT_ID\",
                    \"environmentId\": \"$RAILWAY_ENVIRONMENT_ID\",
                    \"name\": \"$key\",
                    \"value\": \"$value\"
                }
            }
        }" -s | jq

    echo "✅ Set $key"
}

# Set all variables
set_variable "OPENAI_API_KEY" "$OPENAI_API_KEY"
set_variable "JWT_SECRET" "$JWT_SECRET"
set_variable "CHATKIT_WORKFLOW_ID" "$CHATKIT_WORKFLOW_ID"
set_variable "ADMIN_EMAIL" "$ADMIN_EMAIL"
set_variable "ADMIN_PASSWORD" "$ADMIN_PASSWORD"
set_variable "NODE_ENV" "production"

echo ""
echo "✅ All variables deployed!"
