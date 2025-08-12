// A lightweight, optional phoneme dictionary facility.
// If present, phonetic tokenization will consult this dictionary first.
// Expected symbols are ARPAbet-style (e.g., "AH0", "K").

export type PhonemeSequence = string[] // e.g., ["K", "IH1", "NG"]
export type PhonemeDict = Record<string, PhonemeSequence | string>

let DICT: PhonemeDict = {}
let VERSION = 0

/**
 * Replace the in-memory phoneme dictionary.
 * Keys should be lowercase words. Values can be either an array of ARPAbet
 * symbols, or a space-delimited string of ARPAbet symbols.
 */
export function setPhonemeDictionary(dict: PhonemeDict) {
  DICT = { ...dict }
  VERSION++
}

/**
 * Augment the existing dictionary with additional entries.
 */
export function extendPhonemeDictionary(dict: PhonemeDict) {
  DICT = { ...DICT, ...dict }
  VERSION++
}

/**
 * Retrieve the ARPAbet phoneme sequence for a given word, if present.
 * Normalizes the key to lowercase and strips common punctuation.
 */
export function getPhonemes(word: string): PhonemeSequence | null {
  const key = normalizeWord(word)
  const val = DICT[key]
  if (!val) return null
  if (Array.isArray(val)) return val.slice()
  if (typeof val === 'string') return val.trim().split(/\s+/)
  return null
}

export function getPhonemeDictionaryVersion(): number { return VERSION }

function normalizeWord(w: string): string {
  // Lowercase, remove non-letters/digits/inner apostrophes, collapse spaces
  let s = w.toLowerCase().replace(/[^\p{L}\p{N}'-]+/gu, '')
  // handle simple possessives/plurals like "king's" -> "king"
  s = s.replace(/'s$/g, '').replace(/’s$/g, '')
  return s
}

// A very small built-in seed to demonstrate usage; projects are expected to
// provide their own dictionary (e.g., CMUdict subset) via setPhonemeDictionary.
extendPhonemeDictionary({
  // examples
  'the': 'DH AH0',
  'and': 'AE1 N D',
  'king': 'K IH1 NG',
  'kings': 'K IH1 NG Z',
  'lord': 'L AO1 R D',
})
