import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Box, Button, Paper, Text, TextInput, ScrollArea, Group, Stack } from '@mantine/core'
import type { Song } from '../types'
import { useAppState } from '../state/AppStateContext'
import { searchSongs, highlightText, getMatchContext, type SearchResult } from './searchUtils'

export function DualScreenSearch(props: {
  library: Song[]
  queue: string[]
  currentSongId: string
  slideIndex: number
  blankPos: null | 'start' | 'end'
  setBlankPos: (p: null | 'start' | 'end') => void
  goSong: (id: string) => void
  onSelectSlide: (index: number) => void
  children: React.ReactNode
}) {
  const { library, queue, setBlankPos, goSong, onSelectSlide } = props
  const { enqueue } = useAppState()
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 300)
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchInput])

  // Search logic
  const searchResults = useMemo<SearchResult[]>(() => {
    return searchSongs(library, searchQuery)
  }, [searchQuery, library])

  return (
    <>
      {/* Search bar */}
      <Box style={{ marginBottom: 16 }}>
        <TextInput
          placeholder="Search songs and lyrics..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.currentTarget.value)}
          style={{ backgroundColor: '#1a1a1a', color: 'white' }}
          styles={{
            input: { 
              backgroundColor: '#1a1a1a', 
              color: 'white',
              border: '1px solid #444'
            }
          }}
        />
      </Box>

      {/* Search results or Set List */}
      {searchQuery.trim() ? (
        <Box style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Text size="lg" fw={700} mb="md">Search Results</Text>
          <ScrollArea style={{ flex: 1 }}>
            <Stack gap="md">
              {searchResults.map((result) => {
                const isInQueue = queue.includes(result.song.id)
                return (
                  <Paper
                    key={result.song.id}
                    p="md"
                    withBorder
                    style={{
                      background: '#1a1a1a',
                      border: '1px solid #333',
                    }}
                  >
                    <Group align="flex-start" justify="space-between" gap="md">
                      <Box style={{ flex: 1 }}>
                        <Text size="md" fw={700} mb="xs" style={{ color: 'white' }}>
                          {highlightText(result.song.title, searchQuery)}
                        </Text>
                        <Text size="sm" style={{ color: '#ccc', marginTop: 4, lineHeight: 1.4 }}>
                          {highlightText(getMatchContext(result.matchingSlide.text, searchQuery), searchQuery)}
                        </Text>
                      </Box>
                      <Stack gap="xs" style={{ flexShrink: 0 }}>
                        {isInQueue ? (
                          <Button
                            size="sm"
                            variant="light"
                            onClick={() => {
                              setBlankPos(null)
                              goSong(result.song.id)
                              onSelectSlide(result.slideIndex)
                              setSearchInput('')
                              setSearchQuery('')
                            }}
                          >
                            Navigate to slide
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="light"
                              onClick={() => {
                                enqueue(result.song.id)
                                setSearchInput('')
                                setSearchQuery('')
                              }}
                            >
                              Add song
                            </Button>
                            <Button
                              size="sm"
                              variant="filled"
                              onClick={() => {
                                enqueue(result.song.id)
                                setBlankPos(null)
                                goSong(result.song.id)
                                onSelectSlide(result.slideIndex)
                                setSearchInput('')
                                setSearchQuery('')
                              }}
                            >
                              Add song and navigate to slide
                            </Button>
                          </>
                        )}
                      </Stack>
                    </Group>
                  </Paper>
                )
              })}
              {searchResults.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No results found
                </Text>
              )}
            </Stack>
          </ScrollArea>
        </Box>
      ) : (
        props.children
      )}
    </>
  )
}

