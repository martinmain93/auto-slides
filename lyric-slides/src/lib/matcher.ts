// Simple in-browser matcher with keyword overlap for MVP.
// This exposes an interface we can later replace with embeddings-based matching.

import type { Slide, Song } from '../types'

export type MatchResult = { slideId: string; score: number } | null

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  if (!text) return []
  return normalize(text).split(' ')
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

// Score based on Jaccard similarity between word sets, favoring longer overlaps
export function keywordMatch(slides: Slide[], query: string): MatchResult {
  const qTokens = unique(tokenize(query)).filter((t) => t.length > 2)
  if (qTokens.length === 0) return null

  let best: MatchResult = null
  for (const sl of slides) {
    const sTokens = unique(tokenize(sl.text))
    if (sTokens.length === 0) continue
    const setS = new Set(sTokens)
    let overlap = 0
    for (const t of qTokens) if (setS.has(t)) overlap++
    const union = setS.size + qTokens.length - overlap
    const score = union > 0 ? overlap / union : 0
    if (!best || score > best.score) best = { slideId: sl.id, score }
  }
  return best
}

export function matchSong(song: Song, query: string, opts?: { minScore?: number }): MatchResult {
  const res = keywordMatch(song.slides, query)
  if (!res) return null
  const minScore = opts?.minScore ?? 0.15
  return res.score >= minScore ? res : null
}

export type AsyncMatch = { slideId: string; score: number } | null
