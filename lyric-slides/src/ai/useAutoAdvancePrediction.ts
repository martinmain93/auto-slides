// import { useEffect, useRef } from 'react'

// export function useAutoAdvancePrediction(params: {
//   currentSlideText?: string
//   transcriptWindow: string
//   avgWps: number
//   estLatencyMs: number
//   onPredictedAdvance: () => void
// }) {
//   const { currentSlideText, transcriptWindow, avgWps, estLatencyMs, onPredictedAdvance } = params
//   const timerRef = useRef<number | null>(null)

//   useEffect(() => {
//     if (!currentSlideText) return
//     const wordsSlide = currentSlideText.trim().split(/\s+/).filter(Boolean)
//     const wordsSpoken = transcriptWindow.trim().split(/\s+/).filter(Boolean)

//     // If not speaking yet, cancel
//     if (wordsSpoken.length === 0) {
//       if (timerRef.current) window.clearTimeout(timerRef.current)
//       timerRef.current = null
//       return
//     }

//     // Estimate remaining words: slide words minus what we've likely covered
//     const remaining = Math.max(0, wordsSlide.length - wordsSpoken.length)

//     // Predict time left: remaining / avgWps, then add estimated latency buffer
//     const secondsLeft = remaining / Math.max(0.5, avgWps)
//     const msLeft = Math.round(secondsLeft * 1000 + estLatencyMs)

//     // Reschedule timer to advance at the predicted finish
//     if (timerRef.current) window.clearTimeout(timerRef.current)
//     timerRef.current = window.setTimeout(() => {
//       onPredictedAdvance()
//     }, msLeft)

//     return () => {
//       if (timerRef.current) window.clearTimeout(timerRef.current)
//       timerRef.current = null
//     }
//   }, [currentSlideText, transcriptWindow, avgWps, estLatencyMs, onPredictedAdvance])
// }

