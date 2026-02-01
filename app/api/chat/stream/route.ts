import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { chat, message } from "@/lib/schema"

function generateChatId() {
    return Math.random().toString(36).substring(2, 10)
}

async function generateChatTitle(firstMessage: string) {
    const prompt = `Generate a short 3-5 word title for a chat that starts with: "${firstMessage.substring(0, 100)}". Only return the title, nothing else.`

    try {
        const response = await fetch(`${process.env.AI_MODEL_URL_V2}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.AI_API_SECRET}`,
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: prompt }],
                max_tokens: 20,
                temperature: 0.7,
            }),
        })

        const data = await response.json()
        return data.content?.trim() || "New Chat"
    } catch {
        return "New Chat"
    }
}

export async function POST(request: NextRequest) {
    try {
        const { message: userMessage, chatId, userId, context } = await request.json()

        let currentChatId = chatId

        // Create new chat if no chatId provided
        if (!currentChatId) {
            currentChatId = generateChatId()
            const title = await generateChatTitle(userMessage)

            await db.insert(chat).values({
                id: currentChatId,
                userId,
                title,
                favorite: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
        }

        // Save user message
        await db.insert(message).values({
            id: Math.random().toString(36).substring(2),
            chatId: currentChatId,
            role: "user",
            content: userMessage,
            createdAt: new Date(),
        })

    const apiSecret = process.env.AI_API_SECRET
    const apiUrl = process.env.AI_MODEL_URL_V2

    if (!apiSecret || !apiUrl) {
        console.error("AI configuration missing:", { apiSecret: !!apiSecret, apiUrl: !!apiUrl })
        
        // Return mock response for development
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chatId: currentChatId, type: "start" })}\n\n`))
                
                const mockResponse = "I'm a mock AI response. Please configure AI_MODEL_URL_V2 and AI_API_SECRET in your .env.local file to use the real AI."
                const words = mockResponse.split(" ")
                
                for (const word of words) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: word + " ", type: "chunk" })}\n\n`))
                    await new Promise(resolve => setTimeout(resolve, 50))
                }
                
                await db.insert(message).values({
                    id: Math.random().toString(36).substring(2),
                    chatId: currentChatId,
                    role: "assistant",
                    content: mockResponse,
                    createdAt: new Date(),
                })
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
                controller.close()
            }
        })
        
        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        })
    }

    // Build prompt based on context
    let aiPrompt = userMessage
    if (context === "create-blog") {
        aiPrompt = `You are a blog creation assistant. Generate a blog post based on: "${userMessage}"
IMPORTANT: Format as:
TITLE: [title]
CONTENT: [markdown content]`
    } else if (context === "create-product") {
        aiPrompt = `Create a product from: "${userMessage}". Return only JSON: {"name":"","description":"","price":"","stock":"","image":""}`
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Send chatId immediately
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chatId: currentChatId, type: "start" })}\n\n`))

                // Try streaming first
                const response = await fetch(`${apiUrl}/v1/chat/completions`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiSecret}`,
                    },
                    body: JSON.stringify({
                        messages: [{ role: "user", content: aiPrompt }],
                        max_tokens: 1500,
                        temperature: 0.7,
                        stream: true,
                    }),
                })

                if (!response.ok) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "AI service error", type: "error" })}\n\n`))
                    controller.close()
                    return
                }

                const contentType = response.headers.get("content-type") || ""
                let fullContent = ""

                // Check if it's actually a streaming response
                if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
                    // Handle SSE streaming
                    const reader = response.body?.getReader()
                    if (!reader) {
                        controller.close()
                        return
                    }

                    const decoder = new TextDecoder()

                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

                        const chunk = decoder.decode(value, { stream: true })
                        const lines = chunk.split("\n").filter(line => line.trim())

                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const data = line.slice(6)
                                if (data === "[DONE]") continue

                                try {
                                    const parsed = JSON.parse(data)
                                    const content = parsed.choices?.[0]?.delta?.content || parsed.content || ""
                                    if (content) {
                                        fullContent += content
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content, type: "chunk" })}\n\n`))
                                    }
                                } catch {
                                    // Non-JSON chunk
                                    if (data && data !== "[DONE]") {
                                        fullContent += data
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data, type: "chunk" })}\n\n`))
                                    }
                                }
                            } else if (line.trim() && !line.startsWith(":")) {
                                // Raw text content
                                fullContent += line
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: line, type: "chunk" })}\n\n`))
                            }
                        }
                    }
                } else {
                    // Non-streaming JSON response - simulate streaming by sending word by word
                    const data = await response.json()
                    fullContent = data.content || data.choices?.[0]?.message?.content || ""

                    if (fullContent) {
                        // Stream word by word for a typing effect
                        const words = fullContent.split(" ")
                        for (let i = 0; i < words.length; i++) {
                            const word = words[i] + (i < words.length - 1 ? " " : "")
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: word, type: "chunk" })}\n\n`))
                            // Small delay between words for typing effect
                            await new Promise(resolve => setTimeout(resolve, 20))
                        }
                    }
                }

                // Save complete AI response
                if (fullContent) {
                    const messageId = Math.random().toString(36).substring(2)
                    await db.insert(message).values({
                        id: messageId,
                        chatId: currentChatId,
                        role: "assistant",
                        content: fullContent,
                        createdAt: new Date(),
                    })
                    
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", fullContent, messageId })}\n\n`))
                } else {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
                }
                controller.close()
            } catch (error) {
                console.error("Stream error:", error)
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream failed", type: "error" })}\n\n`))
                controller.close()
            }
        }
    })

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    })
    } catch (error) {
        console.error("POST error:", error)
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
            { 
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        )
    }
}
