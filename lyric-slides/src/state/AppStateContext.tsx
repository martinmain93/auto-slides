/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react'
import type { AppState } from '../types'
import { demoLibrary } from '../types'
import { setPhonemeDictionary } from '../lib/phonemeDict'
import { loadCmudictFromUrl } from '../lib/phonemeLoader'
import { useAuth } from './AuthContext'
import { loadUserState, saveSongToLibrary, saveUserSetlist, saveSetlist, deleteSetlist, type SharedSetlistPayload } from '../lib/supabaseSync'
import type { Setlist, Song } from '../types'

export type AppActions = {
  addToQueue: (songId: string) => void
  addRecent: (songId: string) => void
  selectSong: (songId: string) => void
  removeFromQueue: (songId: string) => void
  clearQueue: () => void
  upsertSong: (song: import('../types').Song) => void
  enqueue: (songId: string) => void
  nextSlide: () => void
  prevSlide: () => void
  moveNextSong: () => void
  setUsePhonemeDict: (enabled: boolean) => void
  setPhonemeSource: (src: 'local' | 'remote') => void
  createSetlist: (label: string) => void
  loadSetlist: (setlistId: string) => void
  deleteSetlist: (setlistId: string) => void
  importSharedSetlist: (payload: SharedSetlistPayload) => Promise<void>
  renameCurrentSet: (newLabel: string) => void
  saveCurrentSet: (label?: string) => void
  deleteCurrentSet: () => void
}

type Ctx = { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> } & AppActions

const AppStateContext = createContext<Ctx | null>(null)

