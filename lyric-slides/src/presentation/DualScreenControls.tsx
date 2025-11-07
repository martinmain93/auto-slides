import { Box, Button, Text, Paper } from '@mantine/core'
import type { Song } from '../types'
import { SlideTimeline } from './SlideTimeline'
import { DualScreenSearch } from './DualScreenSearch'
import { SetListDisplay } from './SetListDisplay'
import { getSongColor } from './songColors'

export function DualScreenControls(props: {
  queue: string[]
  library: Song[]
  currentSongId: string
  slideIndex: number
  onSelectSlide: (index: number) => void
  blankPos: null | 'start' | 'end'
  setBlankPos: (p: null | 'start' | 'end') => void
  goSong: (id: string) => void
  navigateToPlanner: () => void
  onExitDualScreen: () => void
  upsertSong: (song: Song) => void
}) {
  const { 
    queue, 
    library, 
    currentSongId, 
    slideIndex, 
    onSelectSlide, 
    blankPos, 
    setBlankPos, 
    goSong, 
    navigateToPlanner,
    onExitDualScreen,
    upsertSong
  } = props


  return (
    <Box style={{ position: 'fixed', inset: 0, background: '#1a1a1a', color: 'white', display: 'flex', flexDirection: 'row' }}>
      {/* Left side - 25% */}
      <Box style={{ flex: '0 0 410px', background: '#0f0f0f', borderRight: '2px solid #333', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top left - Controls */}
        <Box style={{ padding: 16, borderBottom: '2px solid #333', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Box style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="light" onClick={navigateToPlanner}>← Planner</Button>
            <Button variant="light" color="red" onClick={onExitDualScreen}>Exit Dual Screen</Button>
            <Button 
              variant={blankPos ? 'filled' : 'outline'}
              color={blankPos ? 'yellow' : 'gray'}
              onClick={() => setBlankPos(blankPos ? null : 'start')}
              style={{ marginLeft: 'auto' }}
            >
              Blank Slide
            </Button>
          </Box>
        </Box>

        {/* Bottom left - Search and Set List */}
        <Box style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 16 }}>
          <DualScreenSearch
            library={library}
            queue={queue}
            currentSongId={currentSongId}
            slideIndex={slideIndex}
            blankPos={blankPos}
            setBlankPos={setBlankPos}
            goSong={goSong}
            onSelectSlide={onSelectSlide}
          >
            <SetListDisplay
              queue={queue}
              library={library}
              currentSongId={currentSongId}
              blankPos={blankPos}
              setBlankPos={setBlankPos}
              goSong={goSong}
            />
          </DualScreenSearch>
        </Box>
      </Box>

      {/* Right side - 75% */}
      <Box style={{ flex: '0 0 75%', overflow: 'hidden', position: 'relative' }}>
        <SlideTimeline
          queue={queue}
          library={library}
          currentSongId={currentSongId}
          slideIndex={slideIndex}
          blankPos={blankPos}
          setBlankPos={setBlankPos}
          onSelectSlide={onSelectSlide}
          goSong={goSong}
          upsertSong={upsertSong}
        />
        
        {/* Current slide display in bottom right */}
        {currentSongId && !blankPos && (() => {
          const currentSong = library.find(s => s.id === currentSongId)
          const songIndex = queue.indexOf(currentSongId)
          if (!currentSong || songIndex === -1) return null
          const currentSlide = currentSong.slides[slideIndex]
          if (!currentSlide) return null
          const songBgColor = getSongColor(songIndex)
          
          return (
            <Paper
              style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                width: 300,
                minHeight: 200,
                background: 'black',
                borderRadius: 8,
                padding: 24,
                border: '4px solid #1E90FF',
                zIndex: 100,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(30, 144, 255, 0.5)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                style={{
                  background: songBgColor,
                  padding: '8px 12px',
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              >
                <Text size="sm" fw={600} style={{ color: 'white', marginBottom: 2 }}>
                  {currentSong.title}
                </Text>
                <Text size="xs" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Slide {slideIndex + 1} of {currentSong.slides.length}
                </Text>
              </Box>
              <Text
                style={{
                  lineHeight: 1.2,
                  whiteSpace: 'pre-wrap',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'white',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {currentSlide.text}
              </Text>
            </Paper>
          )
        })()}
      </Box>
    </Box>
  )
}
