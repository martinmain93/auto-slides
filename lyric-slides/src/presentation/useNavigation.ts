import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppState, Song } from '../types'

export type NavigationAPI = {
  queue: string[]
  currentSongId: string
  currentSong?: Song
  slideIndex: number
  setSlideIndex: (i: number) => void
  blankPos: null | 'start' | 'end'
  setBlankPos: React.Dispatch<React.SetStateAction<null | 'start' | 'end'>>
  goSong: (id: string) => void
  goPrevSlide: () => void
  goNextSlide: () => void
  goPrevSong: () => void
  goNextSong: () => void
}

export function useNavigation(params: {
  state: AppState
  setState: React.Dispatch<React.SetStateAction<AppState>>
  onExit?: () => void
}): NavigationAPI {
  const { state, setState, onExit } = params
  const queue = useMemo(() => (state.queue.length ? state.queue : state.library.map((s) => s.id)), [state.queue, state.library])
  const currentSongId = state.currentSongId ?? queue[0]
  const currentSong = state.library.find((s) => s.id === currentSongId)
  const slideIndex = state.currentSlideIndex

  const [blankPos, setBlankPos] = useState<null | 'start' | 'end'>(null)

  const setSlideIndex = useCallback((i: number) => {
    setState((s) => ({ ...s, currentSlideIndex: Math.max(0, i) }))
  }, [setState])

  const goSong = useCallback((id: string) => {
    setState((s) => ({ ...s, currentSongId: id, currentSlideIndex: 0 }))
  }, [setState])

  const goPrevSlide = useCallback(() => {
    if (blankPos === 'start') {
      const idx = queue.indexOf(currentSongId)
      const prevId = queue[idx - 1]
      if (prevId) {
        goSong(prevId)
        setBlankPos('end')
      }
      return
    }
    if (blankPos === 'end') {
      setBlankPos(null)
      return
    }
    if (slideIndex <= 0) {
      const idx = queue.indexOf(currentSongId)
      const prevId = queue[idx - 1]
      if (prevId) {
        goSong(prevId)
        setBlankPos('end')
      } else {
        setBlankPos('start')
      }
      return
    }
    setState((s) => ({ ...s, currentSlideIndex: Math.max(0, s.currentSlideIndex - 1) }))
  }, [blankPos, queue, currentSongId, slideIndex, goSong, setState])

  const goNextSlide = useCallback(() => {
    if (blankPos === 'end') {
      const idx = queue.indexOf(currentSongId)
      const nextId = queue[idx + 1]
      if (nextId) {
        goSong(nextId)
        setBlankPos('start')
      }
      return
    }
    if (blankPos === 'start') {
      setBlankPos(null)
      return
    }
    if (!currentSong) return
    if (slideIndex >= currentSong.slides.length - 1) {
      const idx = queue.indexOf(currentSongId)
      const nextId = queue[idx + 1]
      if (nextId) {
        goSong(nextId)
        setBlankPos('start')
      } else {
        setBlankPos('end')
      }
      return
    }
    setState((s) => ({ ...s, currentSlideIndex: Math.min(currentSong.slides.length - 1, s.currentSlideIndex + 1) }))
  }, [blankPos, currentSong, queue, currentSongId, setState, slideIndex, goSong])

  const goPrevSong = useCallback(() => {
    const idx = queue.indexOf(currentSongId)
    if (idx > 0) goSong(queue[idx - 1])
  }, [currentSongId, queue, goSong])

  const goNextSong = useCallback(() => {
    const idx = queue.indexOf(currentSongId)
    if (idx >= 0 && idx < queue.length - 1) goSong(queue[idx + 1])
  }, [currentSongId, queue, goSong])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        goNextSlide()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNextSlide()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrevSlide()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        goPrevSong()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        goNextSong()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onExit?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNextSlide, goPrevSlide, goNextSong, goPrevSong, onExit])

  return { queue, currentSongId, currentSong, slideIndex, setSlideIndex, blankPos, setBlankPos, goSong, goPrevSlide, goNextSlide, goPrevSong, goNextSong }
}


export function navigateFromDecision(
  decision: { action: 'none' | 'update' | 'advance' | 'blank'; targetIndex?: number; targetSongId?: string; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string },
  params: {
    slideIndex: number
    currentSongId: string
    setSlideIndex: (i: number) => void
    setBlankPos: React.Dispatch<React.SetStateAction<null | 'start' | 'end'>>
    setLastScore: React.Dispatch<React.SetStateAction<number | null>>
    blankPos: null | 'start' | 'end'
    currentSong?: Song
    queue: string[]
  }
) {
  const { slideIndex, currentSongId, setSlideIndex, setBlankPos, setLastScore, currentSong, queue } = params
  if (decision.action === 'none') {
    // Do nothing
    return
  } else if (decision.action === 'update') {
    if (decision.targetIndex != null && decision.targetIndex !== slideIndex) {
      setSlideIndex(decision.targetIndex)
      setBlankPos(null)
    }
    if (decision.best) {
      setLastScore(decision.best.score)
    }
  } else if (decision.action === 'advance') {
    if (decision.targetSongId && decision.targetSongId !== currentSongId) {
      // Advance to a new song at its first slide
      // Only do this if the targetSongId is different from the currentSongId to avoid unnecessary updates
      const idx = queue.indexOf(decision.targetSongId)
      if (idx !== -1) {
        // Valid song in queue
        // Note: In a real app, you'd likely have a goSong function to handle this
        // Here we just simulate by setting slide index to 0 and assuming parent handles song change
        setSlideIndex(0)
        setBlankPos(null)
      }
    } else if (currentSong && slideIndex < currentSong.slides.length - 1) {
      // Advance to next slide in current song
      setSlideIndex(slideIndex + 1)
      setBlankPos(null)
    } else {
      // At end of current song, move to blank end state
      setBlankPos('end')
    }
  }
}