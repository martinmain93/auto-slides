import { describe, it, expect } from 'vitest'
import { hymnLibrary } from './fixtures/hymns'

// Declarative test structure for slide transitions.
// Each case specifies a starting song/slide and an ordered list of expected transitions
// with their acceptable time windows. The implementation that produces observed transitions
// will be added later; for now, the tests exercise the structure and will fail until
// the observation logic is implemented.

type ExpectedTransition = {
  expectedFrom: string
  expectedTo: string
  timestampStart: number
  timestampEnd: number
}

type TransitionCase = {
  name: string
  startSong: string // song id
  startSlide: string // slide id
  expectedTransitions: ExpectedTransition[]
}

// Helper to get slide ids by song title substring for readability if desired
function slideId(songId: string, slideIdx: number): string {
  const song = hymnLibrary.find(s => s.id === songId)
  if (!song) throw new Error(`song not found: ${songId}`)
  const slide = song.slides[slideIdx]
  if (!slide) throw new Error(`slide index out of range: ${songId}[${slideIdx}]`)
  return slide.id
}

// Define test cases using hymn fixtures. Timestamps are placeholders for now.
const cases: TransitionCase[] = [
  {
    name: 'Amazing Grace: slide 1 -> 2 after first verse completes',
    startSong: 'amazing-grace-fixture',
    startSlide: slideId('amazing-grace-fixture', 0), // ag-1
    expectedTransitions: [
      {
        expectedFrom: slideId('amazing-grace-fixture', 0),
        expectedTo: slideId('amazing-grace-fixture', 1),
        timestampStart: 1800,
        timestampEnd: 2200,
      },
    ],
  },
  {
    name: 'Amazing Grace: slide 2 -> 3 after second verse completes',
    startSong: 'amazing-grace-fixture',
    startSlide: slideId('amazing-grace-fixture', 1), // ag-2
    expectedTransitions: [
      {
        expectedFrom: slideId('amazing-grace-fixture', 1),
        expectedTo: slideId('amazing-grace-fixture', 2),
        timestampStart: 2200,
        timestampEnd: 2600,
      },
    ],
  },
]

// Placeholder for future observation logic
// This should run the presentation/matching loop and return observed transitions
// as tuples of { from, to, timestamp }.
async function getObservedTransitions(
  _startSong: string,
  _startSlide: string
): Promise<{ from: string; to: string; timestamp: number }[]> {
  // TODO: implement by wiring into the presentation logic or a simulator
  return []
}

describe('presentation transitions (declarative cases)', () => {
  for (const testCase of cases) {
    it(testCase.name, async () => {
      const observed = await getObservedTransitions(testCase.startSong, testCase.startSlide)

      for (const exp of testCase.expectedTransitions) {
        const match = observed.find(
          tr =>
            tr.from === exp.expectedFrom &&
            tr.to === exp.expectedTo &&
            tr.timestamp >= exp.timestampStart &&
            tr.timestamp <= exp.timestampEnd
        )
        expect(match, `Expected transition ${exp.expectedFrom} -> ${exp.expectedTo} between ${exp.timestampStart}-${exp.timestampEnd}ms`).toBeDefined()
      }
    })
  }
})

