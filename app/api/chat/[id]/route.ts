import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { chat, message } from "@/lib/schema"
import { eq, asc } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt))

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Failed to get chat messages:", error)
    return NextResponse.json({ messages: [] })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    await db.delete(chat).where(eq(chat.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete chat:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    const { favorite } = await request.json()

    await db.update(chat)
      .set({ favorite })
      .where(eq(chat.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update chat:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
