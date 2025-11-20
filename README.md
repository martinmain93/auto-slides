# Auto Presenter

A modern web application for planning, editing, and presenting song lyrics in real-time. Built with React, TypeScript, and Vite.

## Project Structure

This repository contains:

- **`lyric-slides/`** - The main application (React/TypeScript frontend)
- **`legacy/`** - Legacy Django backend code (experimental, not actively maintained)

## Quick Start

The main application is in the `lyric-slides` directory. See the [lyric-slides README](./lyric-slides/README.md) for detailed setup and usage instructions.

### Prerequisites

- Node.js >= 20.0.0
- npm or yarn

### Installation

```bash
cd lyric-slides
npm install
```

### Development

```bash
cd lyric-slides
npm run dev
```

### Building

```bash
cd lyric-slides
npm run build
```

## Features

- **Plan a set**: Search your library, queue songs, and reorder with drag-and-drop
- **Edit songs inline**: Separate slides by blank lines, with automatic section detection
- **Present mode**: Keyboard-driven navigation with start/end blank slides for smooth transitions
- **Quick access**: Recent picks and live slide preview
- **Import**: Parse ProPresenter .txt exports into your library
- **Share setlists**: Generate shareable links that import songs and queues into another account
- **Cloud sync**: Optional Supabase integration for cross-device synchronization

## Legacy Code

The `legacy/` directory contains experimental Django backend code that was used during early development. This code is not actively maintained and is kept for reference only. The current application is a fully client-side React application with optional cloud sync via Supabase.

## License

MIT

