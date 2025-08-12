import { describe, it, expect, beforeEach } from 'vitest'
import { SpeechSimulator, SlideAssertionRunner, createSlideWindow, type SpeechEvent } from './speechSimulator'
import { decideSlidePhonetic } from '../lib/decidePhonetic'
import type { Song } from '../types'
import { hymnLibrary, ag_case1_slide1_words, ag_case2_slide2_partial, ag_case3_slide2_full, ag_case4_slide4_start } from './fixtures/hymns'

// This is a high-level integration-style test harness outline that demonstrates usage
// of the simulator. It assumes a runtime environment where your matching hook/logic
// can be invoked with changing transcripts and emits slide change events.
// In a real app, you would wire a small headless controller that takes (finals, partial)
// and returns decisions (like usePhoneticSlideMatch), then the test orchestrates feeding
// speech events and listens for slide change decisions.

describe('real-time slide matching simulation', () => {
  const windowSize = 500
  let simulator: SpeechSimulator
  let tracker: SlideAssertionRunner

  // Use hand-coded hymn fixtures
  const song: Song = hymnLibrary.find(s => s.id.startsWith('amazing-grace')) || hymnLibrary[0]
  const library: Song[] = hymnLibrary

  // mock controller: in a real test, import a small function that wraps usePhoneticSlideMatch
  // Here we just track slide changes externally when your app under test calls back.
  let currentSongId: string = song.id
  let slideIndex = 0

  function onTranscript(finals: string[], partial: string) {
    const transcriptWindow = [...finals.slice(-2), partial].join(' ').trim()
    const decision = decideSlidePhonetic({
      currentSong: library.find(s => s.id === currentSongId),
      library,
      queue: [song.id],
      transcriptWindow,
      slideIndex,
      acceptNextThreshold: 0.7,
      acceptAnyThreshold: 0.6,
      blankThreshold: 0.45,
      crossSongThreshold: 0.8,
    })
    if ((decision.action === 'advance' || decision.action === 'update') && typeof decision.targetIndex === 'number') {
      slideIndex = decision.targetIndex
      const targetSongId = (decision as any).targetSongId || currentSongId
      currentSongId = targetSongId
      const slideId = (targetSongId === song.id ? song.slides[slideIndex]?.id : '') || ''
      if (slideId) tracker.recordSlideChange(slideId, simulator.getCurrentTime())
    }
  }

  beforeEach(() => {
    currentSongId = song.id
    slideIndex = 0
    simulator = new SpeechSimulator(onTranscript)
    tracker = new SlideAssertionRunner()
  })

  it('advances after first slide words, with correct timing windows', async () => {
    const events: SpeechEvent[] = ag_case1_slide1_words

    const lastWordTime = events[events.length - 1].timestamp
    const expectedAdvanceTime = lastWordTime + 300 // 300ms logic overhead

    // Assertions
    const assertions = [
      createSlideWindow('s2', expectedAdvanceTime, windowSize, ['s3', 's4']),
    ]

    await simulator.simulate(events)
    const { passed, errors } = tracker.validateAssertions(assertions)
    expect(passed).toBe(true)
    if (!passed) console.error(errors.join('\n'))
  })

  it('ignores second slide words while still on slide 1', async () => {
    const events = ag_case2_slide2_partial
    const assertions = [
      // Ensure s2 does NOT appear in first second
      { slideId: 's2', startTime: 0, endTime: 1000, shouldNotAppear: ['s2'] },
    ]
    await simulator.simulate(events)
    const { passed, errors } = tracker.validateAssertions(assertions)
    expect(passed).toBe(true)
    if (!passed) console.error(errors.join('\n'))
  })

  it('advances to 3rd slide within 500ms after finishing 2nd slide words', async () => {
    const events = ag_case3_slide2_full
    const lastWordTime = events[events.length - 1].timestamp
    const expected = lastWordTime + 300
    const assertions = [createSlideWindow('s3', expected, windowSize, ['s1', 's4'])]
    await simulator.simulate(events)
    const { passed, errors } = tracker.validateAssertions(assertions)
    expect(passed).toBe(true)
    if (!passed) console.error(errors.join('\n'))
  })

  it('switches from s3 to s4 within 500ms of second word of s4 after finishing s2', async () => {
    const events = ag_case4_slide4_start
    const secondWordTime = events[1].timestamp
    const expected = secondWordTime + 300
    const assertions = [createSlideWindow('s4', expected, windowSize, ['s1', 's2'])]
    await simulator.simulate(events)
    const { passed, errors } = tracker.validateAssertions(assertions)
    expect(passed).toBe(true)
    if (!passed) console.error(errors.join('\n'))
  })
})

