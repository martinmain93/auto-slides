import { useEffect, useRef, useState, useCallback } from 'react'
import { createSpeechController } from '../lib/speech'

export function useSpeechTranscript() {
  const [isListening, setIsListening] = useState(false)
  const [partial, setPartial] = useState('')
  const [finals, setFinals] = useState<string[]>([])
  const speechRef = useRef<ReturnType<typeof createSpeechController> | null>(null)

  // Stats
  const [avgWps, setAvgWps] = useState(2.5) // default speaking ~150 wpm
  const [estLatencyMs, setEstLatencyMs] = useState(300)
  const lastFinalAtRef = useRef<number | null>(null)
  const lastPartialAtRef = useRef<number | null>(null)

  useEffect(() => {
    speechRef.current = createSpeechController({
      onPartial: (t) => {
        setPartial(t)
        lastPartialAtRef.current = Date.now()
      },
      onFinal: (t) => {
        setFinals((arr) => [...arr, t])
        const now = Date.now()
        // Update WPS estimate based on time between final chunks
        const prev = lastFinalAtRef.current
        lastFinalAtRef.current = now
        if (prev) {
          const dt = (now - prev) / 1000
          const words = t.trim().split(/\s+/).filter(Boolean).length
          if (dt > 0 && words > 0) {
            const instant = words / dt
            // EMA smoothing
            setAvgWps((old) => old * 0.8 + instant * 0.2)
          }
        }
        // Estimate latency as delay from last partial emission to finalization
        const lastPartial = lastPartialAtRef.current
        if (lastPartial) {
          const lag = now - lastPartial
          setEstLatencyMs((old) => Math.round(old * 0.8 + lag * 0.2))
        }
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

  return { isListening, partial, finals, toggleMic, resetTranscript, avgWps, estLatencyMs }
}

