import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { message } = await request.json()
  
  const apiSecret = process.env.AI_API_SECRET
  const apiUrl = process.env.AI_MODEL_URL_V2
  
  if (!apiSecret || !apiUrl) {
    return NextResponse.json({ error: "AI configuration missing" }, { status: 500 })
  }
  
  const response = await fetch(`${apiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiSecret}`,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: message }],
      max_tokens: 1500,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: `AI service error: ${response.status}` }, { status: response.status })
  }

  const data = await response.json()
  return NextResponse.json({ content: data.content })
}
