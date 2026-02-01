import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { chat, message, blog, product } from "@/lib/schema"
import { eq, desc } from "drizzle-orm"

function generateChatId() {
  return Math.random().toString(36).substring(2, 10)
}

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Math.random().toString(36).substring(2, 8)
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
  
  // Check if user wants to create a blog
  const createBlogKeywords = ["create blog", "write blog", "generate blog", "make blog", "blog post"]
  const shouldCreateBlog = context === "create-blog" || createBlogKeywords.some(keyword => userMessage.toLowerCase().includes(keyword))
  
  // Check if user wants to create a product - detect by keywords or product-like content
  const createProductKeywords = ["create product", "add product", "new product", "generate product"]
  const hasProductKeywords = createProductKeywords.some(keyword => userMessage.toLowerCase().includes(keyword))
  
  // Detect product-like content: mentions price, stock, and product description
  const hasPriceInfo = /(\$|price|dollars?|cost)/i.test(userMessage)
  const hasStockInfo = /(stock|left|available|quantity|units?|have \d+)/i.test(userMessage)
  const hasImageUrl = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i.test(userMessage)
  
  const shouldCreateProduct = context === "create-product" || hasProductKeywords || 
    (hasPriceInfo && hasStockInfo) || (hasPriceInfo && hasImageUrl)
  
  // Check if user wants to manage products
  const shouldManageProducts = context === "manage-products"
  
  // Get AI response
  const apiSecret = process.env.AI_API_SECRET
  const apiUrl = process.env.AI_MODEL_URL_V2
  
  if (!apiSecret || !apiUrl) {
    return NextResponse.json({ error: "AI configuration missing" }, { status: 500 })
  }
  
  let aiPrompt = userMessage
  if (shouldCreateBlog) {
    aiPrompt = `You are a blog creation assistant. Generate a blog post based on the user's request: "${userMessage}"

IMPORTANT: You MUST format your response EXACTLY like this:
TITLE: [Write a clear, engaging blog title here]
CONTENT: [Write the full blog content here in markdown format]

Do not add any other text before or after this format. Start directly with "TITLE:" and then "CONTENT:".`
  } else if (shouldCreateProduct) {
    // Extract image URL from user message if present
    const imageUrlMatch = userMessage.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)[^\s]*/i)
    const imageUrl = imageUrlMatch ? imageUrlMatch[0] : ""
    
    aiPrompt = `You are a product creation assistant. Generate a product based on: "${userMessage}"

IMPORTANT: You MUST format your response EXACTLY as JSON:
{
  "name": "product name",
  "description": "detailed product description",
  "price": "suggested price as number only",
  "stock": "suggested stock quantity as number only",
  "image": "${imageUrl}"
}

Only return the JSON, nothing else.`
  } else if (shouldManageProducts) {
    aiPrompt = `You are a product management assistant. Help the user with: "${userMessage}"

Provide advice on product management, inventory, pricing strategies, or answer questions about their products.`
  }
  
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
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: `AI service error: ${response.status}` }, { status: response.status })
  }

  const data = await response.json()
  let aiResponse = data.content
  
  // If creating blog, parse and save it
  if (shouldCreateBlog) {
    const titleMatch = aiResponse.match(/TITLE:\s*(.+?)(?:\n|$)/i)
    const contentMatch = aiResponse.match(/CONTENT:\s*([\s\S]+)/i)
    
    if (titleMatch && contentMatch) {
      const blogTitle = titleMatch[1].trim()
      const blogContent = contentMatch[1].trim()
      const slug = generateSlug(blogTitle)
      const blogId = Math.random().toString(36).substring(2)
      
      await db.insert(blog).values({
        id: blogId,
        userId,
        title: blogTitle,
        content: blogContent,
        slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      const blogUrl = `${process.env.BETTER_AUTH_URL}/api/blogs/${slug}`
      
      // Clean response - only show the success message
      aiResponse = `✅ **Blog Published Successfully!**

**Title:** ${blogTitle}

**API URL:** ${blogUrl}

Your blog has been created and is now publicly accessible via the API endpoint above.`
    } else {
      aiResponse += `\n\n⚠️ Could not parse blog format. Please ensure the response contains TITLE: and CONTENT: sections.`
    }
  }
  
  // If creating product, parse and save it
  if (shouldCreateProduct) {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const productData = JSON.parse(jsonMatch[0])
        const productId = Math.random().toString(36).substring(2)
        
        await db.insert(product).values({
          id: productId,
          userId,
          name: productData.name,
          description: productData.description,
          price: productData.price.toString(),
          stock: productData.stock.toString(),
          image: productData.image || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        
        aiResponse = `✅ **Product Created Successfully!**

**Name:** ${productData.name}
**Price:** $${productData.price}
**Stock:** ${productData.stock} units
${productData.image ? `**Image:** Added ✓` : ''}

**Description:** ${productData.description}

Your product has been added to the inventory. You can view and manage it in the Products page.`
      }
    } catch (error) {
      aiResponse += `\n\n⚠️ Could not parse product data. Please try again.`
    }
  }
  
  // Save AI response
  await db.insert(message).values({
    id: Math.random().toString(36).substring(2),
    chatId: currentChatId,
    role: "assistant",
    content: aiResponse,
    createdAt: new Date(),
  })
  
  return NextResponse.json({ content: aiResponse, chatId: currentChatId })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 })
  }
  
  const chats = await db.select().from(chat).where(eq(chat.userId, userId)).orderBy(desc(chat.updatedAt))
  
  return NextResponse.json({ chats })
}
