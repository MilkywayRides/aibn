# BlazeAI Model Server

Self-hosted AI model server on Modal.com for flowchart code generation and chat.

## Models

### v1 - Phi-2 (Current)
- **Model**: microsoft/phi-2
- **Size**: 2.7B parameters
- **GPU**: A10G
- **Cost**: ~$1.10/hour
- **Quality**: Good for general tasks

### v2 - Qwen2.5-Coder-1.5B (Recommended)
- **Model**: Qwen/Qwen2.5-Coder-1.5B-Instruct
- **Size**: 1.5B parameters
- **GPU**: T4
- **Cost**: ~$0.60/hour (45% cheaper!)
- **Quality**: Better for code generation
- **Features**: Optimized for coding tasks, faster inference

## Deployment

### Deploy v2 (Recommended)
```bash
cd ai-server
./deploy_v2.sh
```

### Deploy v1 (Original)
```bash
cd ai-server
modal deploy modal_app.py
```

## Update Environment

After deploying v2, update your `.env`:

```env
# For v2 (Qwen2.5-Coder)
AI_MODEL_URL="https://work-ankit-mail--ai-model-server-v2-fastapi-app.modal.run"

# Keep existing secret
AI_API_SECRET="843468041e6e1d32f94609992d3c0563fdb51e4d9edb62c4e8174f47e9e92562"
```

## API Usage

### Chat Completions
```bash
curl -X POST "$AI_MODEL_URL/v1/chat/completions" \
  -H "Authorization: Bearer $AI_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Generate a simple flowchart"}
    ],
    "max_tokens": 2000,
    "temperature": 0.7
  }'
```

### Health Check
```bash
curl "$AI_MODEL_URL/health"
```

## Cost Comparison

| Model | GPU | Cost/Hour | Monthly (100h) | Quality |
|-------|-----|-----------|----------------|---------|
| Phi-2 | A10G | $1.10 | $110 | Good |
| Qwen2.5-Coder | T4 | $0.60 | $60 | Better for code |

**Savings with v2**: $50/month (45% reduction)

## Why Qwen2.5-Coder?

1. **Optimized for Code**: Trained specifically for code generation
2. **Better Output**: More accurate flowchart code
3. **Faster**: Smaller model = faster inference
4. **Cheaper**: Runs on T4 instead of A10G
5. **Chat Template**: Built-in support for multi-turn conversations

## Monitoring

View logs and metrics:
```bash
modal app logs ai-model-server-v2
```

## Switching Between Models

You can run both models simultaneously and switch by changing `AI_MODEL_URL` in your `.env` file.
