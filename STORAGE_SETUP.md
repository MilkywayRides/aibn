# Storage Setup Guide

## Supabase Setup (Default)

1. Create a Supabase project at https://supabase.com
2. Go to Storage and create a bucket named `uploads`
3. Set the bucket to public or configure RLS policies
4. Add to `.env.local`:
```env
STORAGE_PROVIDER="supabase"
NEXT_PUBLIC_SUPABASE_URL="your-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

## AWS S3 Setup (Alternative)

1. Create an S3 bucket in AWS Console
2. Configure bucket permissions for public access (if needed)
3. Create IAM user with S3 access
4. Add to `.env.local`:
```env
STORAGE_PROVIDER="aws"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="your-bucket-name"
```

## Features

- Max 5 files per upload
- Supports both Supabase and AWS S3
- Easy provider switching via environment variable
- File preview and removal before upload
