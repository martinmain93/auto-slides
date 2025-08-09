// Embeddings via Transformers.js (@xenova/transformers)
// Model: Xenova/all-MiniLM-L6-v2 (384-dim)

import { pipeline, env } from '@xenova/transformers'

export type Embedder = {
  modelId: string
  embed: (text: string) => Promise<Float32Array>
}

let embedderPromise: Promise<Embedder> | null = null

export function loadEmbedder(modelId = 'Xenova/all-MiniLM-L6-v2'): Promise<Embedder> {
  if (embedderPromise) return embedderPromise
  // Ensure we run entirely in-browser
  env.useBrowserCache = true
  env.allowLocalModels = false
  embedderPromise = (async () => {
    const extractor = await pipeline('feature-extraction', modelId)
    async function embed(text: string): Promise<Float32Array> {
      type ExtractOutput = { data: Float32Array | number[] }
      const output = (await extractor(text, { normalize: true, pooling: 'mean' })) as ExtractOutput
      const data = output.data
      return data instanceof Float32Array ? data : new Float32Array(data)
    }
    return { modelId, embed }
  })()
  return embedderPromise
}
