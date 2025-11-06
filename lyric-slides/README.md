# Auto Presenter (Lyric Slides)

Plan, edit, and present song lyrics from your browser. Built with React, TypeScript, Vite, and Mantine.

Features
- Plan a set: search your library, queue songs, and reorder with drag-and-drop
- Edit songs inline: separate slides by blank lines, with automatic section detection (Verse, Chorus, Bridge, etc.)
- Present mode: keyboard-driven navigation with start/end blank slides for smooth transitions
- Quick access: recent picks and live slide preview
- Import: parse ProPresenter .txt exports into your library

Getting Started
Requirements
- Node >= 20.0.0

Install
- npm install

Environment Variables (for cloud sync)
Create a `.env` file in the `lyric-slides` directory with your Supabase credentials:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

To get these values:
1. Create a free account at [Supabase](https://supabase.com)
2. Create a new project
3. Go to Project Settings → API
4. Copy the "Project URL" and "anon public" key
5. Run the SQL schema in `supabase-schema.sql` in the SQL Editor

Development
- npm run dev

Build & Preview
- npm run build
- npm run preview

Deployment (Netlify)
1. Push your code to GitHub
2. Go to [Netlify](https://app.netlify.com) and sign in
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repository
5. Netlify will auto-detect the settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"
7. Your site will be live at `https://your-site-name.netlify.app`

The `netlify.toml` file is already configured with:
- SPA routing (all routes redirect to index.html)
- Node 20 environment
- Build and publish settings

For Netlify deployment with Supabase:
1. Add environment variables in Netlify dashboard:
   - Go to Site settings → Environment variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Configure OAuth providers in Supabase:
   - Go to Authentication → Providers
   - Enable Google and/or Apple OAuth
   - Add redirect URLs (your Netlify domain)

Tests
- Unit tests: npm run test
- Watch mode: npm run test:watch
- E2E tests: npm run test:e2e

Linting & Formatting
- Lint: npm run lint
- Format: npm run format

Keyboard Shortcuts (Present mode)
- Space or Right Arrow: Next slide
- Left Arrow: Previous slide
- Down Arrow: Next song
- Up Arrow: Previous song
- Esc: Return to planner

Import Format (ProPresenter .txt)
The importer expects blocks separated by blank lines following a Title header.

Example:
Title: Amazing Grace

Amazing grace! how sweet the sound
That saved a wretch like me!

I once was lost, but now am found;
Was blind, but now I see.

Notes
- Each blank-line-separated block becomes a slide
- Multiple songs can exist in a single file by repeating `Title: <Name>` headers

State Persistence
- **When logged in**: App state (library, recents, queue) is synced to Supabase cloud storage
- **When not logged in**: App state is stored in localStorage under `lyric-slides:app-state`
- Data automatically syncs when you sign in/out
- To reset, clear browser storage or sign out

Authentication
- Sign in with Google or Apple OAuth
- Your library and setlists are automatically synced across devices
- No account required for local-only usage

Contributing
- Code style is enforced by ESLint and Prettier
- Prefer strict TypeScript types; avoid any
- Add unit tests for utilities and complex view logic

License
- MIT
