import { useMemo } from 'react'
import type { Song } from '../types'
// Deprecated: semantic/keyword matcher replaced by phonetic matcher. This stub remains to satisfy legacy imports.

export type UseWeightedMatchOpts = {
  windowFinals?: number
  k?: number
  autoAdvanceThreshold?: number
  acceptThreshold?: number
}

export function useWeightedSlideMatch(
  song: Song | undefined,
  finals: string[],
  partial: string,
  slideIndex: number,
  opts: UseWeightedMatchOpts = {}
) {
  const WINDOW_FINALS = opts.windowFinals ?? 2
  const transcriptWindow = useMemo(
    () => [...finals.slice(-WINDOW_FINALS), partial].join(' ').trim(),
    [finals, partial, WINDOW_FINALS]
  )

  // Always return no decision; prefer usePhoneticSlideMatch instead.
  const best = null
  const decision = { best, action: 'none' as const }
  return { transcriptWindow, best, decision }
}

