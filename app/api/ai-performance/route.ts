import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { message, chat } from "@/lib/schema"
import { eq, and, isNotNull } from "drizzle-orm"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const feedbackType = searchParams.get("type") // 'like' | 'dislike' | 'all'

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const conditions = [
      eq(chat.userId, userId),
      isNotNull(message.feedback)
    ]

    if (feedbackType && feedbackType !== 'all') {
      conditions.push(eq(message.feedback, feedbackType))
    }

    const messages = await db
      .select({
        id: message.id,
        role: message.role,
        content: message.content,
        feedback: message.feedback,
        userComment: message.userComment,
        createdAt: message.createdAt,
        chatId: message.chatId,
      })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(eq(chat.userId, userId))
      .orderBy(message.createdAt)

    // Group messages by chatId and pair questions with answers
    const chatGroups: Record<string, any[]> = {}
    messages.forEach(msg => {
      if (!chatGroups[msg.chatId]) chatGroups[msg.chatId] = []
      chatGroups[msg.chatId].push(msg)
    })

    // Find question-answer pairs where answer has feedback
    const result: any[] = []
    Object.values(chatGroups).forEach(chatMessages => {
      for (let i = 0; i < chatMessages.length; i++) {
        const msg = chatMessages[i]
        if (msg.role === 'assistant' && msg.feedback) {
          // Find the previous user message
          let question = null
          for (let j = i - 1; j >= 0; j--) {
            if (chatMessages[j].role === 'user') {
              question = chatMessages[j].content
              break
            }
          }
          
          // Apply feedback filter
          if (!feedbackType || feedbackType === 'all' || msg.feedback === feedbackType) {
            result.push({
              ...msg,
              question
            })
          }
        }
      }
    })

    return NextResponse.json({ messages: result })
  } catch (error) {
    console.error("AI Performance error:", error)
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 })
  }
}
