export function cosineSim(a: Float32Array, b: Float32Array): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]
    const bi = b[i]
    dot += ai * bi
    na += ai * ai
    nb += bi * bi
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

export function topK(query: Float32Array, vectors: Float32Array[], ids: string[], k: number) {
  const scores: { id: string; score: number }[] = []
  for (let i = 0; i < vectors.length; i++) {
    const score = cosineSim(query, vectors[i])
    scores.push({ id: ids[i], score })
  }
  scores.sort((a, b) => b.score - a.score)
  return scores.slice(0, k)
}
