// Test utilities for simulating real-time speech recognition and validating slide transitions

export type SpeechEvent = {
  word: string
  timestamp: number // milliseconds from start
  isFinal?: boolean // defaults to true
}

export type SlideAssertion = {
  slideId: string
  startTime: number // earliest acceptable time for this slide to appear
  endTime: number // latest acceptable time for this slide to appear
  shouldNotAppear?: string[] // slide IDs that should NOT appear in this window
}

export type TestCase = {
  name: string
  speechEvents: SpeechEvent[]
  assertions: SlideAssertion[]
}

export class SpeechSimulator {
  private currentTime = 0
  private isRunning = false
  private timeoutIds: number[] = []
  private transcript = { finals: [] as string[], partial: '' }
  private onTranscriptChange?: (finals: string[], partial: string) => void

  constructor(onTranscriptChange?: (finals: string[], partial: string) => void) {
    this.onTranscriptChange = onTranscriptChange
  }

  setTranscriptCallback(callback: (finals: string[], partial: string) => void) {
    this.onTranscriptChange = callback
  }

  async simulate(speechEvents: SpeechEvent[], speedMultiplier = 1): Promise<void> {
    this.reset()
    this.isRunning = true
    
    const sortedEvents = [...speechEvents].sort((a, b) => a.timestamp - b.timestamp)
    
    return new Promise<void>((resolve) => {
      let eventIndex = 0
      
      const scheduleNextEvent = () => {
        if (!this.isRunning || eventIndex >= sortedEvents.length) {
          this.isRunning = false
          resolve()
          return
        }
        
        const event = sortedEvents[eventIndex]
        const delay = (event.timestamp - this.currentTime) / speedMultiplier
        
        const timeoutId = window.setTimeout(() => {
          if (!this.isRunning) return
          
          this.currentTime = event.timestamp
          this.processEvent(event)
          eventIndex++
          scheduleNextEvent()
        }, Math.max(0, delay))
        
        this.timeoutIds.push(timeoutId)
      }
      
      scheduleNextEvent()
    })
  }

  private processEvent(event: SpeechEvent) {
    const isFinal = event.isFinal ?? true
    
    if (isFinal) {
      // Add to finals and clear partial
      this.transcript.finals.push(event.word)
      this.transcript.partial = ''
    } else {
      // Update partial
      this.transcript.partial = event.word
    }
    
    this.onTranscriptChange?.(
      [...this.transcript.finals],
      this.transcript.partial
    )
  }

  stop() {
    this.isRunning = false
    this.timeoutIds.forEach(id => window.clearTimeout(id))
    this.timeoutIds = []
  }

  reset() {
    this.stop()
    this.currentTime = 0
    this.transcript = { finals: [], partial: '' }
  }

  getCurrentTime() {
    return this.currentTime
  }
}

export class SlideAssertionRunner {
  private slideHistory: { slideId: string; timestamp: number }[] = []
  private currentSlideId: string | null = null

  recordSlideChange(slideId: string, timestamp: number) {
    this.slideHistory.push({ slideId, timestamp })
    this.currentSlideId = slideId
  }

  getCurrentSlide() {
    return this.currentSlideId
  }

  getSlideHistory() {
    return [...this.slideHistory]
  }

  validateAssertions(assertions: SlideAssertion[]): { passed: boolean; errors: string[] } {
    const errors: string[] = []
    
    for (const assertion of assertions) {
      const { slideId, startTime, endTime, shouldNotAppear = [] } = assertion
      
      // Check if the expected slide appeared in the time window
      const slideAppearances = this.slideHistory.filter(
        entry => entry.slideId === slideId && 
                entry.timestamp >= startTime && 
                entry.timestamp <= endTime
      )
      
      if (slideAppearances.length === 0) {
        errors.push(
          `Expected slide '${slideId}' to appear between ${startTime}ms and ${endTime}ms, but it did not appear in that window`
        )
      }
      
      // Check that forbidden slides did not appear in the window
      for (const forbiddenSlideId of shouldNotAppear) {
        const forbiddenAppearances = this.slideHistory.filter(
          entry => entry.slideId === forbiddenSlideId &&
                  entry.timestamp >= startTime &&
                  entry.timestamp <= endTime
        )
        
        if (forbiddenAppearances.length > 0) {
          errors.push(
            `Slide '${forbiddenSlideId}' should not have appeared between ${startTime}ms and ${endTime}ms, but it appeared at: ${forbiddenAppearances.map(a => a.timestamp).join(', ')}ms`
          )
        }
      }
    }
    
    return { passed: errors.length === 0, errors }
  }

  reset() {
    this.slideHistory = []
    this.currentSlideId = null
  }
}

// Helper function to create speech events from text with timing
export function createSpeechEvents(
  text: string, 
  startTime = 0, 
  wordInterval = 300
): SpeechEvent[] {
  const words = text.trim().split(/\s+/)
  return words.map((word, index) => ({
    word,
    timestamp: startTime + (index * wordInterval),
    isFinal: true,
  }))
}

// Helper to create time-based assertions
export function createSlideWindow(
  slideId: string,
  centerTime: number,
  windowSize = 500,
  shouldNotAppear: string[] = []
): SlideAssertion {
  return {
    slideId,
    startTime: centerTime - windowSize / 2,
    endTime: centerTime + windowSize / 2,
    shouldNotAppear,
  }
}
