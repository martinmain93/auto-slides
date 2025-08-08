import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { demoLibrary } from '../types'
import { Box, Button, Group, Paper } from '@mantine/core'

function firstWords(text: string, count = 5) {
  const words = text.replace(/\n/g, ' ').trim().split(/\s+/)
  const snippet = words.slice(0, count).join(' ')
  return words.length > count ? snippet + '…' : snippet || '—'
}

export default function Presentation() {
  const navigate = useNavigate()
  const [queue] = useState(demoLibrary.map(s => s.id))
  const [currentSongId, setCurrentSongId] = useState(queue[0])
  const currentSong = useMemo(() => demoLibrary.find(s => s.id === currentSongId)!, [currentSongId])
  const [slideIndex, setSlideIndex] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)

  const goPrevSlide = () => setSlideIndex(i => Math.max(0, i - 1))
  const goNextSlide = () => setSlideIndex(i => Math.min(currentSong.slides.length - 1, i + 1))

  const goSong = (id: string) => {
    setCurrentSongId(id)
    setSlideIndex(0)
  }
  const goPrevSong = () => {
    const idx = queue.indexOf(currentSongId)
    if (idx > 0) goSong(queue[idx - 1])
  }
  const goNextSong = () => {
    const idx = queue.indexOf(currentSongId)
    if (idx >= 0 && idx < queue.length - 1) goSong(queue[idx + 1])
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        goNextSlide()
      } else if (e.key === 'ArrowRight') {
        goNextSlide()
      } else if (e.key === 'ArrowLeft') {
        goPrevSlide()
      } else if (e.key === 'ArrowUp') {
        goPrevSong()
      } else if (e.key === 'ArrowDown') {
        goNextSong()
      } else if (e.key === 'Escape') {
        navigate('/plan')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentSongId, slideIndex])

  const onMouseMove = (e: React.MouseEvent) => {
    const nearBottom = window.innerHeight - e.clientY <= 30
    if (nearBottom) setControlsVisible(true)
  }

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    borderTop: '1px solid #333',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    transform: controlsVisible ? 'translateY(0)' : 'translateY(100%)',
    opacity: controlsVisible ? 1 : 0,
    transition: 'transform 180ms ease, opacity 180ms ease',
    pointerEvents: controlsVisible ? 'auto' : 'none',
  }

  return (
    <Box onMouseMove={onMouseMove} style={{ position: 'relative', height: '100dvh', background: 'black', color: 'white', overflow: 'hidden' }}>
      {/* Centered slide text */}
      <Box style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <Box style={{ fontSize: '5vw', lineHeight: 1.2, whiteSpace: 'pre-wrap', textAlign: 'center' }}>
          {currentSong.slides[slideIndex].text}
        </Box>
      </Box>

      {/* Controls overlay (two rows) */}
      <Paper style={overlayStyle}>
        {/* top row: songs + hide */}
        <Group gap="xs" align="center" style={{ marginBottom: 8 }}>
          <Button variant="light" onClick={() => navigate('/plan')}>← Planner</Button>
          <Group gap="xs" style={{ overflowX: 'auto', paddingBottom: 4, flex: 1 }}>
            {queue.map(id => {
              const s = demoLibrary.find(x => x.id === id)!
              const active = id === currentSongId
              return (
                <Button key={id} onClick={() => goSong(id)} variant={active ? 'light' : 'filled'} color={active ? 'dark' : 'gray'}>
                  {s.title}
                </Button>
              )
            })}
          </Group>
          <Button variant="subtle" onClick={() => setControlsVisible(false)} style={{ opacity: 0.8 }}>Hide ▾</Button>
        </Group>
        {/* bottom row: slides */}
        <Group gap="xs" style={{ overflowX: 'auto' }}>
          {currentSong.slides.map((sl, i) => (
            <Button key={sl.id} onClick={() => setSlideIndex(i)} variant={i === slideIndex ? 'light' : 'filled'} color={i === slideIndex ? 'dark' : 'gray'} style={{ textAlign: 'left' }}>
              {firstWords(sl.text, 5)}
            </Button>
          ))}
        </Group>
      </Paper>
    </Box>
  )
}

