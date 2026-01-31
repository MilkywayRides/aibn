#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 Deploying BlazeNeuro AI to Modal..."
modal deploy modal_app.py

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your endpoint will be:"
echo "https://[your-username]--blazeneuro-ai-fastapi-app.modal.run/chat"
