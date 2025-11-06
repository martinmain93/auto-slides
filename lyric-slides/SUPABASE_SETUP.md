# Supabase Setup Guide

This guide will help you set up Supabase for authentication and cloud storage.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name**: Your project name (e.g., "lyric-slides")
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
4. Wait for the project to be created (~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
3. Add them to your `.env` file (see Step 5 below)

## Step 3: Set Up the Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

This creates:
- `user_libraries` table (stores songs)
- `user_setlists` table (stores queue and recents)
- Row Level Security policies (users can only access their own data)

## Step 4: Configure OAuth Providers

### Google OAuth

1. Go to **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **Enable Google provider**
4. You'll need to create OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: Add `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret** to Supabase
5. Add your site URL to **Redirect URLs**:
   - For local dev: `http://localhost:5173`
   - For production: `https://your-site.netlify.app`

### Apple OAuth (Optional)

1. Go to **Authentication** → **Providers**
2. Find **Apple** and click to expand
3. Toggle **Enable Apple provider**
4. You'll need:
   - Apple Developer account
   - Service ID
   - Key ID and Private Key
   - See [Supabase Apple OAuth docs](https://supabase.com/docs/guides/auth/social-login/auth-apple) for details

## Step 5: Configure Environment Variables

### For Local Development

Create a `.env` file in the `lyric-slides` directory:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### For Netlify Deployment

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Redeploy your site

## Step 6: Test It Out

1. Start your dev server: `npm run dev`
2. Click "Sign in" in the top right
3. Try signing in with Google
4. Add some songs to your library
5. Sign out and sign back in - your data should persist!

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure your `.env` file exists and has the correct variable names
- Restart your dev server after creating/editing `.env`

### OAuth redirect not working
- Check that your redirect URL in Supabase matches exactly (including `http://` vs `https://`)
- For local dev, use `http://localhost:5173` (or your Vite port)
- For production, use your full Netlify URL

### Data not syncing
- Check browser console for errors
- Verify RLS policies are enabled in Supabase
- Make sure you're signed in (check the auth button)

## Security Notes

- The `anon` key is safe to use in the frontend (it's public)
- Row Level Security (RLS) ensures users can only access their own data
- Never commit your `.env` file to git (it's already in `.gitignore`)

