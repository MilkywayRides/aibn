import { getDecryptedApiKey } from "@/app/api/api-keys/route"

interface AIMessage {
  role: string
  content: string
}

export async function callOpenAI(messages: AIMessage[], model: string, userId: string) {
  const apiKey = await getDecryptedApiKey(userId, "openai")
  if (!apiKey) throw new Error("OpenAI API key not found")

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  })

  return response
}

export async function callClaude(messages: AIMessage[], model: string, userId: string) {
  const apiKey = await getDecryptedApiKey(userId, "claude")
  if (!apiKey) throw new Error("Claude API key not found")

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1500,
      stream: true,
    }),
  })

  return response
}

export async function callGemini(messages: AIMessage[], userId: string) {
  const apiKey = await getDecryptedApiKey(userId, "gemini")
  if (!apiKey) throw new Error("Gemini API key not found")

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      })),
    }),
  })

  return response
}
