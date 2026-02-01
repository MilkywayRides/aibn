import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { product } from "@/lib/schema"
import { eq, desc } from "drizzle-orm"

export async function POST(request: NextRequest) {
  const { name, description, price, stock, image, userId } = await request.json()
  
  const productId = Math.random().toString(36).substring(2)
  
  await db.insert(product).values({
    id: productId,
    userId,
    name,
    description,
    price,
    stock,
    image,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  
  return NextResponse.json({ success: true })
}

export async function GET() {
  const products = await db.select().from(product).orderBy(desc(product.createdAt))
  return NextResponse.json({ products })
}
