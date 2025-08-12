import type { Song } from '../types'
import { buildPhoneticIndex, phoneticBestMatchAcross } from './phonetics'

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
}): PhoneticDecision {
  const { currentSong, library, queue, transcriptWindow, slideIndex } = params
  const { acceptNextThreshold, acceptAnyThreshold, blankThreshold, crossSongThreshold } = params
  const songIndexes = params.songIndexes ?? buildIndexes(library)

  if (!currentSong || !transcriptWindow) return { action: 'none', best: null, transcriptWindow }
  if (transcriptWindow.trim().length === 0) {
    return { action: 'none', best: null, transcriptWindow }
  }

  const currentIdx = slideIndex
  const nextIdx = Math.min(currentSong.slides.length - 1, currentIdx + 1)
  const nextSlideId = currentSong.slides[nextIdx]?.id

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
    const isAtEnd2 = currentIdx >= currentSong.slides.length - 1
    return { action: 'blank', blankPos: isAtEnd2 ? 'end' : 'start', best, transcriptWindow }
  }

  if (best.songId === currentSong.id) {
    const targetIndex = currentSong.slides.findIndex(s => s.id === best.slideId)
    if (targetIndex < 0) return { action: 'none', best, transcriptWindow }

    const isNext = best.slideId === nextSlideId
    if (isNext && best.score >= acceptNextThreshold && targetIndex !== currentIdx) {
      return { action: 'advance', targetIndex, best, transcriptWindow }
    }
    if (!isNext && best.score >= acceptAnyThreshold && targetIndex !== currentIdx) {
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

