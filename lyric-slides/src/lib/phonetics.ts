// Lightweight phonetic utilities for lyric slide matching.
// We use double metaphone (a phonetic algorithm). To keep things self-contained in-browser,
// we implement a tiny metaphone variant and a phonetic similarity scorer.
// This favors prefix continuity and next-slide bias without semantic embeddings.

import { getPhonemes } from './phonemeDict'

export type PhoneticIndex = {
  songId: string
  // slideId -> array of phonetic tokens for the slide text (only first N words considered)
  slideTokens: Record<string, string[]>
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
}

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