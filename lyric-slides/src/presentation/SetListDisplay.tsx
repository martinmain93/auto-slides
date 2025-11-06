import { Box, Paper, Text, ScrollArea } from '@mantine/core'
import type { Song } from '../types'
import { getSongColor } from './songColors'

export function SetListDisplay(props: {
  queue: string[]
  library: Song[]
  currentSongId: string
  blankPos: null | 'start' | 'end'
  setBlankPos: (p: null | 'start' | 'end') => void
  goSong: (id: string) => void
}) {
  const { queue, library, currentSongId, setBlankPos, goSong } = props

  return (
    <>
      <Text size="xl" fw={700} mb="md">Set List</Text>
      <ScrollArea style={{ height: 'calc(100% - 100px)' }}>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {queue.map((id, index) => {
            const song = library.find((x) => x.id === id)
            if (!song) return null
            const isActive = id === currentSongId
            const songBgColor = getSongColor(index)
            
            return (
              <Paper
                key={id}
                p="xs"
                withBorder
                style={{
                  cursor: 'pointer',
                  background: songBgColor,
                  border: isActive ? '2px solid #1E90FF' : `2px solid ${songBgColor}`,
                  transition: 'all 200ms ease',
                  color: 'white',
                }}
                onClick={() => { setBlankPos(null); goSong(id) }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.opacity = '0.9'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <Text size="lg" fw={isActive ? 700 : 500} style={{ color: 'white' }}>{song.title}</Text>
                <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{song.slides.length} slides</Text>
              </Paper>
            )
          })}
        </Box>
      </ScrollArea>
    </>
  )
}

