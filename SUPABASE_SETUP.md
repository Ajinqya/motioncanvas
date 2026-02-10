# Supabase Setup Guide

Follow these steps to enable cloud sync and shared workspaces.

## 1. Create `.env.local` with your keys

Copy `.env.example` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings → API**.

## 2. Run the database migrations

1. Go to **Supabase Dashboard** → your project → **SQL Editor**
2. Click **New query**
3. Copy and paste the contents of `supabase/migrations/001_workspaces_and_sequences.sql`
4. Click **Run**
5. Create another new query, paste `supabase/migrations/002_public_animations_and_sequences.sql`, and run it

## 3. Enable Email auth (Magic Link)

1. Go to **Authentication → Providers**
2. Enable **Email**
3. Optionally enable **Confirm email** (if you want users to verify their email first)

Magic link sign-in is enabled by default — users enter their email and receive a sign-in link (no password needed).

## 4. Start the app

```bash
npm run dev
```

When Supabase is configured, you'll see a **Sign in** button in the Composer. After signing in, sequences save to the cloud and are shared across devices and collaborators in your workspace.
