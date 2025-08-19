import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createSpeechController } from '../lib/speech'

export function useSpeechTranscript() {
  const [isListening, setIsListening] = useState(false)
  const [partial, setPartial] = useState('')
  const speechRef = useRef<ReturnType<typeof createSpeechController> | null>(null)

  // Stats
  const lastFinalAtRef = useRef<number | null>(null)
  const lastPartialAtRef = useRef<number | null>(null)

  useEffect(() => {
    speechRef.current = createSpeechController({
      onPartial: (t) => {
        setPartial(t)
        lastPartialAtRef.current = Date.now()
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
    setFinals([])
    lastFinalAtRef.current = null
    lastPartialAtRef.current = null
  }, [])

  // Simplified transcript window: use only the live partial text
  const transcriptWindow = useMemo(() => (partial || '').trim(), [partial])

  return { isListening, transcriptWindow, toggleMic, resetTranscript }
}

