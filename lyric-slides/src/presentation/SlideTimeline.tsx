import { useEffect, useRef, useState } from 'react'
import { Box, Text, ScrollArea, Button, Textarea, Group } from '@mantine/core'
import { sectionToColor } from '../utils/sections'
import type { Song } from '../types'
import { getSongColor } from './songColors'

export function SlideTimeline(props: {
  queue: string[]
  library: Song[]
  currentSongId: string
  slideIndex: number
  blankPos: null | 'start' | 'end'
  setBlankPos: (p: null | 'start' | 'end') => void
  onSelectSlide: (index: number) => void
  goSong: (id: string) => void
  upsertSong: (song: Song) => void
}) {
  const { queue, library, currentSongId, slideIndex, blankPos, setBlankPos, onSelectSlide, goSong, upsertSong } = props
  
  const slideRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [editingSongId, setEditingSongId] = useState<string | null>(null)
  const [editedSlides, setEditedSlides] = useState<Record<string, string>>({})
  
  const currentSong = library.find(s => s.id === currentSongId)
  const hasSong = Boolean(currentSong)

  // Scroll to active slide when slideIndex or currentSongId changes
  useEffect(() => {
    if (!hasSong || blankPos) return
    
    // Use a small timeout to ensure refs are set after render
    const timeoutId = setTimeout(() => {
      const activeSlideRef = slideRefs.current.get(`${currentSongId}-${slideIndex}`)
      
      if (activeSlideRef) {
        activeSlideRef.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center'
        })
      }
    }, 50)
    
    return () => clearTimeout(timeoutId)
  }, [slideIndex, currentSongId, hasSong, blankPos])

  return (
    <Box style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 16, overflow: 'hidden' }}>
      <ScrollArea 
        style={{ width: '100%', height: '100%' }} 
        type="auto" 
        viewportRef={scrollContainerRef}
      >
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 16 }}>
 
          {/* All songs in queue */}
          {queue.map((songId, songIndex) => {
            const song = library.find(s => s.id === songId)
            if (!song) return null
            
            const isCurrentSong = songId === currentSongId
            const songBgColor = getSongColor(songIndex)
            
            return (
              <Box
                key={songId}
                style={{
                  background: songBgColor,
                  borderRadius: 12,
                  padding: 20,
                  position: 'relative',
                }}
              >
                {/* Song title */}
                <Box
                  style={{
                    marginBottom: 16,
                    paddingBottom: 12,
                    borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Text
                      style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: 'white',
                      }}
                    >
                      {song.title}
                    </Text>
                  </Box>
                  {editingSongId === songId ? (
                    <Group gap="xs">
                      <Button
                        size="xs"
                        color="green"
                        onClick={() => {
                          const updatedSlides = song.slides.map((sl) => ({
                            ...sl,
                            text: editedSlides[sl.id] ?? sl.text,
                          }))
                          upsertSong({
                            ...song,
                            slides: updatedSlides,
                          })
                          setEditingSongId(null)
                          setEditedSlides({})
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="xs"
                        color="gray"
                        variant="outline"
                        onClick={() => {
                          setEditingSongId(null)
                          setEditedSlides({})
                        }}
                      >
                        Cancel
                      </Button>
                    </Group>
                  ) : (
                    <Button
                      size="xs"
                      color="blue"
                      onClick={() => {
                        setEditingSongId(songId)
                        // Initialize edited slides with current text
                        const initial: Record<string, string> = {}
                        song.slides.forEach(sl => {
                          if (sl.id) {
                            initial[sl.id] = sl.text || ''
                          }
                        })
                        setEditedSlides(initial)
                      }}
                    >
                      Edit song
                    </Button>
                  )}
                </Box>

                {/* Slides grid - responsive with min 220px per slide for more slides per row */}
                <Box
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 16,
                    width: '100%',
                  }}
                >
                  {song.slides.map((sl, slideIdx) => {
                    const section = sl.section
                    const color = sectionToColor(section)
                    const active = isCurrentSong && slideIdx === slideIndex && !blankPos
                    const slideKey = `${songId}-${slideIdx}`
                    
                    // Skip if slide doesn't have an id
                    if (!sl.id) return null
                    
                    return (
                      <Box
                        key={sl.id}
                        ref={(el) => { slideRefs.current.set(slideKey, el) }}
                        style={{
                          background: 'black',
                          borderRadius: 8,
                          width: '100%',
                          aspectRatio: '3/2',
                          minHeight: 150,
                          display: 'grid',
                          placeItems: 'center',
                          cursor: editingSongId === songId ? 'text' : 'pointer',
                          border: active ? `4px solid #1E90FF` : `3px solid var(--mantine-color-${color}-4)`,
                          padding: 20,
                          overflow: 'hidden',
                          transition: 'all 300ms ease',
                          position: 'relative',
                          boxShadow: active ? '0 0 20px rgba(30, 144, 255, 0.5)' : 'none',
                        }}
                        className={active ? 'slide-selector-active' : ''}
                        onMouseEnter={(e) => {
                          if (!active && editingSongId !== songId) {
                            e.currentTarget.style.transform = 'scale(1.02)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active || editingSongId === songId) {
                            e.currentTarget.style.transform = 'scale(1)'
                          }
                        }}
                        onClick={() => {
                          if (editingSongId !== songId) {
                            if (isCurrentSong) {
                              setBlankPos(null)
                              onSelectSlide(slideIdx)
                            } else {
                              goSong(songId)
                              setBlankPos(null)
                              onSelectSlide(slideIdx)
                            }
                          }
                        }}
                      >
                        {editingSongId === songId ? (
                          <Textarea
                            value={editedSlides[sl.id] ?? (sl.text || '')}
                            onChange={(e) => {
                              try {
                                const newValue = e?.currentTarget?.value || ''
                                if (sl.id) {
                                  setEditedSlides(prev => ({
                                    ...prev,
                                    [sl.id]: newValue,
                                  }))
                                }
                              } catch (err) {
                                console.error('Error updating slide text:', err)
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            autosize
                            minRows={3}
                            styles={{
                              input: {
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '1rem',
                                textAlign: 'center',
                                padding: 0,
                                lineHeight: 1.2,
                                resize: 'none',
                              },
                            }}
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          />
                        ) : (
                          <Text
                            style={{
                              lineHeight: 1.2,
                              whiteSpace: 'pre-wrap',
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: '1rem',
                              color: 'white',
                            }}
                          >
                            {sl.text}
                          </Text>
                        )}
                        {section && (
                          <Box
                            style={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              background: `var(--mantine-color-${color}-9)`,
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                            }}
                          >
                            {section}
                          </Box>
                        )}
                      </Box>
                    )
                  })}
                  
                  {/* Blank slide between songs (inside grid) */}
                  {songIndex < queue.length - 1 && (
                    <Box
                      onClick={() => setBlankPos(blankPos ? null : 'start')}
                      style={{
                        background: 'black',
                        borderRadius: 8,
                        width: '100%',
                        aspectRatio: '3/2',
                        minHeight: 150,
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        border: blankPos ? '4px solid #1E90FF' : '3px solid var(--mantine-color-gray-4)',
                        padding: 20,
                        transition: 'all 300ms ease',
                        boxShadow: blankPos ? '0 0 20px rgba(30, 144, 255, 0.5)' : 'none',
                      }}
                      className={blankPos ? 'slide-selector-active' : ''}
                      onMouseEnter={(e) => {
                        if (!blankPos) {
                          e.currentTarget.style.transform = 'scale(1.02)'
                          e.currentTarget.style.border = '3px solid var(--mantine-color-gray-5)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!blankPos) {
                          e.currentTarget.style.transform = 'scale(1)'
                          e.currentTarget.style.border = '3px solid var(--mantine-color-gray-4)'
                        }
                      }}
                    >
                    </Box>
                  )}
                </Box>

              </Box>
            )
          })}
        </Box>
      </ScrollArea>
    </Box>
  )
}
