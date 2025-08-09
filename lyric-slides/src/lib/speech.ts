// Simple SpeechRecognition wrapper for browser-only usage
// Uses Web Speech API where available, with interim results.

export type SpeechCallbacks = {
  onPartial?: (text: string) => void
  onFinal?: (text: string) => void
  onStart?: () => void
  onStop?: () => void
  onError?: (err: Error) => void
}

export type SpeechController = {
  start: (opts?: { language?: string; continuous?: boolean }) => void
  stop: () => void
  isSupported: boolean
  isListening: () => boolean
}

export function createSpeechController(cb: SpeechCallbacks = {}): SpeechController {
  // Minimal Web Speech API types to avoid relying on lib.dom.d.ts support
  type SRAlternative = { transcript?: string }
  type SRResult = { 0?: SRAlternative; isFinal: boolean }
  type SRResultList = { length: number; [index: number]: SRResult }
  type SREvent = { resultIndex: number; results: SRResultList }
  type SRErrorEvent = { error?: string }
  type SpeechRecognitionLike = {
    continuous: boolean
    interimResults: boolean
    lang?: string
    onstart: (() => void) | null
    onend: (() => void) | null
    onerror: ((e: SRErrorEvent) => void) | null
    onresult: ((e: SREvent) => void) | null
    start: () => void
    stop: () => void
  }
  type RecConstructor = new () => SpeechRecognitionLike
  type SRGlobals = {
    SpeechRecognition?: RecConstructor
    webkitSpeechRecognition?: RecConstructor
  }
  const g = globalThis as unknown as SRGlobals
  const SpeechRec: RecConstructor | null = g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null
  let recognition: SpeechRecognitionLike | null = null
  let listening = false

  const isSupported = Boolean(SpeechRec)

  function ensureInstance(): SpeechRecognitionLike | null {
    if (!isSupported || !SpeechRec) return null
    if (recognition) return recognition
    recognition = new SpeechRec()
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      listening = true
      cb.onStart?.()
    }
    recognition.onend = () => {
      const wasListening = listening
      listening = false
      if (wasListening) cb.onStop?.()
    }
    recognition.onerror = (e) => {
      cb.onError?.(new Error(e.error || 'speech_error'))
    }
    recognition.onresult = (event) => {
      let interim = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const transcript = res[0]?.transcript || ''
        if (res.isFinal) finalText += transcript
        else interim += transcript
      }
      if (interim) cb.onPartial?.(interim)
      if (finalText) cb.onFinal?.(finalText)
    }
    return recognition
  }

  return {
    isSupported,
    isListening: () => listening,
    start: (opts) => {
      const rec = ensureInstance()
      if (!rec) {
        cb.onError?.(new Error('SpeechRecognition not supported'))
        return
      }
      if (opts?.language) rec.lang = opts.language
      if (typeof opts?.continuous === 'boolean') rec.continuous = opts.continuous
      try {
        rec.start()
      } catch {
        // Safari can throw if already started; try restarting
        try {
          rec.stop()
          rec.start()
        } catch (err) {
          cb.onError?.(err as Error)
        }
      }
    },
    stop: () => {
      if (!recognition) return
      try {
        recognition.stop()
      } catch (err) {
        cb.onError?.(err as Error)
      }
    },
  }
}
