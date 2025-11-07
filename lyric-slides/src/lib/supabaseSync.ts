import { supabase, isSupabaseConfigured } from './supabase'
import type { Song, AppState, Setlist } from '../types'

type UserLibraryRow = {
  id: string
  song_data: Song
}

type UserSetlistRow = {
  id: string
  queue: string[]
  recents: string[]
}

type SharedSetlistRow = {
  id: string
  label: string
  song_ids: string[]
  songs: Song[]
  created_at: string
}

export type SharedSetlistPayload = {
  label: string
  songIds: string[]
  songs: Song[]
}

/**
 * Load user's library from Supabase
 */
export async function loadUserLibrary(userId: string): Promise<Song[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const { data, error } = await supabase
    .from('user_libraries')
    .select('song_data')
    .eq('user_id', userId)

  if (error) {
    console.error('Error loading library:', error)
    return []
  }

  return (data as UserLibraryRow[]).map((row) => row.song_data)
}

/**
 * Save a song to user's library
 */
export async function saveSongToLibrary(userId: string, song: Song): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }

  // Check if song already exists for this user
  const { data: existing } = await supabase
    .from('user_libraries')
    .select('id')
    .eq('user_id', userId)
    .eq('song_data->>id', song.id)
    .single()

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from('user_libraries')
      .update({ song_data: song })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating song:', error)
      throw error
    }
  } else {
    // Insert new record
    const { error } = await supabase.from('user_libraries').insert({
      user_id: userId,
      song_data: song,
    })

    if (error) {
      console.error('Error inserting song:', error)
      throw error
    }
  }
}

/**
 * Delete a song from user's library
 */
export async function deleteSongFromLibrary(userId: string, songId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }

  const { error } = await supabase
    .from('user_libraries')
    .delete()
    .eq('user_id', userId)
    .eq('song_data->>id', songId)

  if (error) {
    console.error('Error deleting song:', error)
    throw error
  }
}

/**
 * Load user's setlist (queue and recents) from Supabase
 */
export async function loadUserSetlist(userId: string): Promise<{ queue: string[]; recents: string[] }> {
  if (!isSupabaseConfigured) {
    return { queue: [], recents: [] }
  }

  const { data, error } = await supabase.from('user_setlists').select('queue, recents').eq('user_id', userId).single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No setlist exists yet, return defaults
      return { queue: [], recents: [] }
    }
    console.error('Error loading setlist:', error)
    return { queue: [], recents: [] }
  }

  return {
    queue: (data as UserSetlistRow).queue || [],
    recents: (data as UserSetlistRow).recents || [],
  }
}

/**
 * Save user's setlist (queue and recents) to Supabase
 */
export async function saveUserSetlist(userId: string, queue: string[], recents: string[]): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }

  const { error } = await supabase.from('user_setlists').upsert(
    {
      user_id: userId,
      queue,
      recents,
    },
    {
      onConflict: 'user_id',
    }
  )

  if (error) {
    console.error('Error saving setlist:', error)
    throw error
  }
}

function generateShareCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

export async function createSharedSetlist(userId: string, setlist: Setlist, songs: Song[]): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Sharing is unavailable without Supabase configuration.')
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateShareCode()
    const { error } = await supabase.from('shared_setlists').insert({
      id: code,
      label: setlist.label,
      song_ids: setlist.songIds,
      songs,
      created_by: userId,
    })

    if (!error) {
      return code
    }

    if (error.code !== '23505') {
      console.error('Error creating shared setlist:', error)
      throw error
    }
  }

  throw new Error('Unable to generate a share link. Please try again.')
}

export async function fetchSharedSetlist(code: string): Promise<SharedSetlistPayload | null> {
  if (!isSupabaseConfigured) {
    return null
  }

  const shareCode = code.trim().toUpperCase()
  if (!shareCode) return null

  const { data, error } = await supabase
    .from('shared_setlists')
    .select('id, label, song_ids, songs, created_at')
    .eq('id', shareCode)
    .maybeSingle<SharedSetlistRow>()

  if (error) {
    console.error('Error fetching shared setlist:', error)
    return null
  }

  if (!data) return null

  return {
    label: data.label,
    songIds: data.song_ids || [],
    songs: data.songs || [],
  }
}

/**
 * Load saved setlists from Supabase
 */
export async function loadSavedSetlists(userId: string): Promise<Setlist[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const { data, error } = await supabase
    .from('saved_setlists')
    .select('id, label, song_ids, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading saved setlists:', error)
    return []
  }

  return (data || []).map((row) => ({
    id: row.id,
    label: row.label,
    songIds: row.song_ids || [],
    createdAt: row.created_at,
  }))
}

/**
 * Save a setlist to Supabase
 */
export async function saveSetlist(userId: string, setlist: Setlist): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }

  const { error } = await supabase.from('saved_setlists').upsert(
    {
      id: setlist.id,
      user_id: userId,
      label: setlist.label,
      song_ids: setlist.songIds,
      created_at: setlist.createdAt,
    },
    {
      onConflict: 'id',
    }
  )

  if (error) {
    console.error('Error saving setlist:', error)
    throw error
  }
}

/**
 * Delete a setlist from Supabase
 */
export async function deleteSetlist(userId: string, setlistId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }

  const { error } = await supabase
    .from('saved_setlists')
    .delete()
    .eq('user_id', userId)
    .eq('id', setlistId)

  if (error) {
    console.error('Error deleting setlist:', error)
    throw error
  }
}

/**
 * Load complete user state from Supabase
 */
export async function loadUserState(userId: string): Promise<Partial<AppState>> {
  const [library, setlist, savedSetlists] = await Promise.all([
    loadUserLibrary(userId),
    loadUserSetlist(userId),
    loadSavedSetlists(userId),
  ])

  // Filter out song IDs that don't exist in the library (orphaned references)
  const libraryIds = new Set(library.map(s => s.id))
  const validQueue = setlist.queue.filter(id => libraryIds.has(id))
  const validRecents = setlist.recents.filter(id => libraryIds.has(id))
  const validSetlists = savedSetlists.map(setlist => ({
    ...setlist,
    songIds: setlist.songIds.filter(id => libraryIds.has(id)),
  }))

  return {
    library,
    queue: validQueue,
    recents: validRecents,
    setlists: validSetlists,
  }
}

