import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createSpeechController } from '../lib/speech'
import { phoneticTokens } from '../lib/phonetics'

function tokenize(s: string): string[] {
  // Normalize whitespace, keep basic punctuation as part of tokens to reduce false matches.
  return s.trim().split(/\s+/).filter(Boolean)
}

function mergeWithoutDup(finalText: string, partialText: string): string {
  if (!finalText) return partialText.trim()
  if (!partialText) return finalText.trim()
  const finalTokens = tokenize(finalText)
  const partialTokens = tokenize(partialText)
  // Find the largest k such that last k tokens of final == first k tokens of partial (case-insensitive)
  const maxK = Math.min(finalTokens.length, partialTokens.length)
  let overlap = 0
  for (let k = maxK; k >= 1; k--) {
    let match = true
    for (let i = 0; i < k; i++) {
      if (finalTokens[finalTokens.length - k + i].toLowerCase() !== partialTokens[i].toLowerCase()) {
        match = false
        break
      }
    }
    if (match) {
      overlap = k
      break
    }
  }
  const mergedTokens = finalTokens.concat(partialTokens.slice(overlap))
  return mergedTokens.join(' ').trim()
}

export function useSpeechTranscript() {
  const [isListening, setIsListening] = useState(false)
  const [partial, setPartial] = useState('')
  const [finalText, setFinalText] = useState('')
  const speechRef = useRef<ReturnType<typeof createSpeechController> | null>(null)

  // Stats
  const lastFinalAtRef = useRef<number | null>(null)
  const lastPartialAtRef = useRef<number | null>(null)

  useEffect(() => {
    speechRef.current = createSpeechController({
      onPartial: (t) => {
        setPartial((prev) => t)
        lastPartialAtRef.current = Date.now()
      },
      onFinal: (t) => {
        // Append finalized phrase to the final buffer without duplicating any trailing words from the current final
        setFinalText((prev) => mergeWithoutDup(prev, t))
        lastFinalAtRef.current = Date.now()
        // Clear partial after finalizing that segment to avoid duplicate display
        setPartial('')
      },
      onStart: () => setIsListening(true),
      onStop: () => setIsListening(false),
    })
  }, [])

  const toggleMic = useCallback(() => {
    const speech = speechRef.current
    if (!speech) return
    if (!speech.isSupported) {
      alert('Speech recognition is not supported in this browser.')
      return
    }
    if (speech.isListening()) speech.stop()
    else speech.start({ language: 'en-US', continuous: true })
  }, [])

  const resetTranscript = useCallback(() => {
    setPartial('')
    setFinalText('')
    lastFinalAtRef.current = null
    lastPartialAtRef.current = null
  }, [])

  // Combined transcript window: final buffer + live partial, without duplicate overlap
  const transcriptWindow = useMemo(() => mergeWithoutDup(finalText, partial), [finalText, partial])
  const phoneticTranscript = phoneticTokens(transcriptWindow)

  return { isListening, transcriptWindow, phoneticTranscript, toggleMic, resetTranscript }
}

