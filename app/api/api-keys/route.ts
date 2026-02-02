import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { apiKey as apiKeyTable } from "@/lib/schema"
import { encrypt, decrypt } from "@/lib/encryption"
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const keys = await db.select().from(apiKeyTable).where(eq(apiKeyTable.userId, session.user.id))

    // Return providers without exposing actual keys
    const providers = keys.reduce((acc, key) => {
      acc[key.provider] = true
      return acc
    }, {} as Record<string, boolean>)

    return NextResponse.json({ providers })
  } catch (error) {
    console.error("Failed to fetch API keys:", error)
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider, apiKey } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json({ error: "Provider and API key are required" }, { status: 400 })
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey)

    // Check if key exists for this provider
    const existing = await db.select().from(apiKeyTable).where(
      and(
        eq(apiKeyTable.userId, session.user.id),
        eq(apiKeyTable.provider, provider)
      )
    )

    if (existing.length > 0) {
      // Update existing key
      await db.update(apiKeyTable)
        .set({ encryptedKey, updatedAt: new Date() })
        .where(eq(apiKeyTable.id, existing[0].id))
    } else {
      // Insert new key
      await db.insert(apiKeyTable).values({
        id: nanoid(),
        userId: session.user.id,
        provider,
        encryptedKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to save API key:", error)
    return NextResponse.json({ error: "Failed to save API key" }, { status: 500 })
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

    const { provider } = await request.json()

    await db.delete(apiKeyTable).where(
      and(
        eq(apiKeyTable.userId, session.user.id),
        eq(apiKeyTable.provider, provider)
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete API key:", error)
    return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 })
  }
}

// Helper function to get decrypted API key (for internal use only)
export async function getDecryptedApiKey(userId: string, provider: string): Promise<string | null> {
  try {
    const keys = await db.select().from(apiKeyTable).where(
      and(
        eq(apiKeyTable.userId, userId),
        eq(apiKeyTable.provider, provider)
      )
    )

    if (keys.length === 0) return null

    return decrypt(keys[0].encryptedKey)
  } catch (error) {
    console.error("Failed to decrypt API key:", error)
    return null
  }
}
