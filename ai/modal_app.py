import modal
from fastapi import FastAPI
from pydantic import BaseModel

app = modal.App("blazeneuro-ai")

image = modal.Image.debian_slim().pip_install(
    "fastapi",
    "transformers",
    "torch",
    "accelerate",
)

web_app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    max_tokens: int = 500
    temperature: float = 0.7

@web_app.post("/chat")
async def chat(request: ChatRequest):
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch
    
    model_name = "Qwen/Qwen2.5-0.5B-Instruct"
    
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float16,
        device_map="auto",
    )
    
    messages = [{"role": "user", "content": request.message}]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    outputs = model.generate(
        **inputs,
        max_new_tokens=request.max_tokens,
        temperature=request.temperature,
        do_sample=True,
        pad_token_id=tokenizer.eos_token_id,
    )
    
    response = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
    
    return {"response": response.strip()}

@web_app.get("/health")
async def health():
    return {"status": "healthy"}

@app.function(
    image=image,
    gpu="T4",
    timeout=300,
    container_idle_timeout=120,
)
@modal.asgi_app()
def fastapi_app():
    return web_app
