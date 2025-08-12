import type { Song } from '../types'
import { buildPhoneticIndex, phoneticBestMatchAcross, phoneticTokens } from './phonetics'

export type PhoneticDecision =
  | { action: 'none'; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string }
  | { action: 'update' | 'advance'; targetIndex: number; targetSongId?: string; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string }
  | { action: 'blank'; blankPos: 'start' | 'end' | null; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string }

export function decideSlidePhonetic(params: {
  currentSong: Song | undefined
  library: Song[]
  queue: string[]
  songIndexes?: Record<string, ReturnType<typeof buildPhoneticIndex>>
  transcriptWindow: string
  slideIndex: number
  acceptNextThreshold: number
  acceptAnyThreshold: number
  blankThreshold: number
  crossSongThreshold: number
  minAdvanceTokens?: number // require at least N words before auto-advancing to next slide
  minUpdateTokens?: number // require at least N words before switching to a non-next slide
  allowEarlyNextAdoption?: boolean // allow switching to next slide before tail-end
}): PhoneticDecision {
  const { currentSong, library, queue, transcriptWindow, slideIndex } = params
  const { acceptNextThreshold, acceptAnyThreshold, blankThreshold, crossSongThreshold } = params
  const minAdvanceTokens = params.minAdvanceTokens ?? 2
  const minUpdateTokens = params.minUpdateTokens ?? 2
  const allowEarlyNextAdoption = params.allowEarlyNextAdoption ?? true
  const songIndexes = params.songIndexes ?? buildIndexes(library)

  if (!currentSong || !transcriptWindow) return { action: 'none', best: null, transcriptWindow }
  if (transcriptWindow.trim().length === 0) {
    return { action: 'none', best: null, transcriptWindow }
  }

  const currentIdx = slideIndex
  const nextIdx = Math.min(currentSong.slides.length - 1, currentIdx + 1)
  const nextSlideId = currentSong.slides[nextIdx]?.id
  const wordCount = transcriptWindow.trim() ? transcriptWindow.trim().split(/\s+/).length : 0
  const qTokens = phoneticTokens(transcriptWindow)

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

  // Detect if transcript matches the tail (end) of the current slide
  const curTokens = songIndexes[currentSong.id]?.slideTokens[currentSong.slides[currentIdx].id] || []
  const tailEndMatch = (() => {
    if (qTokens.length === 0 || curTokens.length === 0) return false
    const start = curTokens.length - qTokens.length
    if (start < 0) return false
    for (let i = 0; i < qTokens.length; i++) {
      if (qTokens[i] !== curTokens[start + i]) return false
    }
    return true
  })()

  // If we've clearly reached the end of current slide, advance regardless of best
  if (tailEndMatch && wordCount >= minAdvanceTokens && nextSlideId && nextIdx !== currentIdx) {
    return { action: 'advance', targetIndex: nextIdx, best: best ?? null, transcriptWindow }
  }

  if (!best || best.score < blankThreshold) {
    const isAtEnd2 = currentIdx >= currentSong.slides.length - 1
    return { action: 'blank', blankPos: isAtEnd2 ? 'end' : 'start', best, transcriptWindow }
  }

  if (best.songId === currentSong.id) {
    const targetIndex = currentSong.slides.findIndex(s => s.id === best.slideId)
    if (targetIndex < 0) return { action: 'none', best, transcriptWindow }

    const isNext = best.slideId === nextSlideId
    // End-of-slide auto-advance
    if (isNext && targetIndex !== currentIdx && wordCount >= minAdvanceTokens && tailEndMatch && best.score >= acceptNextThreshold) {
      return { action: 'advance', targetIndex, best, transcriptWindow }
    }

    // Compute how many head tokens of the current slide we've spoken consecutively at the end of the window
    const headStreak = (() => {
      if (qTokens.length === 0 || curTokens.length === 0) return 0
      const maxCheck = Math.min(qTokens.length, curTokens.length)
      let len = 0
      for (let i = 1; i <= maxCheck; i++) {
        // compare suffix of qTokens with prefix of curTokens of length i
        let ok = true
        for (let j = 0; j < i; j++) {
          if (qTokens[qTokens.length - i + j] !== curTokens[j]) { ok = false; break }
        }
        if (ok) len = i
      }
      return len
    })()

    // Early next-slide adoption when singer starts next slide strongly
    // Guard: if we've just started the CURRENT slide (spoken some, but fewer than minAdvanceTokens head tokens), do not early-adopt yet
    if (
      allowEarlyNextAdoption &&
      isNext &&
      targetIndex !== currentIdx &&
      wordCount >= minUpdateTokens &&
      best.score >= acceptAnyThreshold &&
      !(headStreak > 0 && headStreak < minAdvanceTokens)
    ) {
      return { action: 'advance', targetIndex, best, transcriptWindow }
    }
    // Non-next slide switch within song (e.g., skipping ahead)
    if (!isNext && best.score >= acceptAnyThreshold && targetIndex !== currentIdx && wordCount >= minUpdateTokens) {
      return { action: 'update', targetIndex, best, transcriptWindow }
    }
    return { action: 'none', best, transcriptWindow }
  }

  if (best.score >= crossSongThreshold) {
    const targetSong = library.find(s => s.id === best.songId)
    if (!targetSong) return { action: 'none', best, transcriptWindow }
    const targetIndex = targetSong.slides.findIndex(s => s.id === best.slideId)
    if (targetIndex < 0) return { action: 'none', best, transcriptWindow }
    return { action: 'update', targetIndex, targetSongId: best.songId, best, transcriptWindow }
  }

  isAtEnd = currentIdx >= currentSong.slides.length - 1
  return { action: 'blank', blankPos: isAtEnd ? 'end' : 'start', best, transcriptWindow }
}

function buildIndexes(library: Song[]): Record<string, ReturnType<typeof buildPhoneticIndex>> {
  const map: Record<string, ReturnType<typeof buildPhoneticIndex>> = {}
  for (const s of library) map[s.id] = buildPhoneticIndex(s)
  return map
}

