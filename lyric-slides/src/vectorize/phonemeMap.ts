// Phoneme feature mapping for ARPAbet and lightweight grapheme fallbacks.
// We encode each phoneme into a compact vector so that acoustically and
// articulatorily similar sounds are nearby in the vector space.
//
// Dimensions (13 total):
// [0] consonant (1) vs vowel (0)
// [1..4] place of articulation (one-hot-ish): bilabial, labiodental, alveolar/post-alveolar, velar/palatal
// [5..8] manner (one-hot-ish): stop/affricate, fricative, nasal, liquid/glide
// [9] voicing (1 voiced, 0 voiceless)
// [10..12] vowel features (frontness, height, rounded) in [0,1] if vowel
//
// For consonants, vowel dimensions are 0. For vowels, consonant/place/manner/voicing are mostly 0
// except we keep [0] consonant=0 and use vowel dims.

export type Vec = number[]

function zeros(n: number): number[] { return Array(n).fill(0) }

const D = 13

// Utility to normalize a vector to unit length (avoid divide by zero)
export function normalize(v: Vec): Vec {
  let s = 0
  for (const x of v) s += x * x
  if (s === 0) return v.slice()
  const inv = 1 / Math.sqrt(s)
  return v.map(x => x * inv)
}

export function cosine(a: Vec, b: Vec): number {
  let dot = 0, na = 0, nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  if (na === 0 || nb === 0) return 0
  return dot / Math.sqrt(na * nb)
}

// Consonant feature builder
function c(place: 'bilabial'|'labiodental'|'alveolar'|'velar', manner: 'stop'|'fric'|'nasal'|'liquid'|'affric', voiced: boolean): Vec {
  const v = zeros(D)
  v[0] = 1 // consonant
  const placeIdx = { bilabial: 1, labiodental: 2, alveolar: 3, velar: 4 }[place]
  v[placeIdx] = 1
  const mannerIdx = { stop: 5, affric: 5, fric: 6, nasal: 7, liquid: 8 }[manner]
  v[mannerIdx] = 1
  v[9] = voiced ? 1 : 0
  return v
}

// Vowel feature builder: frontness [0(back)..1(front)], height [0(low)..1(high)], rounded [0/1]
function v(front: number, height: number, rounded: number): Vec {
  const x = zeros(D)
  x[0] = 0 // consonant flag off
  x[10] = front
  x[11] = height
  x[12] = rounded
  return x
}

// ARPAbet phoneme to vector. Stress digits are stripped before lookup.
const MAP: Record<string, Vec> = {
  // Stops
  P: c('bilabial','stop', false), B: c('bilabial','stop', true),
  T: c('alveolar','stop', false), D: c('alveolar','stop', true),
  K: c('velar','stop', false),    G: c('velar','stop', true),
  // Affricate
  CH: c('alveolar','affric', false), JH: c('alveolar','affric', true),
  // Fricatives
  F: c('labiodental','fric', false), V: c('labiodental','fric', true),
  TH: c('alveolar','fric', false),   DH: c('alveolar','fric', true),
  S: c('alveolar','fric', false),    Z: c('alveolar','fric', true),
  SH: c('alveolar','fric', false),   ZH: c('alveolar','fric', true),
  HH: c('alveolar','fric', false),
  // Nasals
  M: c('bilabial','nasal', true), N: c('alveolar','nasal', true), NG: c('velar','nasal', true),
  // Liquids/Glides
  L: c('alveolar','liquid', true), R: c('alveolar','liquid', true),
  W: c('bilabial','liquid', true), Y: c('palatal' as any,'liquid', true),
  // Vowels (very rough mapping)
  IY: v(1, 1, 0), IH: v(1, 0.8, 0), EY: v(0.8, 0.7, 0), EH: v(0.8, 0.6, 0), AE: v(1, 0.3, 0),
  AA: v(0.2, 0.2, 0), AH: v(0.5, 0.5, 0), AO: v(0.2, 0.4, 1), AW: v(0.3, 0.3, 1), AY: v(0.7, 0.6, 0),
  OW: v(0.2, 0.8, 1), OY: v(0.2, 0.7, 1), UH: v(0.1, 0.7, 1), UW: v(0.1, 0.9, 1), ER: v(0.5, 0.7, 0),
}

// Fallback lightweight grapheme mapping for unknown phonemes or simplistic G2P
const GRAPHEME_MAP: Record<string, Vec> = {
  b: MAP.B, p: MAP.P, d: MAP.D, t: MAP.T, g: MAP.G, k: MAP.K,
  v: MAP.V, f: MAP.F, z: MAP.Z, s: MAP.S, j: MAP.JH, c: MAP.CH,
  l: MAP.L, r: MAP.R, m: MAP.M, n: MAP.N, h: MAP.HH, w: MAP.W, y: MAP.Y,
  a: MAP.AA, e: MAP.EH, i: MAP.IY, o: MAP.AO, u: MAP.UW,
}

export function arpaToVec(phoneme: string): Vec {
  const p = phoneme.replace(/[0-2]$/, '').toUpperCase()
  const v0 = MAP[p]
  return v0 ? v0 : zeros(D)
}

export function graphemeToVec(ch: string): Vec {
  const v0 = GRAPHEME_MAP[ch.toLowerCase()]
  return v0 ? v0 : zeros(D)
}

export const PHONEME_DIM = D

