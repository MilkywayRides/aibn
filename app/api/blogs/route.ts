import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { blog } from "@/lib/schema"
import { desc } from "drizzle-orm"

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Math.random().toString(36).substring(2, 8)
}

export async function POST(request: NextRequest) {
  const { title, content, userId } = await request.json()
  
  if (!title || !content || !userId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  
  const slug = generateSlug(title)
  const blogId = Math.random().toString(36).substring(2)
  
  await db.insert(blog).values({
    id: blogId,
    userId,
    title,
    content,
    slug,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  
  return NextResponse.json({ success: true, slug })
}

export async function GET() {
  const blogs = await db.select().from(blog).orderBy(desc(blog.createdAt))
  return NextResponse.json({ blogs })
}
