import { getPhonemes } from '../lib/phonemeDict'
import { arpaToVec, normalize, PHONEME_DIM, cosine } from './phonemeMap'
import type { Vec } from './phonemeMap'
import { getSongIndex, putSongIndex, simpleHash } from '../lib/phonemeIndexStorage'

export type ContextVector = {
  // position index in the slide's phoneme sequence
  pos: number
  // concatenated context vector of size (N+1)*PHONEME_DIM
  vec: Vec
}

export type SlidePhonemeVectors = {
  slideId: string
  phonemes: string[]
  // context vectors for each phoneme position
  contexts: ContextVector[]
}

export type SongPhonemeIndex = {
  songId: string
  window: number
  slides: Record<string, SlidePhonemeVectors>
}

export type VectorizeOptions = {
  // Number of previous phonemes to include (context window). 0 means only current.
  window?: number
  // Exponential decay across the context (1.0 = no decay)
  decay?: number
}

function concatWindowVec(arpas: string[], center: number, window: number, decay: number): Vec {
  const W = window
  const dim = (W + 1) * PHONEME_DIM
  const out: number[] = Array(dim).fill(0)
  let offset = 0
  for (let k = W; k >= 0; k--) {
    const idx = center - (W - k)
    const p = idx >= 0 ? arpas[idx] : ''
    const base = p ? arpaToVec(p) : Array(PHONEME_DIM).fill(0)
    const weight = Math.pow(decay, W - k)
    for (let d = 0; d < PHONEME_DIM; d++) out[offset + d] = base[d] * weight
    offset += PHONEME_DIM
  }
  return normalize(out)
}

// Very small fallback G2P: when dictionary lookup fails, approximate by graphemes
function wordsToArpa(text: string): string[] {
  const words = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const out: string[] = []
  for (const w of words) {
    const ph = getPhonemes(w)
    if (ph && ph.length) {
      for (const p of ph) out.push(p)
    } else {
      // crude: map each character to a consonant/vowel-like vec placeholder by deriving an ARPA-like label
      for (const ch of w) {
        // we'll store placeholder as uppercase grapheme with * to indicate non-ARPA; arpaToVec will return zeros, so use graphemeToVec below only in query handling
        out.push(ch.toUpperCase())
      }
    }
  }
  return out
}

export function vectorizeSlidePhonemes(slideText: string, opts: VectorizeOptions = {}): { phonemes: string[]; contexts: ContextVector[] } {
  const window = opts.window ?? 3
  const decay = opts.decay ?? 0.85
  const arpas = wordsToArpa(slideText)
  const contexts: ContextVector[] = []
  for (let i = 0; i < arpas.length; i++) {
    const vec = concatWindowVec(arpas, i, window, decay)
    contexts.push({ pos: i, vec })
  }
  return { phonemes: arpas, contexts }
}

export function buildSongPhonemeIndex(song: { id: string; slides: { id: string; text: string }[] }, opts: VectorizeOptions = {}): SongPhonemeIndex {
  const window = opts.window ?? 3
  const slides: Record<string, SlidePhonemeVectors> = {}
  for (const sl of song.slides) {
    const { phonemes, contexts } = vectorizeSlidePhonemes(sl.text, opts)
    slides[sl.id] = { slideId: sl.id, phonemes, contexts }
  }
  return { songId: song.id, window, slides }
}

export function computeSongIndexCacheKey(song: { id: string; slides: { id: string; text: string }[] }, opts: VectorizeOptions = {}, dictVersion: string | number): string {
  const window = opts.window ?? 3
  const decay = opts.decay ?? 0.85
  const dictVerStr = String(dictVersion)
  const content = JSON.stringify({ slides: song.slides.map(s => ({ id: s.id, text: s.text })), window, decay, dictVersion: dictVerStr })
  const hash = simpleHash(content)
  return `${song.id}|${dictVerStr}|${hash}`
}

// Build-or-load from IndexedDB cache. dictVersion should come from getPhonemeDictionaryVersion()
export async function buildOrLoadSongPhonemeIndex(
  song: { id: string; slides: { id: string; text: string }[] },
  opts: VectorizeOptions = {},
  dictVersion: string | number,
  forceRebuild = false
): Promise<SongPhonemeIndex> {
  const window = opts.window ?? 3
  const decay = opts.decay ?? 0.85
  const cacheKey = computeSongIndexCacheKey(song, { window, decay }, dictVersion)
  if (!forceRebuild) {
    try {
      const cached = await getSongIndex(cacheKey)
      if (cached) return cached
    } catch {
      // ignore cache errors and rebuild
    }
  }
  // Build fresh
  console.log("Rebuilding song phoneme index for", song.id, "with window", window, "and decay", decay)
  const built = buildSongPhonemeIndex(song, { window, decay })
  // Persist
  try {
    await putSongIndex(cacheKey, built)
  } catch {
    // ignore write errors
  }
  return built
}

export async function rebuildSongPhonemeIndexCache(
  song: { id: string; slides: { id: string; text: string }[] },
  opts: VectorizeOptions = {},
  dictVersion: string | number
): Promise<SongPhonemeIndex> {
  return buildOrLoadSongPhonemeIndex(song, opts, dictVersion, true)
}

// Query handling: given a live transcript (string) already phoneme-converted elsewhere if available,
// build a context vector for the last position and compare to each slide position by cosine.
export function scoreQueryAgainstSong(queryText: string, songIndex: SongPhonemeIndex, opts: { window?: number; decay?: number } = {}): { slideId: string; bestPos: number; score: number }[] {
  const window = opts.window ?? songIndex.window
  const decay = opts.decay ?? 0.85

  // Convert query to ARPA; if unknown, approximate by graphemes and map to vectors via graphemeToVec
  const words = queryText.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const qArpa: string[] = []
  for (const w of words) {
    const ph = getPhonemes(w)
    if (ph && ph.length) qArpa.push(...ph)
    else qArpa.push(...w.toUpperCase().split(''))
  }
  if (qArpa.length === 0) return []

  // Build a context vector at the tail
  const qVec = concatWindowVec(qArpa, qArpa.length - 1, window, decay)

  const results: { slideId: string; bestPos: number; score: number }[] = []
  for (const [slideId, data] of Object.entries(songIndex.slides)) {
    let best = { slideId, bestPos: -1, score: 0 }
    for (const ctx of data.contexts) {
      const s = cosine(qVec, ctx.vec)
      if (s > best.score) best = { slideId, bestPos: ctx.pos, score: s }
    }
    results.push(best)
  }
  results.sort((a, b) => b.score - a.score)
  return results
}

