import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createSpeechController } from '../lib/speech'
import { phoneticTokens } from '../lib/phonetics'

// Note: with controller-level index-based onresult handling, we no longer need
// to heuristically merge partial and final text here.

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
        // Append finalized phrase directly; controller ensures no duplication with partial via indices
        setFinalText((prev) => (prev ? `${prev} ${t}` : t))
        lastFinalAtRef.current = Date.now()
        // Clear partial after finalizing that segment
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

  // Combined transcript window: final buffer + live partial. Duplicates are avoided at source (onresult indexing).
  const transcriptWindow = useMemo(() => `${finalText} ${partial}`.trim(), [finalText, partial])
  const phoneticTranscript = phoneticTokens(transcriptWindow)

  return { isListening, transcriptWindow, phoneticTranscript, toggleMic, resetTranscript }
}

