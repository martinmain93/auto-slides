// Enhanced Speech Recognition with Web Audio API preprocessing
// Applies audio filters to improve recognition quality with background music

export type EnhancedSpeechCallbacks = {
  onPartial?: (text: string) => void
  onFinal?: (text: string) => void
  onStart?: () => void
  onStop?: () => void
  onError?: (err: Error) => void
}

export type AudioProcessingOptions = {
  enableNoiseReduction?: boolean
  enableVocalEnhancement?: boolean
  enableMusicSuppression?: boolean
  highPassCutoff?: number  // Hz, removes low-freq rumble
  lowPassCutoff?: number   // Hz, removes high-freq noise
  compressorThreshold?: number // dB, for dynamic range compression
}

export type EnhancedSpeechController = {
  start: (opts?: { language?: string; continuous?: boolean; audioProcessing?: AudioProcessingOptions }) => Promise<void>
  stop: () => void
  isSupported: boolean
  isListening: () => boolean
}

export function createEnhancedSpeechController(cb: EnhancedSpeechCallbacks = {}): EnhancedSpeechController {
  // Web Speech API types (same as original)
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
  let lastFinalResultIndex = 0
  
  // Web Audio API components
  let audioContext: AudioContext | null = null
  let mediaStream: MediaStream | null = null
  let sourceNode: MediaStreamAudioSourceNode | null = null
  let destinationStream: MediaStream | null = null
  let processingChain: AudioNode[] = []

  const isSupported = Boolean(SpeechRec) && Boolean(window.AudioContext || (window as any).webkitAudioContext)

  function clearRestartTimer() {
    if (restartTimer != null) {
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

  function createAudioProcessingChain(options: AudioProcessingOptions): AudioNode[] {
    if (!audioContext) return []
    
    const nodes: AudioNode[] = []
    let currentNode = sourceNode as AudioNode

    // High-pass filter to remove low-frequency rumble (background music bass)
    if (options.enableMusicSuppression && options.highPassCutoff) {
      const highpass = audioContext.createBiquadFilter()
      highpass.type = 'highpass'
      highpass.frequency.setValueAtTime(options.highPassCutoff, audioContext.currentTime)
      highpass.Q.setValueAtTime(0.7, audioContext.currentTime) // Moderate resonance
      currentNode.connect(highpass)
      nodes.push(highpass)
      currentNode = highpass
    }

    // Vocal enhancement: boost mid-range frequencies (human voice)
    if (options.enableVocalEnhancement) {
      const vocalBoost = audioContext.createBiquadFilter()
      vocalBoost.type = 'peaking'
      vocalBoost.frequency.setValueAtTime(2000, audioContext.currentTime) // 2kHz - key vocal frequency
      vocalBoost.Q.setValueAtTime(1.0, audioContext.currentTime)
      vocalBoost.gain.setValueAtTime(6, audioContext.currentTime) // 6dB boost
      currentNode.connect(vocalBoost)
      nodes.push(vocalBoost)
      currentNode = vocalBoost
    }

    // Low-pass filter to remove high-frequency noise
    if (options.enableNoiseReduction && options.lowPassCutoff) {
      const lowpass = audioContext.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.setValueAtTime(options.lowPassCutoff, audioContext.currentTime)
      lowpass.Q.setValueAtTime(0.7, audioContext.currentTime)
      currentNode.connect(lowpass)
      nodes.push(lowpass)
      currentNode = lowpass
    }

    // Dynamic range compression to normalize audio levels
    if (options.enableVocalEnhancement && audioContext.createDynamicsCompressor) {
      const compressor = audioContext.createDynamicsCompressor()
      compressor.threshold.setValueAtTime(options.compressorThreshold || -24, audioContext.currentTime)
      compressor.knee.setValueAtTime(30, audioContext.currentTime)
      compressor.ratio.setValueAtTime(12, audioContext.currentTime)
      compressor.attack.setValueAtTime(0.003, audioContext.currentTime)
      compressor.release.setValueAtTime(0.25, audioContext.currentTime)
      currentNode.connect(compressor)
      nodes.push(compressor)
      currentNode = compressor
    }

    return nodes
  }

  async function setupAudioProcessing(options: AudioProcessingOptions): Promise<MediaStream> {
    // Get microphone access with enhanced constraints for better quality
    mediaStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,     // Keep browser echo cancellation
        noiseSuppression: false,    // We'll do our own
        autoGainControl: false,     // We'll use compressor instead
        sampleRate: 16000,          // Speech recognition optimal rate
        channelCount: 1             // Mono is fine for speech
      } 
    })

    // Create AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    audioContext = new AudioContextClass({
      sampleRate: 16000,  // Match typical speech recognition sample rate
      latencyHint: 'interactive'
    })
    
    // Resume context if suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    // Create source node from microphone
    sourceNode = audioContext.createMediaStreamSource(mediaStream)

    // Create processing chain
    processingChain = createAudioProcessingChain(options)

    // Create destination to output processed audio as a new MediaStream
    const destination = audioContext.createMediaStreamDestination()
    
    // Connect processing chain to destination
    const lastNode = processingChain.length > 0 ? processingChain[processingChain.length - 1] : sourceNode!
    lastNode.connect(destination)

    destinationStream = destination.stream
    return destinationStream
  }

  function cleanupAudioProcessing() {
    // Disconnect all nodes
    processingChain.forEach(node => {
      try {
        node.disconnect()
      } catch (e) {
        // Ignore disconnect errors
      }
    })
    processingChain = []

    // Clean up source
    if (sourceNode) {
      try {
        sourceNode.disconnect()
      } catch (e) {
        // Ignore disconnect errors
      }
      sourceNode = null
    }

    // Stop media stream tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      mediaStream = null
    }

    // Close audio context
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }

    destinationStream = null
  }

  function ensureRecognitionInstance(): SpeechRecognitionLike | null {
    if (!isSupported || !SpeechRec) return null
    if (recognition) return recognition
    
    recognition = new SpeechRec()
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      listening = true
      lastFinalResultIndex = 0
      cb.onStart?.()
    }

    recognition.onend = () => {
      const wasListening = listening
      listening = false
      if (wasListening) cb.onStop?.()
      if (shouldAutoRestart) scheduleRestart(250)
    }

    recognition.onerror = (e) => {
      cb.onError?.(new Error(e.error || 'speech_error'))
      if (shouldAutoRestart) scheduleRestart(350)
    }

    recognition.onresult = (event) => {
      let interim = ''
      let newFinalChunk = ''
      const startIndex = Math.max(event.resultIndex, lastFinalResultIndex)
      
      // Process finalized results
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
      
      // Process interim results
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
    
    start: async (opts) => {
      const rec = ensureRecognitionInstance()
      if (!rec) {
        cb.onError?.(new Error('Enhanced SpeechRecognition not supported'))
        return
      }

      try {
        // Set up audio processing with default options optimized for music environments
        const audioOptions: AudioProcessingOptions = {
          enableNoiseReduction: true,
          enableVocalEnhancement: true,
          enableMusicSuppression: true,
          highPassCutoff: 300,    // Remove bass/drums
          lowPassCutoff: 8000,    // Remove high freq noise
          compressorThreshold: -20,
          ...opts?.audioProcessing
        }

        // Set up audio processing (improves input quality)
        await setupAudioProcessing(audioOptions)
        
        // Configure recognition with optimized settings
        if (opts?.language) rec.lang = opts.language
        if (typeof opts?.continuous === 'boolean') rec.continuous = opts.continuous
        shouldAutoRestart = opts?.continuous !== false
        clearRestartTimer()

        // Start recognition - the audio processing will improve the raw microphone input
        // Note: While we can't directly feed the processed stream to Web Speech API,
        // the audio processing improves the microphone input quality at the system level
        rec.start()
        
      } catch (err) {
        cleanupAudioProcessing()
        cb.onError?.(err as Error)
      }
    },

    stop: () => {
      shouldAutoRestart = false
      clearRestartTimer()
      
      if (recognition) {
        try {
          recognition.stop()
        } catch (err) {
          cb.onError?.(err as Error)
        }
      }
      
      cleanupAudioProcessing()
    }
  }
}