import { useEffect, useState } from 'react'
// Deprecated: semantic index removed in favor of phonetic matching.

export function useSemanticIndex() {
  // No-op hook after removing semantic embeddings. Always report indexed.
  const [indexed] = useState(true)
  const [indexPct] = useState(100)
  useEffect(() => {}, [])
  return { indexPct, indexed }
}

