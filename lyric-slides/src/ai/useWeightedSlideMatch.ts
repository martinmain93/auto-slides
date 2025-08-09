import { useEffect, useMemo, useState } from 'react'
import type { Song } from '../types'
import { matchSong } from '../lib/matcher'
import { matchSongSemanticCandidates } from '../lib/semanticMatcher'

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
  const k = opts.k ?? 5
  const autoAdvanceThreshold = opts.autoAdvanceThreshold ?? 0.55
  const acceptThreshold = opts.acceptThreshold ?? 0.4

  const transcriptWindow = useMemo(
    () => [...finals.slice(-WINDOW_FINALS), partial].join(' ').trim(),
    [finals, partial, WINDOW_FINALS]
  )

  const [best, setBest] = useState<{ slideId: string; score: number } | null>(null)

  useEffect(() => {
    let abort = false
    if (!song || !transcriptWindow) {
      setBest(null)
      return
    }

    const t = setTimeout(() => {
      void (async () => {
        try {
          const candidates = await matchSongSemanticCandidates(song, transcriptWindow, { k }).catch(() => [])
          const kw = matchSong(song, transcriptWindow, { minScore: 0.12 })
          if (kw) candidates.push(kw)
          if (abort || candidates.length === 0) return

          const nextIdx = Math.min(song.slides.length - 1, slideIndex + 1)
          const nextId = song.slides[nextIdx]?.id
          const inSongIds = new Set(song.slides.map((s) => s.id))

          const weightFor = (id: string): number => {
            if (id === nextId) return 1.25
            if (inSongIds.has(id)) return 1.0
            return 0.8
          }

          let chosen = { slideId: candidates[0].slideId, score: 0 }
          for (const c of candidates) {
            const weighted = c.score * weightFor(c.slideId)
            if (weighted > chosen.score) chosen = { slideId: c.slideId, score: weighted }
          }
          if (!abort) setBest(chosen)
        } catch {
          if (!abort) setBest(null)
        }
      })()
    }, 600)

    return () => { abort = true; clearTimeout(t) }
  }, [song, transcriptWindow, slideIndex, k])

  // Provide decisions to caller
  const decision = useMemo(() => {
    if (!song || !best) return { best, action: 'none' as const }
    const nextIdx = Math.min(song.slides.length - 1, slideIndex + 1)
    const nextId = song.slides[nextIdx]?.id
    const bestIdx = song.slides.findIndex((s) => s.id === best.slideId)
    if (bestIdx < 0) return { best, action: 'none' as const }
    const isNext = best.slideId === nextId
    if (isNext && best.score >= autoAdvanceThreshold && bestIdx !== slideIndex) {
      return { best, action: 'advance' as const, targetIndex: bestIdx }
    }
    if (best.score >= acceptThreshold && bestIdx !== slideIndex) {
      return { best, action: 'update' as const, targetIndex: bestIdx }
    }
    return { best, action: 'none' as const }
  }, [song, best, slideIndex, autoAdvanceThreshold, acceptThreshold])

  return { transcriptWindow, best, decision }
}

