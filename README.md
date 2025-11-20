# Auto Presenter

A modern web application for planning, editing, and presenting song lyrics in real-time. Built with React, TypeScript, and Vite.

See a running version here:

https://church-slides.netlify.app/

- Front end serving by Netlify
- Backend database and auth by Supabase

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
- **Voice recognition**: Automatic slide navigation based on spoken lyrics (see [Voice Recognition](#voice-recognition) below)
- **Quick access**: Recent picks and live slide preview
- **Import**: Parse ProPresenter .txt exports into your library
- **Share setlists**: Generate shareable links that import songs and queues into another account
- **Cloud sync**: Optional Supabase integration for cross-device synchronization

## Voice Recognition

Auto Presenter includes voice recognition capabilities that automatically advance slides based on spoken lyrics during live presentations.

### Capabilities

- **Real-time speech recognition**: Uses the browser's Web Speech API to transcribe spoken lyrics in real-time
- **Phonetic matching**: Converts both spoken words and slide text to phonetic representations for robust matching
- **Automatic slide advancement**: Detects when you've reached the end of a slide and automatically advances to the next
- **Position tracking**: Tracks your position within the current slide to determine when to advance
- **Recency bias**: Prevents rapid slide changes by applying higher confidence thresholds immediately after a slide change
- **Enhanced audio processing** (optional): Advanced mode with noise reduction, vocal enhancement, and music suppression for better recognition in noisy environments
- **Low confidence handling**: Automatically shows blank slides when confidence is too low to match any slide

### Limitations

- **Browser dependency**: Requires browser support for Web Speech API (Chrome, Edge, Safari 14.1+)
- **Background noise**: Recognition accuracy decreases significantly with background music or ambient noise, even with enhanced audio processing
- **Speech clarity**: Works best with clear, well-enunciated speech; may struggle with accents, fast speech, or unclear pronunciation
- **Confidence thresholds**: Current thresholds (30-92% depending on context) may need manual adjustment for different environments
- **No musical timing**: Currently relies solely on phonetic matching; doesn't use musical timing or rhythm information
- **Single language**: Optimized for English (en-US); other languages may have reduced accuracy

### Planned Improvements

- **Better anticipation**: Anticipate the next slide when confidence is high and words align with the end of the current slide
- **Improved accuracy**: Fine-tune confidence thresholds and matching algorithms based on real-world usage data
- **Musical timing integration**: Incorporate musical timing and rhythm information to improve slide synchronization
- **Cross-song matching**: When confidence drops for the current song, search across the entire library for better matches
- **Testing framework**: Implement automated testing with a corpus of songs and ground truth slide progressions to measure accuracy and prevent regressions
- **Custom model training**: Explore training a custom, efficient model that utilizes both musical and lyrical information
- **Better error recovery**: Improve handling of recognition errors and transient failures

## Legacy Code

The `legacy/` directory contains experimental Django backend code that was used during early development. This code is not actively maintained and is kept for reference only. The current application is a fully client-side React application with optional cloud sync via Supabase.

## License

MIT

