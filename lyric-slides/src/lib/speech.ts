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
  let shouldAutoRestart = false
  let restartTimer: number | null = null
  // Track where finalized results end so we can build interim reliably
  let lastFinalResultIndex = 0

  const isSupported = Boolean(SpeechRec)

  function clearRestartTimer() {
    if (restartTimer != null) {
      // In browsers, setTimeout returns a number ID
      clearTimeout(restartTimer as unknown as number)
      restartTimer = null
    }
  }

  function scheduleRestart(delay = 300) {
    clearRestartTimer()
    if (!shouldAutoRestart) return
    const rec = recognition
    if (!rec) return
    restartTimer = setTimeout(() => {
      try {
        rec.start()
      } catch {
        try {
          rec.stop()
          rec.start()
        } catch (err) {
          cb.onError?.(err as Error)
        }
      }
    }, delay) as unknown as number
  }

  function ensureInstance(): SpeechRecognitionLike | null {
    if (!isSupported || !SpeechRec) return null
    if (recognition) return recognition
    recognition = new SpeechRec()
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      listening = true
      // New session: reset our result index tracking
      lastFinalResultIndex = 0
      cb.onStart?.()
    }
    recognition.onend = () => {
      const wasListening = listening
      listening = false
      if (wasListening) cb.onStop?.()
      // Auto-restart if we didn't explicitly stop and continuous listening was requested
      if (shouldAutoRestart) scheduleRestart(250)
    }
    recognition.onerror = (e) => {
      cb.onError?.(new Error(e.error || 'speech_error'))
      // For transient errors, try to resume if allowed
      if (shouldAutoRestart) scheduleRestart(350)
    }
    recognition.onresult = (event) => {
      let interim = ''
      let newFinalChunk = ''
      // Start from whichever is greater: the index of changes or our last finalized boundary
      const startIndex = Math.max(event.resultIndex, lastFinalResultIndex)
      // First, consume any newly-finalized results
      let i = startIndex
      for (; i < event.results.length; i++) {
        const res = event.results[i]
        const transcript = res[0]?.transcript || ''
        if (res.isFinal) {
          newFinalChunk += transcript
          lastFinalResultIndex = i + 1
        } else {
          break
        }
      }
      // Then, rebuild interim from the remaining non-final results
      for (let j = lastFinalResultIndex; j < event.results.length; j++) {
        const res = event.results[j]
        const transcript = res[0]?.transcript || ''
        if (!res.isFinal) interim += transcript
      }
      if (interim) cb.onPartial?.(interim)
      if (newFinalChunk) cb.onFinal?.(newFinalChunk)
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
      // Enable auto-restart only when continuous listening is requested (default true in our usage)
      shouldAutoRestart = opts?.continuous !== false
      clearRestartTimer()
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
      shouldAutoRestart = false
      clearRestartTimer()
      if (!recognition) return
      try {
        recognition.stop()
      } catch (err) {
        cb.onError?.(err as Error)
      }
    },
  }
}
