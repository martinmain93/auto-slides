import { supabase, isSupabaseConfigured } from './supabase'
import type { Song, AppState } from '../types'

type UserLibraryRow = {
  id: string
  song_data: Song
}

type UserSetlistRow = {
  id: string
  queue: string[]
  recents: string[]
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

/**
 * Load complete user state from Supabase
 */
export async function loadUserState(userId: string): Promise<Partial<AppState>> {
  const [library, setlist] = await Promise.all([loadUserLibrary(userId), loadUserSetlist(userId)])

  // Filter out song IDs that don't exist in the library (orphaned references)
  const libraryIds = new Set(library.map(s => s.id))
  const validQueue = setlist.queue.filter(id => libraryIds.has(id))
  const validRecents = setlist.recents.filter(id => libraryIds.has(id))

  return {
    library,
    queue: validQueue,
    recents: validRecents,
  }
}

