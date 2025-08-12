import { useEffect, useMemo, useState } from 'react'
import type { Song } from '../types'
import { buildPhoneticIndex, phoneticBestMatchAcross } from '../lib/phonetics'

export type PhoneticDecision =
  | { action: 'none'; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string }
  | { action: 'update' | 'advance'; targetIndex: number; targetSongId?: string; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string }
  | { action: 'blank'; blankPos: 'start' | 'end' | null; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string }

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

  const transcriptWindow = useMemo(() => [...finals.slice(-2), partial].join(' ').trim(), [finals, partial])

  // Prebuild phonetic indexes for songs (cheap in-browser)
  const [songIndexes, setSongIndexes] = useState<Record<string, ReturnType<typeof buildPhoneticIndex>>>({})
  useEffect(() => {
    const map: Record<string, ReturnType<typeof buildPhoneticIndex>> = {}
    for (const s of library) map[s.id] = buildPhoneticIndex(s)
    setSongIndexes(map)
  }, [library])

  const decision: PhoneticDecision = useMemo(() => {
    if (!currentSong || !transcriptWindow) return { action: 'none', best: null, transcriptWindow }

    // 1) Pause => stay on same slide
    if (transcriptWindow.trim().length === 0) {
      return { action: 'none', best: null, transcriptWindow }
    }

    const currentIdx = slideIndex
    const nextIdx = Math.min(currentSong.slides.length - 1, currentIdx + 1)
    const nextSlideId = currentSong.slides[nextIdx]?.id

    // Evaluate matches across: next slide (priority), same song, all queued songs
    const inOrderSongIds = queue.length ? queue : library.map(s => s.id)
    let isAtEnd = currentIdx >= currentSong.slides.length - 1
    const nextSongId = (() => {
      if (!isAtEnd) return undefined
      const idx = inOrderSongIds.indexOf(currentSong.id)
      return idx >= 0 ? inOrderSongIds[idx + 1] : undefined
    })()

    const best = phoneticBestMatchAcross({
      library,
      songIndexes,
      query: transcriptWindow,
      preferSongId: isAtEnd ? undefined : currentSong.id,
      equalWeightSongIds: isAtEnd && nextSongId ? [currentSong.id, nextSongId] : undefined,
      preferNextSlideId: nextSlideId,
      inOrderSongIds,
    })

    if (!best || best.score < blankThreshold) {
      // 4) Low confidence everywhere => blank. choose start or end based on position
      const isAtEnd2 = currentIdx >= currentSong.slides.length - 1
      return { action: 'blank', blankPos: isAtEnd2 ? 'end' : 'start', best, transcriptWindow }
    }

    // If best is in current song
    if (best.songId === currentSong.id) {
      const targetIndex = currentSong.slides.findIndex(s => s.id === best.slideId)
      if (targetIndex < 0) return { action: 'none', best, transcriptWindow }

      const isNext = best.slideId === nextSlideId
      if (isNext && best.score >= acceptNextThreshold && targetIndex !== currentIdx) {
        // 2) If end of slide reached (best=next) => advance
        return { action: 'advance', targetIndex, best, transcriptWindow }
      }

      // 1) If pause or low info => stay (handled above)

      // 3) If non-next within same song has high confidence and next is low -> move
      if (!isNext && best.score >= acceptAnyThreshold && targetIndex !== currentIdx) {
        return { action: 'update', targetIndex, best, transcriptWindow }
      }

      // otherwise stay
      return { action: 'none', best, transcriptWindow }
    }

    // 5) Jump to another song only with high confidence
    if (best.score >= crossSongThreshold) {
      const targetSong = library.find(s => s.id === best.songId)
      if (!targetSong) return { action: 'none', best, transcriptWindow }
      const targetIndex = targetSong.slides.findIndex(s => s.id === best.slideId)
      if (targetIndex < 0) return { action: 'none', best, transcriptWindow }
      return { action: 'update', targetIndex, targetSongId: best.songId, best, transcriptWindow }
    }

    // Otherwise blank and keep listening
    isAtEnd = currentIdx >= currentSong.slides.length - 1
    return { action: 'blank', blankPos: isAtEnd ? 'end' : 'start', best, transcriptWindow }
  }, [currentSong, library, queue, songIndexes, transcriptWindow, slideIndex, acceptNextThreshold, acceptAnyThreshold, blankThreshold, crossSongThreshold])

  return { transcriptWindow, decision }
}

