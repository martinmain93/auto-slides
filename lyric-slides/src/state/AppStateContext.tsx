import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { AppState } from '../types'
import { demoLibrary } from '../types'

export type AppActions = {
  addToQueue: (songId: string) => void
  addRecent: (songId: string) => void
  selectSong: (songId: string) => void
  removeFromQueue: (songId: string) => void
  nextSlide: () => void
  prevSlide: () => void
  moveNextSong: () => void
}

type Ctx = { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> } & AppActions

const AppStateContext = createContext<Ctx | null>(null)

const STORAGE_KEY = 'lyric-slides:app-state'

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AppState
        if (Array.isArray(parsed.library) && Array.isArray(parsed.queue)) return parsed
      } catch {}
    }
    return {
      library: demoLibrary,
      recents: [],
      queue: [],
      currentSlideIndex: 0,
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const actions = useMemo<AppActions>(
    () => ({
      addToQueue: (songId: string) =>
        setState((s) => {
          if (s.queue.includes(songId)) {
            return { ...s, currentSongId: s.currentSongId ?? songId }
          }
          return { ...s, queue: [...s.queue, songId], currentSongId: s.currentSongId ?? songId }
        }),
      addRecent: (songId: string) =>
        setState((s) => ({ ...s, recents: [songId, ...s.recents.filter((id) => id !== songId)].slice(0, 12) })),
      selectSong: (songId: string) => setState((s) => ({ ...s, currentSongId: songId, currentSlideIndex: 0 })),
      removeFromQueue: (songId: string) =>
        setState((s) => ({
          ...s,
          queue: s.queue.filter((id) => id !== songId),
          currentSongId: s.currentSongId === songId ? undefined : s.currentSongId,
        })),
      nextSlide: () =>
        setState((s) => {
          const song = s.library.find((x) => x.id === s.currentSongId)
          if (!song) return s
          const next = Math.min(s.currentSlideIndex + 1, song.slides.length - 1)
          return { ...s, currentSlideIndex: next }
        }),
      prevSlide: () => setState((s) => ({ ...s, currentSlideIndex: Math.max(0, s.currentSlideIndex - 1) })),
      moveNextSong: () =>
        setState((s) => {
          if (!s.currentSongId) return s
          const idx = s.queue.indexOf(s.currentSongId)
          const nextSongId = s.queue[idx + 1]
          if (!nextSongId) return s
          return { ...s, currentSongId: nextSongId, currentSlideIndex: 0 }
        }),
    }),
    [],
  )

  const value: Ctx = { state, setState, ...actions }
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

