#!/bin/bash

echo "🚀 Deploying BlazeAI v2 (Qwen2.5-Coder-1.5B) to Modal..."

cd "$(dirname "$0")"

# Deploy to Modal
modal deploy modal_app_v2.py

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Update your .env file with the new endpoint:"
echo "AI_MODEL_URL=\"https://work-ankit-mail--ai-model-server-v2-fastapi-app.modal.run\""
echo ""
echo "🔑 Keep your existing AI_API_SECRET"
