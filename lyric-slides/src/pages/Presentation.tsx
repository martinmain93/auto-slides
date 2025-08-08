import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Group, Paper, Text } from '@mantine/core'
import { useAppState } from '../state/AppStateContext'
import HorizontalPicker from '../components/HorizontalPicker'

function firstWords(text: string, count = 5) {
  const words = text.replace(/\n/g, ' ').trim().split(/\s+/)
  const snippet = words.slice(0, count).join(' ')
  return words.length > count ? snippet + '…' : snippet || '—'
}

export default function Presentation() {
  const navigate = useNavigate()
  const { state, setState } = useAppState()
  const queue = state.queue.length ? state.queue : state.library.map((s) => s.id)
  const currentSongId = state.currentSongId ?? queue[0]
  const currentSong = state.library.find((s) => s.id === currentSongId)
  const slideIndex = state.currentSlideIndex
const [controlsVisible, setControlsVisible] = useState(true)
  // null = showing a real slide, 'start' or 'end' = showing a blank
  const [blankPos, setBlankPos] = useState<null | 'start' | 'end'>(null)
  const slidePillRefs = useRef<(HTMLButtonElement | null)[]>([])
  const startBlankRef = useRef<HTMLButtonElement | null>(null)
  const endBlankRef = useRef<HTMLButtonElement | null>(null)
  const slidesScrollerRef = useRef<HTMLDivElement | null>(null)

  if (!currentSong) {
    return (
      <Box style={{ position: 'relative', height: '100dvh', background: 'black', color: 'white', display: 'grid', placeItems: 'center' }}>
        <Button variant="light" onClick={() => navigate('/plan')}>Go back to planner</Button>
      </Box>
    )
  }

  const goPrevSlide = () => {
    if (blankPos === 'start') {
      // go to previous song end blank
      const idx = queue.indexOf(currentSongId)
      const prevId = queue[idx - 1]
      if (prevId) {
        goSong(prevId)
        setBlankPos('end')
      }
      return
    }
    if (blankPos === 'end') {
      // leave end blank to last slide
      setBlankPos(null)
      return
    }
    if (slideIndex <= 0) {
      // at first real slide — go to previous song (end blank)
      const idx = queue.indexOf(currentSongId)
      const prevId = queue[idx - 1]
      if (prevId) {
        goSong(prevId)
        setBlankPos('end')
      } else {
        setBlankPos('start')
      }
      return
    }
    setState((s) => ({ ...s, currentSlideIndex: Math.max(0, s.currentSlideIndex - 1) }))
  }
  const goNextSlide = () => {
    if (blankPos === 'end') {
      // at trailing blank, go to next song start blank cleared
      const idx = queue.indexOf(currentSongId)
      const nextId = queue[idx + 1]
      if (nextId) {
        goSong(nextId)
        setBlankPos('start')
      }
      return
    }
    if (blankPos === 'start') {
      // leave start blank to first slide
      setBlankPos(null)
      return
    }
    if (slideIndex >= currentSong.slides.length - 1) {
      const idx = queue.indexOf(currentSongId)
      const nextId = queue[idx + 1]
      if (nextId) {
        goSong(nextId)
        setBlankPos('start')
      } else {
        setBlankPos('end')
      }
      return
    }
    setState((s) => ({ ...s, currentSlideIndex: Math.min(currentSong.slides.length - 1, s.currentSlideIndex + 1) }))
  }

  const goSong = (id: string) => setState((s) => ({ ...s, currentSongId: id, currentSlideIndex: 0 }))
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
        e.preventDefault()
        goNextSlide()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrevSlide()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        goPrevSong()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        goNextSong()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        navigate('/plan')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentSongId, slideIndex, blankPos])

  // When controls are hidden, blur any focused control to prevent the browser from
  // attempting to keep a (now offscreen) focused element in view and scrolling the page.
  useEffect(() => {
    if (!controlsVisible) {
      const active = document.activeElement as HTMLElement | null
      if (active && typeof active.blur === 'function') active.blur()
    }
  }, [controlsVisible])

  // Auto-center selected pill in slides scroller
  useEffect(() => {
    const scroller = slidesScrollerRef.current
    if (!scroller) return
    let el: HTMLButtonElement | null = null
    if (blankPos === 'start') el = startBlankRef.current
    else if (blankPos === 'end') el = endBlankRef.current
    else el = slidePillRefs.current[slideIndex]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [slideIndex, blankPos, currentSongId])

  const onMouseMove = (e: React.MouseEvent) => {
    const nearBottom = window.innerHeight - e.clientY <= 30
    if (nearBottom) setControlsVisible(true)
  }

  // Lock page scrolling while in presentation to avoid layout shifts
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [])

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
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
    zIndex: 1000,
    willChange: 'transform, opacity',
  }

  return (
    <Box onMouseMove={onMouseMove} style={{ position: 'relative', height: '100dvh', background: 'black', color: 'white', overflow: 'hidden' }}>
      {/* Centered slide text */}
      <Box style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
<Box
          key={`${currentSongId}-${blankPos ?? slideIndex}`}
          className="slide-fade-in"
          style={{ fontSize: '5vw', lineHeight: 1.2, whiteSpace: 'pre-wrap', textAlign: 'center', fontWeight: 700, fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
        >
          {blankPos ? '' : currentSong.slides[slideIndex].text}
        </Box>
        <Text size="sm" c="dimmed" style={{ position: 'absolute', right: 8, bottom: 4, pointerEvents: 'none' }}>
          {currentSong.title}
        </Text>
      </Box>

      {/* Controls overlay (two rows) */}
      <Paper style={overlayStyle}>
        {/* top row: back | songs centered | hide */}
        <Box style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Button variant="light" onClick={() => navigate('/plan')}>← Planner</Button>
          <Box style={{ justifySelf: 'center', maxWidth: 1100, width: '100%' }}>
            <HorizontalPicker
              className="no-scrollbar"
              items={queue.map((id) => {
                const s = state.library.find((x) => x.id === id)!
                const active = id === currentSongId
                return {
                  key: id,
                  label: s.title,
                  active,
                  onClick: () => { setBlankPos(null); goSong(id) },
                  color: 'gray',
                }
              })}
              activeIndex={Math.max(0, queue.indexOf(currentSongId))}
            />
          </Box>
          <Button variant="light" onClick={() => setControlsVisible(false)} style={{ justifySelf: 'end' }}>Hide ▾</Button>
        </Box>
        {/* bottom row: slides */}
        <Box style={{ justifySelf: 'center', maxWidth: 1100, width: '100%', overflow: 'hidden' }} ref={slidesScrollerRef}>
          <HorizontalPicker
            className="no-scrollbar"
            items={[
              { key: 'blank-start', label: '—', active: blankPos === 'start', onClick: () => setBlankPos('start') },
              ...currentSong.slides.map((sl, i) => {
                const section = sl.section
                const color = section === 'chorus' ? 'grape' : section === 'verse' ? 'blue' : section === 'bridge' ? 'teal' : section === 'pre-chorus' ? 'cyan' : section === 'instrumental' ? 'green' : section === 'tag' ? 'pink' : section === 'intro' ? 'yellow' : section === 'outro' ? 'orange' : 'gray'
                const active = i === slideIndex && !blankPos
                // Subtle RGBA overlays on top of dark background
                const rgba = (hex: string, a: number) => {
                  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
                  if (!m) return `rgba(255,255,255,${a})`
                  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16)
                  return `rgba(${r}, ${g}, ${b}, ${a})`
                }
                // Map Mantine color names to representative hex for overlay
                const baseHex: Record<string,string> = {
                  grape: '#ab4eaa', blue: '#228be6', teal: '#12b886', cyan: '#15aabf', green: '#40c057', pink: '#e64980', yellow: '#fab005', orange: '#fd7e14', gray: '#868e96'
                }
                const bg = active ? rgba(baseHex[color] || '#868e96', 0.35) : rgba(baseHex[color] || '#868e96', 0.2)
                return ({
                  key: sl.id,
                  label: firstWords(sl.text, 5),
                  active,
                  onClick: () => { setBlankPos(null); setState((s) => ({ ...s, currentSlideIndex: i })) },
                  variant: 'filled',
                  color,
                  style: { backgroundColor: bg, color: 'white' },
                })
              }),
              { key: 'blank-end', label: '—', active: blankPos === 'end', onClick: () => setBlankPos('end') },
            ]}
            activeIndex={blankPos === 'start' ? 0 : blankPos === 'end' ? currentSong.slides.length + 1 : (slideIndex + 1)}
          />
        </Box>
      </Paper>
    </Box>
  )
}

