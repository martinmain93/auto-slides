import type { Song } from '../../types'
import type { SpeechEvent } from '../speechSimulator'

// Hymn library with hand-authored slides (first lines/verses) and hand-coded word timings
// Timings are approximate and manually chosen to emulate natural speech pacing.

export const hymnLibrary: Song[] = [
  {
    id: 'amazing-grace-fixture',
    title: 'Amazing Grace',
    slides: [
      { id: 'ag-1', text: 'Amazing grace how sweet the sound\nThat saved a wretch like me' },
      { id: 'ag-2', text: 'I once was lost but now am found\nWas blind but now I see' },
      { id: 'ag-3', text: "Twas grace that taught my heart to fear\nAnd grace my fears relieved" },
      { id: 'ag-4', text: 'How precious did that grace appear\nThe hour I first believed' },
    ],
  },
  {
    id: 'how-great-thou-art-fixture',
    title: 'How Great Thou Art',
    slides: [
      { id: 'hgta-1', text: 'O Lord my God when I in awesome wonder\nConsider all the worlds Thy hands have made' },
      { id: 'hgta-2', text: 'Then sings my soul my Savior God to Thee\nHow great Thou art how great Thou art' },
    ],
  },
  {
    id: 'blessed-assurance-fixture',
    title: 'Blessed Assurance',
    slides: [
      { id: 'ba-1', text: 'Blessed assurance Jesus is mine\nOh what a foretaste of glory divine' },
      { id: 'ba-2', text: 'Heir of salvation purchase of God\nBorn of His Spirit washed in His blood' },
    ],
  },
  {
    id: 'great-is-thy-faithfulness-fixture',
    title: 'Great Is Thy Faithfulness',
    slides: [
      { id: 'gitf-1', text: 'Great is Thy faithfulness O God my Father\nThere is no shadow of turning with Thee' },
      { id: 'gitf-2', text: 'Thou changest not Thy compassions they fail not\nAs Thou hast been Thou forever wilt be' },
    ],
  },
  {
    id: 'be-thou-my-vision-fixture',
    title: 'Be Thou My Vision',
    slides: [
      { id: 'btmv-1', text: 'Be Thou my vision O Lord of my heart\nNaught be all else to me save that Thou art' },
      { id: 'btmv-2', text: 'Thou my best thought by day or by night\nWaking or sleeping Thy presence my light' },
    ],
  },
]

// Hand-coded speech fixtures for Amazing Grace (used in tests)
// Case 1: Words for slide 1 in order (advance to slide 2 after last word)
export const ag_case1_slide1_words: SpeechEvent[] = [
  { word: 'Amazing', timestamp: 0 },
  { word: 'grace', timestamp: 220 },
  { word: 'how', timestamp: 420 },
  { word: 'sweet', timestamp: 590 },
  { word: 'the', timestamp: 760 },
  { word: 'sound', timestamp: 900 },
  { word: 'That', timestamp: 1120 },
  { word: 'saved', timestamp: 1320 },
  { word: 'a', timestamp: 1440 },
  { word: 'wretch', timestamp: 1600 },
  { word: 'like', timestamp: 1780 },
  { word: 'me', timestamp: 1960 },
]

// Case 2: Speaker says words from slide 2 while slide 1 is still current (should not change)
export const ag_case2_slide2_partial: SpeechEvent[] = [
  { word: 'I', timestamp: 0 },
  { word: 'once', timestamp: 220 },
  { word: 'was', timestamp: 420 },
  { word: 'lost', timestamp: 620 },
]

// Case 3: Words for entire slide 2 (advance to slide 3)
export const ag_case3_slide2_full: SpeechEvent[] = [
  { word: 'I', timestamp: 0 },
  { word: 'once', timestamp: 220 },
  { word: 'was', timestamp: 420 },
  { word: 'lost', timestamp: 620 },
  { word: 'but', timestamp: 840 },
  { word: 'now', timestamp: 1040 },
  { word: 'am', timestamp: 1200 },
  { word: 'found', timestamp: 1380 },
  { word: 'Was', timestamp: 1600 },
  { word: 'blind', timestamp: 1800 },
  { word: 'but', timestamp: 1980 },
  { word: 'now', timestamp: 2140 },
  { word: 'I', timestamp: 2280 },
  { word: 'see', timestamp: 2440 },
]

// Case 4: After finishing slide 2, speaker starts slide 4; switch from slide 3 -> 4 within 500ms of 2nd word of slide 4
export const ag_case4_slide4_start: SpeechEvent[] = [
  { word: 'How', timestamp: 0 },
  { word: 'precious', timestamp: 260 },
  { word: 'did', timestamp: 480 },
  { word: 'that', timestamp: 660 },
  { word: 'grace', timestamp: 820 },
]

