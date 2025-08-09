import { useEffect, useRef, useState, useCallback } from 'react'
import { createSpeechController } from '../lib/speech'

export function useSpeechTranscript() {
  const [isListening, setIsListening] = useState(false)
  const [partial, setPartial] = useState('')
  const [finals, setFinals] = useState<string[]>([])
  const speechRef = useRef<ReturnType<typeof createSpeechController> | null>(null)

  useEffect(() => {
    speechRef.current = createSpeechController({
      onPartial: (t) => setPartial(t),
      onFinal: (t) => setFinals((arr) => [...arr, t]),
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

  return { isListening, partial, finals, toggleMic }
}

