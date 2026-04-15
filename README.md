# AI Platform

A full-stack AI generation platform with Image, Video, and Voice studios.

## Features

- **Authentication** - Email/password auth with Supabase
- **Image Studio** - Generate images with DALL-E 3 and Flux
- **Video Studio** - Generate videos with Replicate (Minimax)
- **Voice Studio** - Text-to-speech with OpenAI TTS
- **Admin Panel** - User management, credit allocation
- **API Status Dashboard** - Real-time provider health monitoring
- **Credit System** - Track usage per generation

## Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (for database & auth)

## Environment Variables

Create a `.env.local` file with:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers (Add the ones you want to use)
OPENAI_API_KEY=your_openai_key
HUGGINGFACE_API_KEY=your_huggingface_key
REPLICATE_API_TOKEN=your_replicate_token
ELEVENLABS_API_KEY=your_elevenlabs_key
GROQ_API_KEY=your_groq_key
STABILITY_API_KEY=your_stability_key
```

## Local Development

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Set Up Database

Run these SQL scripts in order in your Supabase SQL Editor:

1. `scripts/001_create_tables.sql` - Creates tables and RLS policies
2. `scripts/002_profile_trigger.sql` - Creates profile on user signup
3. `scripts/003_fix_rls_policies.sql` - Fixes RLS infinite recursion

### 3. Create Admin Account

1. Sign up with your admin email (e.g., `andam@outlook.com`)
2. Confirm your email
3. Run `scripts/004_setup_admin.sql` to set admin role and credits

### 4. Start Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/
│   ├── api/                 # API routes
│   │   ├── admin/          # Admin endpoints
│   │   ├── image/          # Image generation
│   │   ├── video/          # Video generation
│   │   ├── tts/            # Text-to-speech
│   │   └── status/         # API status checks
│   ├── auth/               # Auth pages (login, signup)
│   └── dashboard/          # Protected dashboard pages
├── components/
│   ├── admin/              # Admin components
│   ├── dashboard/          # Dashboard layout components
│   ├── status/             # API status components
│   ├── studios/            # Generation studio components
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── supabase/           # Supabase clients
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Utility functions
└── scripts/                # SQL migration scripts
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/image/generate` | POST | Generate images |
| `/api/video/generate` | POST | Generate videos |
| `/api/tts/generate` | POST | Generate speech |
| `/api/status/check-all` | GET | Check all API statuses |
| `/api/admin/users` | GET/PUT/DELETE | User management |

## Credit Costs

| Generation Type | Credits |
|----------------|---------|
| Image | 10 |
| Video | 50 |
| Voice | 5 |

Admins have unlimited credits (999,999).

## Deployment

Deploy to Vercel:

```bash
vercel
```

Make sure to add all environment variables in your Vercel project settings.
