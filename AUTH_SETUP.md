# Aibn-v1 Authentication Setup

## Prerequisites

1. **Neon Database**: Create a free database at [neon.tech](https://neon.tech)
2. **Google OAuth**: Get credentials from [Google Cloud Console](https://console.cloud.google.com)
3. **GitHub OAuth**: Get credentials from [GitHub Developer Settings](https://github.com/settings/developers)

## Setup Steps

### 1. Database Setup

```bash
# Copy environment variables
cp .env.example .env.local

# Add your Neon database URL to .env.local
DATABASE_URL="postgresql://user:password@host/database"

# Push schema to database
npm run db:push
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to `.env.local`

### 3. GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Secret to `.env.local`

### 4. Generate Auth Secret

```bash
# Generate a random secret
openssl rand -base64 32

# Add to .env.local as BETTER_AUTH_SECRET
```

### 5. Run the App

```bash
npm run dev
```

Visit `http://localhost:3000/login` to test authentication!

## Environment Variables

See `.env.example` for all required variables.
