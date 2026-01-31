import modal
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import os

app = modal.App("ai-model-server-v2")

image = modal.Image.debian_slim().pip_install(
    "fastapi",
    "transformers",
    "torch",
    "accelerate",
    "bitsandbytes",
)

AI_API_SECRET = modal.Secret.from_name("ai-api-secret")

web_app = FastAPI()
model_cache = {}

class ChatRequest(BaseModel):
    messages: list[dict]
    max_tokens: int = 1500
    temperature: float = 0.7

class ChatResponse(BaseModel):
    content: str
    model: str
    usage: dict

def verify_api_key(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization.replace("Bearer ", "")
    expected_token = os.environ.get("AI_API_SECRET")
    
    if token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid API key")

@web_app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest, authorization: str = Header(None)):
    verify_api_key(authorization)
    
    from fastapi.responses import StreamingResponse
    from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer
    from threading import Thread
    import torch
    import json
    
    model_name = "Qwen/Qwen2.5-Coder-1.5B-Instruct"
    
    if "model" not in model_cache:
        model_cache["tokenizer"] = AutoTokenizer.from_pretrained(model_name)
        model_cache["model"] = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16,
            device_map="auto",
        )
    
    tokenizer = model_cache["tokenizer"]
    model = model_cache["model"]
    
    prompt = tokenizer.apply_chat_template(request.messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    streamer = TextIteratorStreamer(tokenizer, skip_special_tokens=True, skip_prompt=True)
    
    generation_kwargs = dict(
        **inputs,
        max_new_tokens=min(request.max_tokens, 1500),
        temperature=request.temperature,
        do_sample=request.temperature > 0,
        top_p=0.95,
        repetition_penalty=1.1,
        pad_token_id=tokenizer.eos_token_id,
        eos_token_id=tokenizer.eos_token_id,
        streamer=streamer,
    )
    
    thread = Thread(target=model.generate, kwargs=generation_kwargs)
    thread.start()
    
    def generate():
        for text in streamer:
            yield f"data: {json.dumps({'content': text})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@web_app.get("/health")
async def health():
    return {"status": "healthy", "model": "Qwen2.5-Coder-1.5B-Instruct"}

@app.function(
    image=image,
    gpu="T4",
    secrets=[AI_API_SECRET],
    timeout=600,
    scaledown_window=300,
)
@modal.asgi_app()
def fastapi_app():
    return web_app
