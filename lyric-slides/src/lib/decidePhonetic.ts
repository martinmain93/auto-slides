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
  slideIndex: number,
  songIndex?: { slides: Record<string, { phonemes: string[] }> },
  lastMoveTimestamp?: number
}): PhoneticDecision {
  const { transcriptWindow, vectorResults, currentSong, slideIndex, songIndex, lastMoveTimestamp } = params

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

  // Apply exponential recency bias: very high initially, decays over time
  const now = Date.now()
  let confidenceMultiplier = 1.0
  if (lastMoveTimestamp && (now - lastMoveTimestamp) < 5000) {
    const timeSinceMove = (now - lastMoveTimestamp) / 1000 // Convert to seconds
    // Exponential decay: starts at ~2.5x, 1.5x after 1s, 1.2x after 2s, 1.0x after 5s
    const decayRate = 0.9 // Higher = faster decay
    confidenceMultiplier = 1 + 1.5 * Math.exp(-decayRate * timeSinceMove)
  }

  // If we have words but very low confidence for all slides, go to blank
  if (transcriptWindow.trim().length > 10 && (!bestMatch || bestMatch.score < 0.3)) {
    const blankPos = slideIndex === 0 ? 'start' : 
                    slideIndex >= currentSong.slides.length - 1 ? 'end' : null
    return { action: 'blank', blankPos, best, transcriptWindow }
  }

  // If no good matches found, return none
  if (!bestMatch || bestMatch.score < 0.3) {
    return { action: 'none', best, transcriptWindow }
  }

  // Find the slide index that corresponds to the best matching slide
  const targetSlideIndex = currentSong.slides.findIndex(slide => slide.id === bestMatch.slideId)
  
  if (targetSlideIndex === -1) {
    return { action: 'none', best, transcriptWindow }
  }

  // Check if we're matching the end of the current slide (should advance to next)
  const currentSlideMatch = vectorResults.find(result => result.slideId === currentSong.slides[slideIndex]?.id)
  if (currentSlideMatch && currentSlideMatch.score > (0.7 * confidenceMultiplier) && songIndex) {
    const currentSlideId = currentSong.slides[slideIndex]?.id
    const slidePhonemeData = songIndex.slides[currentSlideId]
    
    if (slidePhonemeData) {
      const totalPhonemes = slidePhonemeData.phonemes.length
      const positionRatio = currentSlideMatch.bestPos / totalPhonemes
      
      // If we're in the last 10% of the slide, advance to next
      if (positionRatio > 0.90 && slideIndex < currentSong.slides.length - 1) {
        return { action: 'advance', targetIndex: slideIndex + 1, best, transcriptWindow }
      }
    }
  }

  // If we're already on the correct slide, no action needed
  if (targetSlideIndex === slideIndex) {
    return { action: 'none', best, transcriptWindow }
  }

  // If the match is for the next slide and score is high enough, advance
  if (targetSlideIndex === slideIndex + 1 && bestMatch.score > (0.6 * confidenceMultiplier)) {
    return { action: 'advance', targetIndex: targetSlideIndex, best, transcriptWindow }
  }

  // If the match is for a different slide and score is very high, update to that slide
  if (bestMatch.score > (0.92 * confidenceMultiplier)) {
    return { action: 'update', targetIndex: targetSlideIndex, best, transcriptWindow }
  }

  return { action: 'none', best, transcriptWindow }
}

