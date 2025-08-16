import { useMemo } from 'react'
import type { Song } from '../types'
import type { PhoneticDecision } from '../lib/decidePhonetic'

// Minimal skeleton matcher: computes transcript window and emits no navigation decision.
export function usePhoneticSlideMatch(params: {
  currentSong: Song | undefined
  library: Song[]
  queue: string[]
  finals: string[]
  partial: string
  slideIndex: number
}): { transcriptWindow: string; decision: PhoneticDecision } {
  const { finals, partial } = params
  const transcriptWindow = useMemo(() => [...finals.slice(-2), partial].join(' ').trim(), [finals, partial])

  var decision: PhoneticDecision = { action: 'none', best: null, transcriptWindow }

  console.log("finals", finals)
  console.log("partial", partial)
  if (finals.includes('banana')) {
    console.log("BANANA DETECTED")
    decision = {
      action: 'blank',
      blankPos: 'end',
      best: null,
      transcriptWindow
    }
  }
  console.log("Decision made:", decision)

  return { transcriptWindow, decision }
}

