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
- Node >= 18.18

Install
- npm install

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
- Node 18 environment
- Build and publish settings

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
- App state (library, recents, queue, current slide) is stored in localStorage under `lyric-slides:app-state`
- To reset, clear browser storage or remove that key

Contributing
- Code style is enforced by ESLint and Prettier
- Prefer strict TypeScript types; avoid any
- Add unit tests for utilities and complex view logic

License
- MIT