const STORAGE_KEY = 'lyric-slides:app-state'

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback UUIDv4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function normalizeSetlists(setlists: Setlist[] | undefined | null): Setlist[] {
  if (!Array.isArray(setlists)) return []
  return setlists.map((sl) => {
    const hasUuid = typeof sl.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sl.id)
    return {
      ...sl,
      id: hasUuid ? sl.id : generateUuid(),
    }
  })
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState<AppState>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AppState
        if (Array.isArray(parsed.library) && Array.isArray(parsed.queue)) {
          const setlists = normalizeSetlists(parsed.setlists)
          return {
            ...parsed,
            setlists,
          }
        }
      } catch {
        // Ignore invalid persisted state
      }
    }
    return {
      library: demoLibrary,
      recents: [],
      queue: [],
      setlists: [],
      currentSetlistId: undefined,
      currentSlideIndex: 0,
      usePhonemeDict: true,
      phonemeSource: 'remote',
      phonemeStatus: 'idle',
    }
  })
  const [isLoadingFromCloud, setIsLoadingFromCloud] = useState(false)
  const syncTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Load user data from Supabase when user logs in
  useEffect(() => {
    if (authLoading) return

    async function loadUserData() {
      if (!user?.id) {
        // Not logged in, use localStorage
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as AppState
            if (Array.isArray(parsed.library) && Array.isArray(parsed.queue)) {
              setState(() => ({
                ...parsed,
                setlists: normalizeSetlists(parsed.setlists),
              }))
            }
          } catch {
            // Ignore invalid persisted state
          }
        }
        return
      }

      // User is logged in, load from Supabase
      setIsLoadingFromCloud(true)
      try {
        const cloudState = await loadUserState(user.id)
        setState((prev) => ({
          ...prev,
          library: cloudState.library || prev.library,
          queue: cloudState.queue || prev.queue,
          recents: cloudState.recents || prev.recents,
          setlists: cloudState.setlists ? normalizeSetlists(cloudState.setlists) : prev.setlists,
        }))
      } catch (error) {
        console.error('Failed to load user data from cloud:', error)
        // Fall back to localStorage
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as AppState
            if (Array.isArray(parsed.library) && Array.isArray(parsed.queue)) {
              setState(() => ({
                ...parsed,
                setlists: normalizeSetlists(parsed.setlists),
              }))
            }
          } catch {
            // Ignore invalid persisted state
          }
        }
      } finally {
        setIsLoadingFromCloud(false)
      }
    }

    void loadUserData()
  }, [user?.id, authLoading])

  // Sync state to storage (localStorage or Supabase)
  useEffect(() => {
    if (authLoading || isLoadingFromCloud) return

    // Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    // Always save to localStorage as backup
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))

    // If logged in, sync to Supabase (debounced)
    if (user?.id) {
      syncTimeoutRef.current = setTimeout(async () => {
        try {
          // Sync setlist (queue and recents)
          await saveUserSetlist(user.id, state.queue, state.recents)
        } catch (error) {
          console.error('Failed to sync setlist to cloud:', error)
        }
      }, 1000) // Debounce by 1 second
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [state.queue, state.recents, user?.id, authLoading, isLoadingFromCloud])

  // Load/clear phoneme dictionary whenever the toggle changes.
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!state.usePhonemeDict) {
        setPhonemeDictionary({})
        setState(s => ({ ...s, phonemeStatus: 'idle' }))
        return
      }
      setState(s => ({ ...s, phonemeStatus: 'loading' }))
      try {
        if (state.phonemeSource === 'remote') {
          await loadCmudictFromUrl()
        } else {
          // local JSON subset for tests/dev
          const res = await fetch('/phonemes.json', { cache: 'no-store' })
          if (!res.ok) throw new Error(`Failed local dict: ${res.status}`)
          const obj: unknown = await res.json()
          if (obj && typeof obj === 'object') {
            const map: Record<string, unknown> = obj as Record<string, unknown>
            const valid = Object.entries(map).every(([k, v]) => typeof k === 'string' && (typeof v === 'string' || (Array.isArray(v) && v.every((p) => typeof p === 'string'))))
            if (valid) setPhonemeDictionary(obj as Record<string, string | string[]>)
            else throw new Error('Invalid local phoneme map shape')
          } else {
            throw new Error('Local phoneme JSON is not an object')
          }
        }
        if (!cancelled) setState(s => ({ ...s, phonemeStatus: 'ready' }))
      } catch (e) {
        console.warn('Phoneme load failed', e)
        if (!cancelled) setState(s => ({ ...s, phonemeStatus: 'error' }))
      }
    }
    void load()
    return () => { cancelled = true }
  }, [state.usePhonemeDict, state.phonemeSource])

  const actions = useMemo<AppActions>(
    () => ({
      addToQueue: (songId: string) =>
        setState((s) => {
          if (s.queue.includes(songId)) {
            return { ...s, currentSongId: s.currentSongId ?? songId }
          }
          // Clear currentSetlistId when queue is modified
          return { ...s, queue: [...s.queue, songId], currentSongId: s.currentSongId ?? songId, currentSetlistId: undefined }
        }),
      addRecent: (songId: string) =>
        setState((s) => ({ ...s, recents: [songId, ...s.recents.filter((id) => id !== songId)].slice(0, 12) })),
      selectSong: (songId: string) => setState((s) => ({ ...s, currentSongId: songId, currentSlideIndex: 0 })),
      removeFromQueue: (songId: string) =>
        setState((s) => {
          const newQueue = s.queue.filter((id) => id !== songId)
          // Clear currentSetlistId when queue is modified
          return {
          ...s,
            queue: newQueue,
          currentSongId: s.currentSongId === songId ? undefined : s.currentSongId,
            currentSetlistId: undefined,
          }
        }),
      clearQueue: () =>
        setState((s) => ({ ...s, queue: [], currentSongId: undefined, currentSlideIndex: 0, currentSetlistId: undefined })),
      upsertSong: (song) => {
        setState((s) => {
          const idx = s.library.findIndex((x) => x.id === song.id)
          const library = idx >= 0 ? [...s.library.slice(0, idx), song, ...s.library.slice(idx + 1)] : [song, ...s.library]
          return { ...s, library }
        })
        // Sync song to Supabase if logged in
        if (user?.id) {
          saveSongToLibrary(user.id, song).catch((error) => {
            console.error('Failed to save song to cloud:', error)
          })
        }
      },
      enqueue: (songId: string) =>
        setState((s) => (s.queue.includes(songId) ? s : { ...s, queue: [...s.queue, songId] })),
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
      setUsePhonemeDict: (enabled: boolean) =>
        setState((s) => ({ ...s, usePhonemeDict: enabled })),
      setPhonemeSource: (src: 'local' | 'remote') =>
        setState((s) => ({ ...s, phonemeSource: src })),
      createSetlist: (label: string) => {
        if (!state.queue.length) {
          alert('Queue is empty. Add some songs to create a setlist.')
          return
        }
        const newSetlist: Setlist = {
          id: generateUuid(),
          label,
          songIds: [...state.queue],
          createdAt: new Date().toISOString(),
        }
        setState((s) => ({
          ...s,
          setlists: [newSetlist, ...s.setlists],
          currentSetlistId: newSetlist.id,
        }))
        // Save to Supabase if logged in
        if (user?.id) {
          saveSetlist(user.id, newSetlist).catch((error) => {
            console.error('Failed to save setlist to cloud:', error)
          })
        }
      },
      loadSetlist: (setlistId: string) => {
        const setlist = state.setlists.find((s) => s.id === setlistId)
        if (!setlist) return
        setState((s) => ({
          ...s,
          queue: [...setlist.songIds],
          currentSongId: setlist.songIds[0],
          currentSlideIndex: 0,
          currentSetlistId: setlistId,
        }))
      },
      deleteSetlist: (setlistId: string) => {
        setState((s) => ({
          ...s,
          setlists: s.setlists.filter((sl) => sl.id !== setlistId),
        }))
        // Delete from Supabase if logged in
        if (user?.id) {
          deleteSetlist(user.id, setlistId).catch((error) => {
            console.error('Failed to delete setlist from cloud:', error)
          })
        }
      },
      importSharedSetlist: async ({ label, songIds, songs }: SharedSetlistPayload) => {
        if (!songs || songs.length === 0) return

        let newSetlist: Setlist | null = null
        let insertedSongs: Song[] = []
        setState((s) => {
          const existingIds = new Set(s.library.map((song) => song.id))
          // Map of title -> song for deduplication
          const titleToSong = new Map<string, Song>()
          s.library.forEach((song) => {
            const key = song.title.toLowerCase().trim()
            if (!titleToSong.has(key)) {
              titleToSong.set(key, song)
            }
          })

          const idMap = new Map<string, string>()
          const updatedLibrary = [...s.library]

          songs.forEach((originalSong) => {
            const titleKey = originalSong.title.toLowerCase().trim()
            const existingSong = titleToSong.get(titleKey)

            // If a song with the same title exists, reuse it
            if (existingSong) {
              idMap.set(originalSong.id, existingSong.id)
              return // Skip adding duplicate
            }

            // Otherwise, create new song with deduplicated ID
            let newId = originalSong.id
            while (existingIds.has(newId) || idMap.has(newId)) {
              newId = `${originalSong.id}-${Math.random().toString(36).slice(2, 6)}`
            }
            idMap.set(originalSong.id, newId)
            existingIds.add(newId)
            titleToSong.set(titleKey, { ...originalSong, id: newId } as Song)

            const slides = (originalSong.slides || []).map((slide, idx) => ({
              ...slide,
              id: `${newId}-slide-${idx + 1}`,
            }))

            const normalizedSong: Song = {
              ...originalSong,
              id: newId,
              slides,
            }

            insertedSongs.push(normalizedSong)
            updatedLibrary.push(normalizedSong)
          })

          const mappedIds = songIds
            .map((id) => idMap.get(id) || id)
            .filter((id) => updatedLibrary.some((song) => song.id === id))

          const createdSetlist: Setlist = {
            id: generateUuid(),
            label,
            songIds: mappedIds,
            createdAt: new Date().toISOString(),
          }

          newSetlist = createdSetlist

          return {
            ...s,
            library: updatedLibrary,
            setlists: mappedIds.length ? [createdSetlist, ...s.setlists] : s.setlists,
            queue: mappedIds,
            currentSongId: mappedIds[0],
            currentSlideIndex: 0,
            currentSetlistId: createdSetlist.id,
          }
        })

        const createdSetlistRef = newSetlist as Setlist | null

        if (user?.id && createdSetlistRef && createdSetlistRef.songIds.length > 0) {
          if (insertedSongs.length > 0) {
            await Promise.all(insertedSongs.map((song) => saveSongToLibrary(user.id, song)))
          }
          await saveSetlist(user.id, createdSetlistRef)
        }
      },
      renameCurrentSet: (newLabel: string) => {
        if (!state.currentSetlistId) return
        const setlist = state.setlists.find((s) => s.id === state.currentSetlistId)
        if (!setlist) return
        
        const updatedSetlist: Setlist = {
          ...setlist,
          label: newLabel,
        }
        setState((s) => ({
          ...s,
          setlists: s.setlists.map((sl) => (sl.id === state.currentSetlistId ? updatedSetlist : sl)),
        }))
        
        // Save to Supabase if logged in
        if (user?.id) {
          saveSetlist(user.id, updatedSetlist).catch((error) => {
            console.error('Failed to save renamed setlist to cloud:', error)
          })
        }
      },
      saveCurrentSet: (label?: string) => {
        if (!state.queue.length) {
          alert('Queue is empty. Add some songs to save.')
          return
        }
        
        if (state.currentSetlistId) {
          // Update existing setlist
          const setlist = state.setlists.find((s) => s.id === state.currentSetlistId)
          if (setlist) {
            const updatedSetlist: Setlist = {
              ...setlist,
              songIds: [...state.queue],
            }
            setState((s) => ({
              ...s,
              setlists: s.setlists.map((sl) => (sl.id === state.currentSetlistId ? updatedSetlist : sl)),
            }))
            
            // Save to Supabase if logged in
            if (user?.id) {
              saveSetlist(user.id, updatedSetlist).catch((error) => {
                console.error('Failed to save setlist to cloud:', error)
              })
            }
            return
          }
        }
        
        // Create new setlist
        if (!label) {
          alert('Please provide a name for the setlist.')
          return
        }
        const newSetlist: Setlist = {
          id: generateUuid(),
          label,
          songIds: [...state.queue],
          createdAt: new Date().toISOString(),
        }
        setState((s) => ({
          ...s,
          setlists: [newSetlist, ...s.setlists],
          currentSetlistId: newSetlist.id,
        }))
        
        // Save to Supabase if logged in
        if (user?.id) {
          saveSetlist(user.id, newSetlist).catch((error) => {
            console.error('Failed to save setlist to cloud:', error)
          })
        }
      },
      deleteCurrentSet: () => {
        if (!state.currentSetlistId) return
        const setlist = state.setlists.find((s) => s.id === state.currentSetlistId)
        if (!setlist) return
        
        if (!confirm(`Delete "${setlist.label}"?`)) return
        
        setState((s) => ({
          ...s,
          setlists: s.setlists.filter((sl) => sl.id !== state.currentSetlistId),
          currentSetlistId: undefined,
        }))
        
        // Delete from Supabase if logged in
        if (user?.id) {
          deleteSetlist(user.id, state.currentSetlistId).catch((error) => {
            console.error('Failed to delete setlist from cloud:', error)
          })
        }
      },
    }),
    [user?.id, state.queue, state.setlists, state.library, state.currentSetlistId],
  )

  const value: Ctx = { state, setState, ...actions }
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

