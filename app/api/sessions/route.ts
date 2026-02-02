import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { session as sessionTable } from "@/lib/schema"
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq, desc } from "drizzle-orm"

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessions = await db.select().from(sessionTable).where(eq(sessionTable.userId, session.user.id)).orderBy(desc(sessionTable.createdAt))

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Failed to fetch sessions:", error)
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId, terminateAll } = await request.json()

    if (terminateAll) {
      await db.delete(sessionTable).where(eq(sessionTable.userId, session.user.id))
    } else if (sessionId) {
      await db.delete(sessionTable).where(eq(sessionTable.id, sessionId))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to terminate session:", error)
    return NextResponse.json({ error: "Failed to terminate session" }, { status: 500 })
  }
}
