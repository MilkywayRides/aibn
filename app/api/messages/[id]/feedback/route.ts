import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { message } from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { feedback, userComment } = await req.json()
    
    console.log("Updating feedback for message:", id, { feedback, userComment })
    
    await db
      .update(message)
      .set({ feedback, userComment })
      .where(eq(message.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Feedback update error:", error)
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 })
  }
}
