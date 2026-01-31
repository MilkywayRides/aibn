# BlazeNeuro AI Server

Simple Modal AI server using Qwen2.5-0.5B-Instruct (cheap and fast).

## Deploy

```bash
cd ai
modal deploy modal_app.py
```

## Features
- No authentication required (for development)
- Uses Qwen2.5-0.5B-Instruct (smallest, cheapest model)
- T4 GPU (cheapest GPU option)
- Auto-scales to zero when idle

## Endpoint
POST `/chat`
```json
{
  "message": "Your message here",
  "max_tokens": 500,
  "temperature": 0.7
}
```

Response:
```json
{
  "response": "AI response here"
}
```
