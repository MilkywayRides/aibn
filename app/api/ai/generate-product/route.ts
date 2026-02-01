import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { prompt } = await request.json()
  
  const apiSecret = process.env.AI_API_SECRET
  const apiUrl = process.env.AI_MODEL_URL_V2
  
  if (!apiSecret || !apiUrl) {
    return NextResponse.json({ error: "AI configuration missing" }, { status: 500 })
  }
  
  const aiPrompt = `Generate a product based on this description: "${prompt}"

Format your response EXACTLY as JSON:
{
  "name": "product name",
  "description": "detailed product description",
  "price": "suggested price as number",
  "stock": "suggested stock quantity as number",
  "image": "suggested image URL or empty string"
}

Only return the JSON, nothing else.`

  try {
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiSecret}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: aiPrompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    const content = data.content.trim()
    
    // Try to parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const product = JSON.parse(jsonMatch[0])
      return NextResponse.json({ product })
    }
    
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
  } catch (error) {
    console.error("AI generation error:", error)
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 })
  }
}
