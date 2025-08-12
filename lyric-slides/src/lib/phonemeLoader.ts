import { setPhonemeDictionary } from './phonemeDict'

function isPhonemeMap(x: unknown): x is Record<string, string | string[]> {
  if (!x || typeof x !== 'object') return false
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (typeof k !== 'string') return false
    if (!(typeof v === 'string' || (Array.isArray(v) && v.every((p) => typeof p === 'string')))) return false
  }
  return true
}

export async function loadPhonemeDictFromUrl(url: string): Promise<void> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to load phoneme dict: ${res.status}`)
    const data: unknown = await res.json()
    if (isPhonemeMap(data)) {
      setPhonemeDictionary(data)
    } else {
      console.warn('Phoneme dict JSON not an object; ignoring')
    }
  } catch (err) {
    console.warn('Could not load phoneme dictionary', err)
  }
}

export const DEFAULT_CMUDICT_URL =
  'https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict'

export type CmudictLoadOptions = {
  /** Max entries to ingest (for performance testing). Omit for all. */
  maxEntries?: number
  /** If true (default), convert words to lowercase and strip (n) variant suffixes. */
  normalizeWords?: boolean
  /** If true, keep multiple variants under distinct keys like word(1). Default false. */
  keepVariants?: boolean
}

/**
 * Fetches the plain-text CMUdict from a URL and installs it into the in-memory dictionary.
 * Lines beginning with ';' are comments. Each entry is of the form:
 *   WORD  PH OW1 N IY0 M Z
 */
export async function loadCmudictFromUrl(url = DEFAULT_CMUDICT_URL, opts: CmudictLoadOptions = {}): Promise<void> {
  const { maxEntries, normalizeWords = true, keepVariants = false } = opts
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch CMUdict: ${res.status}`)
    const text = await res.text()
    const map: Record<string, string> = {}
    const lines = text.split(/\r?\n/)
    let count = 0
    for (const line of lines) {
      if (!line || line.startsWith(';')) continue
      // Split on 2+ spaces or tabs between word and phones
      const m = line.match(/^(\S+)\s+(.+?)\s*$/)
      if (!m) continue
      let word = m[1]
      const phones = m[2]
      if (normalizeWords) {
        // Lowercase; optionally strip (n) variant suffix
        if (!keepVariants) word = word.replace(/\(\d+\)$/,'')
        word = word.toLowerCase()
      }
      // Prefer the first occurrence; skip duplicates unless variant keeping is enabled
      if (!keepVariants && map[word]) continue
      map[word] = phones
      count++
      if (maxEntries && count >= maxEntries) break
    }
    setPhonemeDictionary(map)
  } catch (err) {
    console.warn('Could not load/parse CMUdict', err)
  }
}
