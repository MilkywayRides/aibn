import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { field, value, context } = await request.json()
  
  const apiSecret = process.env.AI_API_SECRET
  const apiUrl = process.env.AI_MODEL_URL_V2
  
  if (!apiSecret || !apiUrl) {
    return NextResponse.json({ error: "AI configuration missing" }, { status: 500 })
  }
  
  let aiPrompt = ""
  
  if (field === "name") {
    aiPrompt = `Improve this product name to be more appealing and professional: "${value}"

Context: ${context.description}

Return ONLY the improved name, nothing else.`
  } else if (field === "description") {
    aiPrompt = `Improve this product description to be more detailed, engaging, and professional: "${value}"

Product name: ${context.name}
Price: $${context.price}

Return ONLY the improved description, nothing else.`
  }

  try {
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiSecret}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: aiPrompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    const improved = data.content.trim()
    
    return NextResponse.json({ improved })
  } catch (error) {
    console.error("AI improvement error:", error)
    return NextResponse.json({ error: "AI improvement failed" }, { status: 500 })
  }
}
