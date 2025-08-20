import { useEffect, useMemo, useState } from 'react'
import type { Song } from '../types'
import { buildPhoneticIndex } from '../lib/phonetics'
import { getPhonemeDictionaryVersion } from '../lib/phonemeDict'
import { decideSlidePhonetic, type PhoneticDecision } from '../lib/decidePhonetic'
import { buildSongPhonemeIndex, scoreQueryAgainstSong, type SongPhonemeIndex } from '../vectorize/vectorizer'

// Minimal skeleton matcher: takes transcriptWindow and emits no navigation decision.
export function usePhoneticSlideMatch(params: {
  currentSong: Song | undefined
  library: Song[]
  queue: string[]
  transcriptWindow: string
  phoneticTranscript: string[]
  slideIndex: number
  // thresholds
  acceptNextThreshold?: number // confidence to stick with next slide
  acceptAnyThreshold?: number // threshold to switch within song
  blankThreshold?: number // under this, blank
  crossSongThreshold?: number // high threshold required to jump songs
}): { transcriptWindow: string; vectorResults: { slideId: string; bestPos: number; score: number }[] , decision: PhoneticDecision } {
  const { currentSong, library, queue, transcriptWindow, slideIndex } = params
  // const acceptNextThreshold = params.acceptNextThreshold ?? 0.7
  // const acceptAnyThreshold = params.acceptAnyThreshold ?? 0.6
  // const blankThreshold = params.blankThreshold ?? 0.45
  // const crossSongThreshold = params.crossSongThreshold ?? 0.8

  // Prebuild phonetic indexes for songs (cheap in-browser)
  // const [songIndexes, setSongIndexes] = useState<Record<string, ReturnType<typeof buildPhoneticIndex>>>({})
  const dictVersion = getPhonemeDictionaryVersion()

  // useEffect(() => {
  //   const map: Record<string, ReturnType<typeof buildPhoneticIndex>> = {}
  //   for (const s of library) map[s.id] = buildPhoneticIndex(s)
  //   setSongIndexes(map)
  // }, [library, dictVersion])

  // Build phoneme-vector index per song for vector-space matching (separate from legacy phonetic index)
  const [songVectorIndexes, setSongVectorIndexes] = useState<Record<string, SongPhonemeIndex>>({})
  useEffect(() => {
    const map: Record<string, SongPhonemeIndex> = {}
    for (const s of library) map[s.id] = buildSongPhonemeIndex(s, { window: 3, decay: 0.85 })
    setSongVectorIndexes(map)
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

  const decision: PhoneticDecision = useMemo(() => decideSlidePhonetic({
    transcriptWindow,
  }), [transcriptWindow])

  return { transcriptWindow, vectorResults, decision }
}

