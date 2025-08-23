import type { Song } from '../types'

// Minimal decision types and stub for future matcher
export type PhoneticDecision =
  | { action: 'none'; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string }
  | { action: 'update' | 'advance'; targetIndex: number; targetSongId?: string; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string }
  | { action: 'blank'; blankPos: 'start' | 'end' | null; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string }

export function decideSlidePhonetic(params: {
  transcriptWindow: string,
  vectorResults: { slideId: string; bestPos: number; score: number }[],
  currentSong?: Song,
  slideIndex: number
}): PhoneticDecision {
  const { transcriptWindow, vectorResults, currentSong, slideIndex } = params

  // If no song is loaded or no transcript, do nothing
  if (!currentSong || !transcriptWindow.trim()) {
    return { action: 'none', best: null, transcriptWindow }
  }

  // Find the best match from vector results
  const bestMatch = vectorResults.length > 0 ? vectorResults[0] : null
  const best = bestMatch ? {
    songId: currentSong.id,
    slideId: bestMatch.slideId,
    score: bestMatch.score
  } : null

  // If no good matches found, return none
  if (!bestMatch || bestMatch.score < 0.3) {
    return { action: 'none', best, transcriptWindow }
  }

  // Find the slide index that corresponds to the best matching slide
  const targetSlideIndex = currentSong.slides.findIndex(slide => slide.id === bestMatch.slideId)
  
  if (targetSlideIndex === -1) {
    return { action: 'none', best, transcriptWindow }
  }

  // If we're already on the correct slide, no action needed
  if (targetSlideIndex === slideIndex) {
    return { action: 'none', best, transcriptWindow }
  }

  // If the match is for the next slide and score is high enough, advance
  if (targetSlideIndex === slideIndex + 1 && bestMatch.score > 0.6) {
    return { action: 'advance', targetIndex: targetSlideIndex, best, transcriptWindow }
  }

  // If the match is for a different slide and score is very high, update to that slide
  if (bestMatch.score > 0.8) {
    return { action: 'update', targetIndex: targetSlideIndex, best, transcriptWindow }
  }

  return { action: 'none', best, transcriptWindow }
}

