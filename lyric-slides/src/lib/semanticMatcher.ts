import type { Song } from '../types'
import { loadEmbedder } from './embedder'
import { sha256Hex } from './hash'
import { getVector, putVector } from './storage'
import { topK } from './similarity'

export type MatchResult = { slideId: string; score: number } | null

function normalize(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

export async function ensureSongIndex(
  song: Song,
  modelId: string = 'Xenova/all-MiniLM-L6-v2',
  onProgress?: (percent: number) => void,
) {
  const embedder = await loadEmbedder(modelId)
  const ids: string[] = []
  const vectors: Float32Array[] = []

  const total = Math.max(1, song.slides.length)
  let done = 0

  for (const sl of song.slides) {
    const text = normalize(sl.text)
    const hash = await sha256Hex(`${modelId}|${text}`)
    let vec = await getVector(modelId, hash)
    if (!vec) {
      vec = await embedder.embed(text)
      await putVector(modelId, hash, vec)
    }
    ids.push(sl.id)
    vectors.push(vec)
    done++
    if (onProgress) onProgress(Math.round((done / total) * 100))
  }
  return { ids, vectors, dim: vectors[0]?.length ?? 0 }
}

export async function matchSongSemantic(song: Song, query: string, opts?: { modelId?: string; minScore?: number }): Promise<MatchResult> {
  const modelId = opts?.modelId ?? 'Xenova/all-MiniLM-L6-v2'
  const index = await ensureSongIndex(song, modelId)
  const embedder = await loadEmbedder(modelId)
  const qVec = await embedder.embed(normalize(query))
  const [best] = topK(qVec, index.vectors, index.ids, 1)
  if (!best) return null
  const minScore = opts?.minScore ?? 0.4
  return best.score >= minScore ? { slideId: best.id, score: best.score } : null
}

// Return top-k semantic candidates without applying thresholds so callers can apply custom priors/weights.
export async function matchSongSemanticCandidates(
  song: Song,
  query: string,
  opts?: { modelId?: string; k?: number }
): Promise<{ slideId: string; score: number }[]> {
  const modelId = opts?.modelId ?? 'Xenova/all-MiniLM-L6-v2'
  const index = await ensureSongIndex(song, modelId)
  const embedder = await loadEmbedder(modelId)
  const qVec = await embedder.embed(normalize(query))
  const k = Math.min(index.ids.length, Math.max(1, opts?.k ?? 5))
  const results = topK(qVec, index.vectors, index.ids, k)
  return results.map((r) => ({ slideId: r.id, score: r.score }))
}
