import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createEnhancedSpeechController } from '../lib/enhancedSpeech'

export function useEnhancedSpeechTranscript() {
  const [isListening, setIsListening] = useState(false)
  const [partial, setPartial] = useState('')
  const [finalText, setFinalText] = useState('')
  const speechRef = useRef<ReturnType<typeof createEnhancedSpeechController> | null>(null)

  // Audio processing options optimized for music environments
  const audioProcessingOptions = useMemo(() => ({
    enableNoiseReduction: true,
    enableVocalEnhancement: true,
    enableMusicSuppression: true,
    highPassCutoff: 440,      // Remove low-frequency music/bass
    lowPassCutoff: 11000,      // Remove high-frequency noise
    compressorThreshold: -18  // Compress dynamic range for consistent levels
  }), [])

  // Stats for debugging
  const lastFinalAtRef = useRef<number | null>(null)
  const lastPartialAtRef = useRef<number | null>(null)

  useEffect(() => {
    speechRef.current = createEnhancedSpeechController({
      onPartial: (t) => {
        setPartial(t)
        lastPartialAtRef.current = Date.now()
      },
      onFinal: (t) => {
        // Append finalized phrase
        setFinalText((prev) => (prev ? `${prev} ${t}` : t))
        lastFinalAtRef.current = Date.now()
        // Clear partial after finalizing
        setPartial('')
      },
      onStart: () => setIsListening(true),
      onStop: () => setIsListening(false),
      onError: (err) => {
        console.error('Enhanced speech recognition error:', err)
        setIsListening(false)
      }
    })

    // Cleanup on unmount
    return () => {
      speechRef.current?.stop()
    }
  }, [])

  const toggleMic = useCallback(async () => {
    const speech = speechRef.current
    if (!speech) return
    
    if (!speech.isSupported) {
      alert('Enhanced speech recognition is not supported in this browser.')
      return
    }

    if (speech.isListening()) {
      speech.stop()
    } else {
      try {
        await speech.start({ 
          language: 'en-US', 
          continuous: true,
          audioProcessing: audioProcessingOptions
        })
      } catch (err) {
        console.error('Failed to start enhanced speech recognition:', err)
        alert('Failed to start microphone with enhanced processing. Please check permissions.')
      }
    }
  }, [audioProcessingOptions])

  const resetTranscript = useCallback(() => {
    setPartial('')
    setFinalText('')
    lastFinalAtRef.current = null
    lastPartialAtRef.current = null
  }, [])

  // Combined transcript window
  const transcriptWindow = useMemo(() => `${finalText} ${partial}`.trim(), [finalText, partial])

  // Additional controls for audio processing
  const updateAudioProcessing = useCallback(async (newOptions: Partial<typeof audioProcessingOptions>) => {
    const speech = speechRef.current
    if (!speech || !speech.isListening()) return

    // Restart with new options
    speech.stop()
    await new Promise(resolve => setTimeout(resolve, 100)) // Brief pause
    
    try {
      await speech.start({
        language: 'en-US',
        continuous: true,
        audioProcessing: { ...audioProcessingOptions, ...newOptions }
      })
    } catch (err) {
      console.error('Failed to restart with new audio processing options:', err)
    }
  }, [audioProcessingOptions])

  return { 
    isListening, 
    transcriptWindow, 
    toggleMic, 
    resetTranscript,
    updateAudioProcessing,
    audioProcessingOptions
  }
}