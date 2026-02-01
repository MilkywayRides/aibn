import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { blog } from "@/lib/schema"
import { eq, or } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  
  // Try to find by id or slug
  const result = await db.select().from(blog)
    .where(or(eq(blog.id, id), eq(blog.slug, id)))
    .limit(1)
  
  if (result.length === 0) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 })
  }
  
  return NextResponse.json({ blog: result[0] })
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const { title, content } = await request.json()
  
  await db.update(blog)
    .set({ 
      title, 
      content, 
      updatedAt: new Date() 
    })
    .where(eq(blog.id, id))
  
  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  
  await db.delete(blog).where(eq(blog.id, id))
  
  return NextResponse.json({ success: true })
}
