import { describe, it, expect, beforeEach } from 'vitest'
import { SpeechSimulator, SlideAssertionRunner, type SpeechEvent } from './speechSimulator'
import { decideSlidePhonetic } from '../lib/decidePhonetic'
import type { Song } from '../types'
import { hymnLibrary, ag_case1_slide1_words, ag_case2_slide2_partial, ag_case3_slide2_full, ag_case4_slide4_start } from './fixtures/hymns'
import { phoneticScoresForSongs, buildPhoneticIndex } from '../lib/phonetics'

describe('real-time slide matching simulation', () => {
  let simulator: SpeechSimulator
  let tracker: SlideAssertionRunner

  const song: Song = hymnLibrary.find(s => s.id.startsWith('amazing-grace')) || hymnLibrary[0]
  const library: Song[] = hymnLibrary
  const indexes = Object.fromEntries(library.map(s => [s.id, buildPhoneticIndex(s)]))

  let currentSongId: string = song.id
  let slideIndex = 0

  function onTranscript(finals: string[], partial: string) {
    const transcriptWindow = [...finals.slice(-2), partial].join(' ').trim()

    // Debug: top candidates
    const scores = phoneticScoresForSongs({
      library,
      songIndexes: indexes,
      query: transcriptWindow,
      preferSongId: currentSongId,
      preferNextSlideId: song.slides[Math.min(song.slides.length - 1, slideIndex + 1)]?.id,
      inOrderSongIds: [song.id],
    }).slice(0, 5)
    console.log('[onTranscript]', {
      t: simulator.getCurrentTime(), finals, partial, transcriptWindow, slideIndex,
      top5: scores.map(s => ({ slideId: s.slideId, score: Number(s.score.toFixed(2)) })),
    })

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
      minAdvanceTokens: 2,
      minUpdateTokens: 2,
    })
    console.log('[decision]', { t: simulator.getCurrentTime(), decision })

    if ((decision.action === 'advance' || decision.action === 'update') && typeof decision.targetIndex === 'number') {
      slideIndex = decision.targetIndex
      const targetSongId = decision.targetSongId ?? currentSongId
      currentSongId = targetSongId
      const slideId = (targetSongId === song.id ? song.slides[slideIndex]?.id : '') || ''
      if (slideId) {
        console.log('[slideChange]', { t: simulator.getCurrentTime(), slideId })
        tracker.recordSlideChange(slideId, simulator.getCurrentTime())
      }
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

    await simulator.simulate(events)
    const history = tracker.getSlideHistory()
    const hit = history.find(h => h.slideId === 'ag-2' && h.timestamp >= lastWordTime && h.timestamp <= lastWordTime + 500)
    expect(Boolean(hit)).toBe(true)
  })

  it('advances to slide 2 only after finishing slide 1, then stays on slide 2 (no other slides) while slide 2 is incomplete', async () => {
    // Feed slide 1 fully, then begin slide 2 right after it completes
    const slide1 = ag_case1_slide1_words
    const slide2Partial = ag_case2_slide2_partial
    const lastWordTimeS1 = slide1[slide1.length - 1].timestamp

    // Shift slide 2 partial so its timestamps occur after slide 1 completion
    const shiftedS2 = slide2Partial.map(e => ({ ...e, timestamp: e.timestamp + lastWordTimeS1 + 10 }))
    const events = [...slide1, ...shiftedS2]

    await simulator.simulate(events)

    const history = tracker.getSlideHistory()

    // 1) Must NOT switch to slide 2 before slide 1 is finished
    const earlyToS2 = history.find(h => h.slideId === 'ag-2' && h.timestamp < lastWordTimeS1)
    expect(Boolean(earlyToS2)).toBe(false)

    // 2) Should switch to slide 2 within 500ms after finishing slide 1
    const onTimeToS2 = history.find(h => h.slideId === 'ag-2' && h.timestamp >= lastWordTimeS1 && h.timestamp <= lastWordTimeS1 + 500)
    expect(Boolean(onTimeToS2)).toBe(true)

    // 3) While slide 2 is still incomplete (we only spoke a partial), do NOT visit other slides
    const visitedOther = history.find(h => h.slideId !== 'ag-2' && h.slideId !== 'ag-1')
    expect(Boolean(visitedOther)).toBe(false)
  })

  it('advances to 3rd slide no later than 500ms after finishing 2nd slide words (allows early adoption)', async () => {
    slideIndex = 1 // start from slide 2
    const events = ag_case3_slide2_full
    const lastWordTime = events[events.length - 1].timestamp
    await simulator.simulate(events)
    const history = tracker.getSlideHistory()
    // Accept either early adoption or on-time advance, but never later than +500ms from final word
    const firstHit = history.find(h => h.slideId === 'ag-3')
    expect(Boolean(firstHit)).toBe(true)
    if (firstHit) {
      expect(firstHit.timestamp <= lastWordTime + 500).toBe(true)
    }
  })

  it('switches from s3 to s4 within 500ms of second word of s4 after finishing s2', async () => {
    slideIndex = 2 // start from slide 3
    const events = ag_case4_slide4_start
    const secondWordTime = events[1].timestamp
    await simulator.simulate(events)
    const history = tracker.getSlideHistory()
    const hit = history.find(h => h.slideId === 'ag-4' && h.timestamp >= secondWordTime && h.timestamp <= secondWordTime + 500)
    expect(Boolean(hit)).toBe(true)
  })
})

