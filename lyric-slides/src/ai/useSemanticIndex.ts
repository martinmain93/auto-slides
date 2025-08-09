import { useEffect, useState } from 'react'
import type { Song } from '../types'
import { ensureSongIndex } from '../lib/semanticMatcher'

export function useSemanticIndex(song: Song | undefined) {
  const [indexPct, setIndexPct] = useState(0)
  const [indexed, setIndexed] = useState(false)

  useEffect(() => {
    setIndexed(false)
    setIndexPct(0)
    if (!song) return
    let canceled = false
    void (async () => {
      try {
        await ensureSongIndex(song, 'Xenova/all-MiniLM-L6-v2', (p) => {
          if (!canceled) setIndexPct(p)
        })
        if (!canceled) {
          setIndexed(true)
          setIndexPct(100)
        }
      } catch {
        // ignore; UI will just not show 100%
      }
    })()
    return () => {
      canceled = true
    }
  }, [song])

  return { indexPct, indexed }
}

