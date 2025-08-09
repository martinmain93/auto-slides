// Minimal IndexedDB helper for caching embeddings
// DB name: embeddings-v1, store: vectors, key: `${modelId}|${contentHash}`

type VecRecord = { key: string; dim: number; data: ArrayBuffer }

const DB_NAME = 'embeddings-v1'
const STORE = 'vectors'

function openDB(): Promise<IDBDatabase> {
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

export async function getVector(modelId: string, contentHash: string): Promise<Float32Array | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const key = `${modelId}|${contentHash}`
    const req = store.get(key)
    req.onsuccess = () => {
      const rec = req.result as VecRecord | undefined
      if (!rec) return resolve(null)
      resolve(new Float32Array(rec.data))
    }
    req.onerror = () => reject(new Error(req.error?.message ?? 'indexeddb_get_error'))
  })
}

export async function putVector(modelId: string, contentHash: string, vec: Float32Array, dim?: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const key = `${modelId}|${contentHash}`
    const rec: VecRecord = { key, dim: dim ?? vec.length, data: vec.buffer.slice(0) }
    const req = store.put(rec, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(new Error(req.error?.message ?? 'indexeddb_put_error'))
  })
}
