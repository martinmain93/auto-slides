import type { Song, Slide } from '../types'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// Parse a ProPresenter text export similar to load_propresenter_export.py
// The format is:
//   Title: <Song Title>\n\n
//   <Slide 1 text>\n\n
//   <Slide 2 text> ...
export function parseProPresenterExport(text: string): Song[] {
  if (!text) return []

  // Normalize newlines
  const content = text.replace(/\r\n?/g, '\n')

  // Split into chunks by 'Title: '
  const rawSongs = content.split('Title: ')

  const songs: Song[] = []
  for (const raw of rawSongs) {
    const sections = raw.split('\n\n')
    const rawTitle = (sections[0] || '').trim()
    const slidesRaw = sections.slice(1)

    // Skip any chunks without a valid title or slides
    const slidesTexts = slidesRaw
      .map((s) => s.trim())
      .filter((s) => s.length)

    if (!rawTitle || slidesTexts.length === 0) continue

    // Build Song
    const baseId = slugify(rawTitle) || 'song'
    const songId = baseId

    const slides: Slide[] = slidesTexts.map((t, idx) => ({
      id: `${baseId}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
      text: t,
    }))

    songs.push({ id: songId, title: rawTitle, slides })
  }

  // Deduplicate consecutive duplicates by title if any accidental duplicates exist
  const byId = new Map<string, Song>()
  for (const s of songs) {
    if (!byId.has(s.id)) byId.set(s.id, s)
    else {
      // If duplicate id/title exists, make a unique id by suffixing
      const uniqueId = `${s.id}-${Math.random().toString(36).slice(2, 5)}`
      byId.set(uniqueId, { ...s, id: uniqueId })
    }
  }

  return Array.from(byId.values())
}
