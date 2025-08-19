import { useEffect, useMemo, useState } from 'react'
import type { Song } from '../types'
import { buildPhoneticIndex } from '../lib/phonetics'
import { getPhonemeDictionaryVersion } from '../lib/phonemeDict'
import { decideSlidePhonetic, type PhoneticDecision } from '../lib/decidePhonetic'


function computeTranscriptWindow(finals: string[], partial: string): string {
  // Combine last two finals and the current partial into a transcript window
  return useMemo(() => [...finals.slice(-2), partial].join(' ').trim(), [finals, partial])
}


// Minimal skeleton matcher: computes transcript window and emits no navigation decision.
export function usePhoneticSlideMatch(params: {
  currentSong: Song | undefined
  library: Song[]
  queue: string[]
  finals: string[]
  partial: string
  slideIndex: number
  // thresholds
  acceptNextThreshold?: number // confidence to stick with next slide
  acceptAnyThreshold?: number // threshold to switch within song
  blankThreshold?: number // under this, blank
  crossSongThreshold?: number // high threshold required to jump songs
}): { transcriptWindow: string; decision: PhoneticDecision } {
  const { currentSong, library, queue, finals, partial, slideIndex } = params
  const acceptNextThreshold = params.acceptNextThreshold ?? 0.7
  const acceptAnyThreshold = params.acceptAnyThreshold ?? 0.6
  const blankThreshold = params.blankThreshold ?? 0.45
  const crossSongThreshold = params.crossSongThreshold ?? 0.8
  const transcriptWindow = computeTranscriptWindow(finals, partial)

  // Prebuild phonetic indexes for songs (cheap in-browser)
  const [songIndexes, setSongIndexes] = useState<Record<string, ReturnType<typeof buildPhoneticIndex>>>({})
  const dictVersion = getPhonemeDictionaryVersion()

  useEffect(() => {
    const map: Record<string, ReturnType<typeof buildPhoneticIndex>> = {}
    for (const s of library) map[s.id] = buildPhoneticIndex(s)
    setSongIndexes(map)
  }, [library, dictVersion])

  const decision: PhoneticDecision = useMemo(() => decideSlidePhonetic({
    currentSong,
    library,
    queue,
    songIndexes,
    transcriptWindow,
    slideIndex,
    acceptNextThreshold,
    acceptAnyThreshold,
    blankThreshold,
    crossSongThreshold,
  }), [currentSong, library, queue, songIndexes, transcriptWindow, slideIndex, acceptNextThreshold, acceptAnyThreshold, blankThreshold, crossSongThreshold])

  return { transcriptWindow, decision }
}

