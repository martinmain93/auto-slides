import { useEffect, useMemo, useState } from 'react'
import type { Song } from '../types'
import { getPhonemeDictionaryVersion } from '../lib/phonemeDict'
import { decideSlidePhonetic, type PhoneticDecision } from '../lib/decidePhonetic'
import { buildOrLoadSongPhonemeIndex, scoreQueryAgainstSong, type SongPhonemeIndex } from '../vectorize/vectorizer'

// Minimal skeleton matcher: takes transcriptWindow and emits no navigation decision.
export function usePhoneticSlideMatch(params: {
  currentSong: Song | undefined
  library: Song[]
  queue: string[]
  transcriptWindow: string
  slideIndex: number
}): { transcriptWindow: string; vectorResults: { slideId: string; bestPos: number; score: number }[] , decision: PhoneticDecision } {
  const { currentSong, library, transcriptWindow, slideIndex } = params

  // Track when we last moved slides to implement recency bias
  const [lastMoveTimestamp, setLastMoveTimestamp] = useState<number | undefined>()

  // Prebuild phonetic indexes for songs (cheap in-browser)
  const dictVersion = getPhonemeDictionaryVersion()

  // Build phoneme-vector index per song for vector-space matching (separate from legacy phonetic index)
  const [songVectorIndexes, setSongVectorIndexes] = useState<Record<string, SongPhonemeIndex>>({})
  useEffect(() => {
    let cancelled = false
    async function buildAll() {
      const pairs = await Promise.all(
        library.map(async (s) => {
          const idx = await buildOrLoadSongPhonemeIndex(s, { window: 16, decay: 0.95 }, dictVersion)
          return [s.id, idx] as const
        })
      )
      if (cancelled) return
      const map: Record<string, SongPhonemeIndex> = {}
      for (const [id, idx] of pairs) map[id] = idx
      setSongVectorIndexes(map)
    }
    buildAll()
    return () => {
      cancelled = true
    }
  }, [library, dictVersion])

  // Compute vector-space scores for the current song based on the live transcript window
  const vectorResults = useMemo(() => {
    if (!currentSong || !transcriptWindow.trim()) return [] as { slideId: string; bestPos: number; score: number }[]
    const idx = songVectorIndexes[currentSong.id]
    if (!idx) return []
    return scoreQueryAgainstSong(transcriptWindow, idx)
  }, [currentSong, transcriptWindow, songVectorIndexes])
  // Touch result to avoid unused var warning while we keep it for future UI/debug integration
  void vectorResults.length

  // Track slide changes to update last move timestamp
  const [prevSlideIndex, setPrevSlideIndex] = useState(slideIndex)
  useEffect(() => {
    if (slideIndex !== prevSlideIndex) {
      setLastMoveTimestamp(Date.now())
      setPrevSlideIndex(slideIndex)
    }
  }, [slideIndex, prevSlideIndex])

  const decision: PhoneticDecision = useMemo(() => {
    const songIndex = currentSong ? songVectorIndexes[currentSong.id] : undefined
    return decideSlidePhonetic({
      transcriptWindow, vectorResults, currentSong, slideIndex, songIndex, lastMoveTimestamp
    })
  }, [transcriptWindow, vectorResults, currentSong, slideIndex, songVectorIndexes, lastMoveTimestamp])

  return { transcriptWindow, vectorResults, decision }
}

