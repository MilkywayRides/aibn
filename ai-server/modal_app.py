import modal
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import os

# Create Modal app
app = modal.App("ai-model-server")

# Define image with dependencies
image = modal.Image.debian_slim().pip_install(
    "fastapi",
    "transformers",
    "torch",
    "accelerate",
)

# Secret for API authentication
AI_API_SECRET = modal.Secret.from_name("ai-api-secret")

web_app = FastAPI()

# Global model cache
model_cache = {}

class ChatRequest(BaseModel):
    messages: list[dict]
    max_tokens: int = 1000
    temperature: float = 0.7

class ChatResponse(BaseModel):
    content: str
    model: str
    usage: dict

def verify_api_key(authorization: str = Header(None)):
    """Verify API key from request header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization.replace("Bearer ", "")
    expected_token = os.environ.get("AI_API_SECRET")
    
    if token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid API key")

@web_app.post("/v1/chat/completions", response_model=ChatResponse)
async def chat_completions(request: ChatRequest, authorization: str = Header(None)):
    """OpenAI-compatible chat completions endpoint"""
    verify_api_key(authorization)
    
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch
    
    model_name = "microsoft/phi-2"
    
    # Load model (cached after first load)
    if "model" not in model_cache:
        model_cache["tokenizer"] = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        model_cache["model"] = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16,
            device_map="auto",
            trust_remote_code=True
        )
    
    tokenizer = model_cache["tokenizer"]
    model = model_cache["model"]
    
    # Format messages
    prompt = ""
    for msg in request.messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            prompt += f"System: {content}\n"
        elif role == "user":
            prompt += f"User: {content}\n"
        elif role == "assistant":
            prompt += f"Assistant: {content}\n"
    prompt += "Assistant:"
    
    # Generate
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    outputs = model.generate(
        **inputs,
        max_new_tokens=request.max_tokens,
        temperature=request.temperature,
        do_sample=True,
        pad_token_id=tokenizer.eos_token_id
    )
    
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    response = response.split("Assistant:")[-1].strip()
    
    return {
        "content": response,
        "model": model_name,
        "usage": {
            "prompt_tokens": len(inputs.input_ids[0]),
            "completion_tokens": len(outputs[0]) - len(inputs.input_ids[0]),
            "total_tokens": len(outputs[0])
        }
    }

@web_app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.function(
    image=image,
    gpu="A10G",
    secrets=[AI_API_SECRET],
    timeout=600,
    container_idle_timeout=300,
)
@modal.asgi_app()
def fastapi_app():
    return web_app
