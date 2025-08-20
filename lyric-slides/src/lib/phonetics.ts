// Lightweight phonetic utilities for lyric slide matching.
// We use double metaphone (a phonetic algorithm). To keep things self-contained in-browser,
// we implement a tiny metaphone variant and a phonetic similarity scorer.
// This favors prefix continuity and next-slide bias without semantic embeddings.

import type { Song } from '../types'
import { getPhonemes } from './phonemeDict'

export type PhoneticIndex = {
  songId: string
  // slideId -> array of phonetic tokens for the slide text (only first N words considered)
  slideTokens: Record<string, string[]>
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
}

// Convert an ARPAbet phoneme sequence to a compact consonant-centric code string.
// We strip stress markers (digits) and drop vowels to emphasize consonant skeletons
// to better match the existing scorer's behavior. Duplicate consecutive symbols are collapsed.
// function phonemesToCode(arpas: string[]): string {
//   const VOWELS = new Set(['AA','AE','AH','AO','AW','AY','EH','ER','EY','IH','IY','OW','OY','UH','UW'])
//   const cleaned: string[] = []
//   for (const p of arpas) {
//     const base = p.replace(/[0-2]$/,'')
//     if (!VOWELS.has(base)) cleaned.push(base)
//   }
//   if (cleaned.length === 0) return ''
//   const out: string[] = []
//   for (const c of cleaned) {
//     const prev = out[out.length - 1]
//     if (c === prev) continue
//     out.push(c)
//   }
//   // Join without separator to keep tokens compact; normalize to lowercase to align with fallback tokens
//   return out.join('').toLowerCase()
// }

// Very small metaphone-like codec fallback for words not present in the dictionary.
function simplePhonetic(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return ''
  // common replacements
  w = w
    .replace(/^kn/, 'n')
    .replace(/^gn/, 'n')
    .replace(/^wr/, 'r')
    .replace(/^ps/, 's')
    .replace(/mb$/, 'm')
    .replace(/gh/g, 'g')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/sh/g, 's')
    .replace(/ch/g, 'k')
    .replace(/ck/g, 'k')
    .replace(/dg/g, 'j')
  // collapse vowels (except first char) and duplicate letters
  const keep = [w[0]]
  for (let i = 1; i < w.length; i++) {
    const c = w[i]
    const prev = keep[keep.length - 1]
    if ('aeiouy'.includes(c)) continue
    if (c === prev) continue
    keep.push(c)
  }
  return keep.join('')
}

export function phoneticTokens(text: string): string[] {
  const words = normalize(text).split(' ')
  let tokens: string[] = []
  for (const w of words) {
    const dict = getPhonemes(w)
    if (dict && dict.length) {
      const code = dict.map((a) => a.replace(/[0-9]/g, '').toLowerCase())
      if (code) { tokens = tokens.concat(code); continue }
    }
    const fallback = simplePhonetic(w)
    if (fallback) tokens.push(fallback)
  }
  return tokens
}

export function buildPhoneticIndex(song: Song): PhoneticIndex {
  const slideTokens: Record<string, string[]> = {}
  for (const sl of song.slides) {
    slideTokens[sl.id] = phoneticTokens(sl.text)
  }
  return { songId: song.id, slideTokens }
}

// function anywherePrefixMatchScore(a: string[], b: string[]): number {
//   // Allow aligning the transcript prefix anywhere within the slide tokens (continuation within a slide).
//   if (a.length === 0 || b.length === 0) return 0
//   let best = 0
//   let bestPos = -1
//   for (let j = 0; j < b.length; j++) {
//     let k = 0
//     for (let i = 0; i < a.length && j + i < b.length; i++) {
//       if (a[i] === b[j + i]) k++
//       else break
//     }
//     if (k > best) { best = k; bestPos = j }
//   }
//   let base = 0
//   if (best === 0) base = 0
//   else if (best === 1) base = 0.60
//   else if (best === 2) base = 0.85
//   else if (best === 3) base = 0.95
//   else base = Math.min(1, 0.98 + Math.min(0.02, 0.005 * (best - 3)))
//   if (bestPos > 0) {
//     const posPenalty = Math.min(0.15, bestPos * 0.03)
//     base = Math.max(0, base - posPenalty)
//   }
//   return Math.max(0, Math.min(1, base))
// }

// export function phoneticBestMatchAcross(params: {
//   library: Song[]
//   songIndexes: Record<string, PhoneticIndex>
//   query: string
//   preferSongId?: string
//   equalWeightSongIds?: string[]
//   preferNextSlideId?: string
//   inOrderSongIds?: string[]
// }): { songId: string; slideId: string; score: number } | null {
//   const { library, songIndexes, query, preferSongId, equalWeightSongIds, preferNextSlideId, inOrderSongIds } = params
  // const qTokens = phoneticTokens(query)
  // if (qTokens.length === 0) return null

  // // weight helpers
  // const order = inOrderSongIds ?? library.map(s => s.id)
  // const orderIndex = new Map<string, number>(order.map((id, i) => [id, i]))

  // let best: { songId: string; slideId: string; score: number } | null = null

  // for (const song of library) {
  //   const idx = songIndexes[song.id] || buildPhoneticIndex(song)
  //   const songWeight = equalWeightSongIds?.includes(song.id) ? 1.15 : (song.id === preferSongId ? 1.15 : 1.0)
  //   const listBias = 1 + (0.05 * (order.length - 1 - (orderIndex.get(song.id) ?? 0))) // slight bias to earlier in queue

  //   for (const sl of song.slides) {
  //     const sTokens = idx.slideTokens[sl.id] || []
  //     const base = anywherePrefixMatchScore(qTokens, sTokens)
  //     const nextBonus = sl.id === preferNextSlideId ? 1.2 : 1.0
  //     const score = base * songWeight * nextBonus * listBias
  //     if (!best || score > best.score) best = { songId: song.id, slideId: sl.id, score }
  //   }
  // }

  // return best
// }

// export function phoneticScoresForSongs(params: {
//   library: Song[]
//   songIndexes?: Record<string, PhoneticIndex>
//   query: string
//   preferSongId?: string
//   equalWeightSongIds?: string[]
//   preferNextSlideId?: string
//   inOrderSongIds?: string[]
// }): { songId: string; slideId: string; score: number }[] {
  // const { library, songIndexes = {}, query, preferSongId, equalWeightSongIds, preferNextSlideId, inOrderSongIds } = params
  // const qTokens = phoneticTokens(query)
  // if (qTokens.length === 0) return []
  // const order = inOrderSongIds ?? library.map(s => s.id)
  // const orderIndex = new Map<string, number>(order.map((id, i) => [id, i]))
  // const out: { songId: string; slideId: string; score: number }[] = []
  // for (const song of library) {
  //   const idx = songIndexes[song.id] || buildPhoneticIndex(song)
  //   const songWeight = equalWeightSongIds?.includes(song.id) ? 1.15 : (song.id === preferSongId ? 1.15 : 1.0)
  //   const listBias = 1 + (0.05 * (order.length - 1 - (orderIndex.get(song.id) ?? 0)))
  //   for (let i = 0; i < song.slides.length; i++) {
  //     const sl = song.slides[i]
  //     const sTokens = idx.slideTokens[sl.id] || []
  //     const base = anywherePrefixMatchScore(qTokens, sTokens)
  //     const nextBonus = sl.id === preferNextSlideId ? 1.2 : 1.0
  //     const score = base * songWeight * nextBonus * listBias
  //     out.push({ songId: song.id, slideId: sl.id, score })
  //   }
  // }
  // out.sort((a, b) => b.score - a.score)
  // return out
// }
