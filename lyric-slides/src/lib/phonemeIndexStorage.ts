// IndexedDB storage for phoneme-vector song indexes
// DB name: phoneme-indexes-v1, store: song-indexes, key: `${songId}|${hash}`

import type { SongPhonemeIndex } from '../vectorize/vectorizer'

const DB_NAME = 'phoneme-indexes-v1'
const STORE = 'song-indexes'

function hasIDB(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return typeof indexedDB !== 'undefined' && !!indexedDB
  } catch {
    return false
  }
}

function openDB(): Promise<IDBDatabase> {
  if (!hasIDB()) return Promise.reject(new Error('indexeddb_unavailable'))
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new Error(req.error?.message ?? 'indexeddb_open_error'))
  })
}

export async function getSongIndex(cacheKey: string): Promise<SongPhonemeIndex | null> {
  if (!hasIDB()) return null
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.get(cacheKey)
    req.onsuccess = () => {
      const rec = req.result as SongPhonemeIndex | undefined
      resolve(rec ?? null)
    }
    req.onerror = () => reject(new Error(req.error?.message ?? 'indexeddb_get_error'))
  })
}

export async function putSongIndex(cacheKey: string, index: SongPhonemeIndex): Promise<void> {
  if (!hasIDB()) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.put(index, cacheKey)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(new Error(req.error?.message ?? 'indexeddb_put_error'))
  })
}

export async function clearSongIndex(cacheKey: string): Promise<void> {
  if (!hasIDB()) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.delete(cacheKey)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(new Error(req.error?.message ?? 'indexeddb_delete_error'))
  })
}

export async function clearAllSongIndexes(): Promise<void> {
  if (!hasIDB()) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(new Error(req.error?.message ?? 'indexeddb_clear_error'))
  })
}

// Simple deterministic string hash (djb2) to avoid async crypto dependencies
export function simpleHash(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i)
    hash = hash >>> 0
  }
  // return as hex
  return hash.toString(16)
}
