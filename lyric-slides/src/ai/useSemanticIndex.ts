import { useEffect, useState } from 'react'
import type { Song } from '../types'
// Deprecated: semantic index removed in favor of phonetic matching.

export function useSemanticIndex(_song: Song | undefined) {
  // No-op hook after removing semantic embeddings. Always report indexed.
  const [indexed] = useState(true)
  const [indexPct] = useState(100)
  useEffect(() => {}, [])
  return { indexPct, indexed }
}

