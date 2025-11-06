import { useEffect, useState } from 'react'
import { Box, Text } from '@mantine/core'
import { useAppState } from '../state/AppStateContext'
import type { Song } from '../types'

type PresentationState = {
  currentSongId: string
  slideIndex: number
  blankPos: null | 'start' | 'end'
}

export default function PresentationView() {
  const { state } = useAppState()
  const [presState, setPresState] = useState<PresentationState | null>(null)

  useEffect(() => {
    // Listen for state updates from the main presentation window
    const channel = new BroadcastChannel('presentation-sync')
    
    channel.onmessage = (event: MessageEvent) => {
      setPresState(event.data as PresentationState)
    }

    // Request initial state
    channel.postMessage({ type: 'request-state' })

    return () => {
      channel.close()
    }
  }, [])

  const currentSong: Song | undefined = presState?.currentSongId 
    ? state.library.find(s => s.id === presState.currentSongId)
    : undefined

  const slideText = currentSong && presState 
    ? (presState.blankPos ? '' : currentSong.slides[presState.slideIndex]?.text || '')
    : ''
  
  const isFirstSlide = presState && !presState.blankPos && presState.slideIndex === 0

  return (
    <Box style={{ position: 'relative', height: '100vh', background: 'black', color: 'white', overflow: 'hidden' }}>
      <Box style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <Box
          key={`${presState?.currentSongId}-${presState?.blankPos ?? presState?.slideIndex}`}
          className="slide-fade-in"
          style={{ 
            fontSize: '5vw', 
            lineHeight: 1.2, 
            whiteSpace: 'pre-wrap', 
            textAlign: 'center', 
            fontWeight: 700, 
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            padding: '2rem'
          }}
        >
          {slideText}
        </Box>
        {currentSong && isFirstSlide && (
          <Box style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <Text size="xl" c="dimmed" style={{ opacity: 0.7 }}>
              {currentSong.title}
            </Text>
            {currentSong.credits && (
              <Text size="lg" c="dimmed" style={{ opacity: 0.6, marginTop: 4 }}>
                {currentSong.credits}
              </Text>
            )}
          </Box>
        )}
        {currentSong && !isFirstSlide && (
          <Text size="sm" c="dimmed" style={{ position: 'absolute', right: 8, bottom: 4, pointerEvents: 'none' }}>
            {currentSong.title}
          </Text>
        )}
      </Box>
    </Box>
  )
}
