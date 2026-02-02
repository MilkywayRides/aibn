import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const provider = process.env.STORAGE_PROVIDER || 'supabase'

// Supabase client
const supabase = provider === 'supabase' ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) : null

// AWS S3 client
const s3 = provider === 'aws' ? new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
}) : null

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const path = formData.get('path') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = `${Date.now()}-${file.name}`
    const filePath = path ? `${path}/${fileName}` : fileName

    if (provider === 'supabase' && supabase) {
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(data.path)

      return NextResponse.json({ url: publicUrl, path: data.path })
    } else if (provider === 'aws' && s3) {
      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: filePath,
        Body: buffer,
        ContentType: file.type,
      }))

      const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`
      return NextResponse.json({ url, path: filePath })
    }

    return NextResponse.json({ error: 'Invalid storage provider' }, { status: 500 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { path } = await req.json()

    if (!path) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 })
    }

    if (provider === 'supabase' && supabase) {
      const { error } = await supabase.storage
        .from('uploads')
        .remove([path])

      if (error) throw error
    } else if (provider === 'aws' && s3) {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: path,
      }))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
