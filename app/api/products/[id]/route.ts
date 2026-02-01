import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { product } from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const { name, description, price, stock, image } = await request.json()
  
  await db.update(product)
    .set({ 
      name,
      description,
      price,
      stock,
      image,
      updatedAt: new Date() 
    })
    .where(eq(product.id, id))
  
  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  
  await db.delete(product).where(eq(product.id, id))
  
  return NextResponse.json({ success: true })
}
