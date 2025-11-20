export type SongSection = 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'intro' | 'outro' | 'tag' | 'instrumental' | 'other'

export type Slide = {
  id: string
  text: string
  section?: SongSection
}

export type Song = {
  id: string
  title: string
  slides: Slide[]
  credits?: string
}

export type PlanItem = {
  songId: string
}

export type Setlist = {
  id: string
  label: string
  songIds: string[] // song ids in order
  createdAt: string // ISO date string
}

export type AppState = {
  library: Song[]
  recents: string[] // song ids
  queue: string[] // song ids in order
  setlists: Setlist[] // saved setlists
  currentSetlistId?: string // ID of the setlist that the current queue represents
  currentSongId?: string
  currentSlideIndex: number
  usePhonemeDict: boolean
  phonemeSource: 'local' | 'remote'
  phonemeStatus: 'idle' | 'loading' | 'ready' | 'error'
}

export const demoLibrary: Song[] = [
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    slides: [
      { id: 'ag-1', text: 'Amazing grace! how sweet the sound\nThat saved a wretch like me!' },
      { id: 'ag-2', text: 'I once was lost, but now am found;\nWas blind, but now I see.' },
    ],
  },
  {
    id: 'how-great-thou-art',
    title: 'How Great Thou Art',
    slides: [
      { id: 'hgta-1', text: 'O Lord my God, when I in awesome wonder\nConsider all the worlds Thy Hands have made' },
      { id: 'hgta-2', text: 'Then sings my soul, my Savior God, to Thee\nHow great Thou art, how great Thou art' },
    ],
  },
  {
    id: 'blessed-assurance',
    title: 'Blessed Assurance',
    slides: [
      { id: 'ba-1', text: 'Blessed assurance, Jesus is mine!\nOh, what a foretaste of glory divine!' },
      { id: 'ba-2', text: 'Heir of salvation, purchase of God,\nBorn of His Spirit, washed in His blood.' },
    ],
  },
]

