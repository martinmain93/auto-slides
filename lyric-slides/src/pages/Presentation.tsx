import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Paper, Text } from '@mantine/core'
import { useAppState } from '../state/AppStateContext'
import HorizontalPicker from '../components/HorizontalPicker'
import { firstWords, rgbaFromMantine, sectionToColor } from '../utils/sections'
import { useSpeechTranscript } from '../ai/useSpeechTranscript'
import { usePhoneticSlideMatch } from '../ai/usePhoneticSlideMatch'

const DEBUG_MATCH = true

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

  const hasSong = Boolean(currentSong)

  // Pre-index progress and last match score (debug)
  const [lastScore, setLastScore] = useState<number | null>(null)

  // Speech / mic state
  const { isListening, partial, finals, toggleMic, resetTranscript } = useSpeechTranscript()

  // Reset debug score when song changes
  useEffect(() => { setLastScore(null) }, [currentSongId])

  // Phonetic matching and navigation decision
  const { transcriptWindow, decision } = usePhoneticSlideMatch({
    currentSong,
    library: state.library,
    queue,
    finals,
    partial,
    slideIndex,
  })
  useEffect(() => {
    if (!currentSong) return

    // If we're blanked and the confidence for the CURRENT slide is now decent, unblank.
    if (blankPos && decision.best && decision.best.songId === currentSong.id) {
      const currentId = currentSong.slides[slideIndex]?.id
      const bestIsCurrent = decision.best.slideId === currentId
      const strongForCurrent = decision.best.score >= 0.55 // threshold to unblank for the current slide
      if (bestIsCurrent && strongForCurrent) {
        setBlankPos(null)
      }
    }

    if (decision.action === 'blank') {
      setBlankPos(decision.blankPos ?? null)
      setLastScore(decision.best?.score ?? null)
      return
    }
    if ((decision.action === 'advance' || decision.action === 'update') && typeof decision.targetIndex === 'number') {
      const idx = decision.targetIndex
      const targetSongId = decision.targetSongId ?? currentSongId
      if (targetSongId !== currentSongId) {
        setBlankPos(null)
        setState((s) => ({ ...s, currentSongId: targetSongId, currentSlideIndex: idx }))
        setLastScore(decision.best?.score ?? null)
        window.setTimeout(() => resetTranscript(), 100)
        return
      }
      if (idx !== slideIndex) {
        setBlankPos(null)
        setState((s) => ({ ...s, currentSlideIndex: idx }))
        setLastScore(decision.best?.score ?? null)
        window.setTimeout(() => resetTranscript(), 100)
      }
    } else if (decision.best) {
      setLastScore(decision.best.score)
    }
  }, [decision.action, decision.targetIndex, decision.targetSongId, decision.blankPos, decision.best, currentSong, currentSongId, slideIndex, setState, resetTranscript, blankPos])

  const goSong = useCallback((id: string) => {
    setState((s) => ({ ...s, currentSongId: id, currentSlideIndex: 0 }))
  }, [setState])

  const goPrevSlide = useCallback(() => {
    if (blankPos === 'start') {
      const idx = queue.indexOf(currentSongId)
      const prevId = queue[idx - 1]
      if (prevId) {
        goSong(prevId)
        setBlankPos('end')
      }
      return
    }
    if (blankPos === 'end') {
      setBlankPos(null)
      return
    }
    if (slideIndex <= 0) {
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
  }, [blankPos, queue, currentSongId, slideIndex, goSong, setState])

  const goNextSlide = useCallback(() => {
    if (blankPos === 'end') {
      const idx = queue.indexOf(currentSongId)
      const nextId = queue[idx + 1]
      if (nextId) {
        goSong(nextId)
        setBlankPos('start')
      }
      return
    }
    if (blankPos === 'start') {
      setBlankPos(null)
      return
    }
    if (!currentSong) return
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
  }, [blankPos, currentSong, queue, currentSongId, setState, slideIndex, goSong])

  const goPrevSong = useCallback(() => {
    const idx = queue.indexOf(currentSongId)
    if (idx > 0) goSong(queue[idx - 1])
  }, [currentSongId, queue, goSong])

  const goNextSong = useCallback(() => {
    const idx = queue.indexOf(currentSongId)
    if (idx >= 0 && idx < queue.length - 1) goSong(queue[idx + 1])
  }, [currentSongId, queue, goSong])

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
        void navigate('/plan')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentSongId, slideIndex, blankPos, goNextSlide, goPrevSlide, goNextSong, goPrevSong, navigate])

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
{hasSong ? (
        <>
          <Box
            key={`${currentSongId}-${blankPos ?? slideIndex}`}
            className="slide-fade-in"
            style={{ fontSize: '5vw', lineHeight: 1.2, whiteSpace: 'pre-wrap', textAlign: 'center', fontWeight: 700, fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
          >
            {blankPos ? '' : currentSong!.slides[slideIndex].text}
          </Box>
          <Text size="sm" c="dimmed" style={{ position: 'absolute', right: 8, bottom: 4, pointerEvents: 'none' }}>
            {currentSong!.title}
          </Text>
        </>
      ) : (
        <Button variant="light" onClick={() => { void navigate('/plan') }}>Go back to planner</Button>
      )}
      </Box>

      {/* Controls overlay (two rows) */}
      <Paper style={overlayStyle}>
        {/* top row: back | songs centered | hide */}
        <Box style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Button variant="light" onClick={() => { void navigate('/plan') }}>← Planner</Button>
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
          <Box style={{ display: 'flex', alignItems: 'center', gap: 12, justifySelf: 'end' }}>
            {DEBUG_MATCH && lastScore != null && (
              <Text size="sm" c="dimmed">score {lastScore.toFixed(2)}</Text>
            )}
            {DEBUG_MATCH && transcriptWindow && (
              <Text size="sm" c="dimmed" style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                “{transcriptWindow}”
              </Text>
            )}
            <Button
              variant={isListening ? 'filled' : 'light'}
              color={isListening ? 'red' : 'blue'}
              onClick={toggleMic}
              aria-pressed={isListening}
              title={isListening ? 'Stop listening' : 'Start listening'}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/>
                </svg>
                {isListening ? 'Listening…' : 'Mic'}
              </span>
            </Button>
            <Button variant="light" onClick={() => setControlsVisible(false)} style={{ justifySelf: 'end' }}>Hide ▾</Button>
          </Box>
        </Box>
        {/* bottom row: slides */}
        <Box style={{ justifySelf: 'center', maxWidth: 1100, width: '100%', overflow: 'hidden' }} ref={slidesScrollerRef}>
          <HorizontalPicker
            className="no-scrollbar"
            items={hasSong ? [
              { key: 'blank-start', label: '—', active: blankPos === 'start', onClick: () => setBlankPos('start') },
              ...currentSong!.slides.map((sl, i) => {
                const section = sl.section
                const color = sectionToColor(section)
                const active = i === slideIndex && !blankPos
                const bg = active ? rgbaFromMantine(color, 0.35) : rgbaFromMantine(color, 0.2)
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
            ] : []}
            activeIndex={hasSong ? (blankPos === 'start' ? 0 : blankPos === 'end' ? currentSong!.slides.length + 1 : (slideIndex + 1)) : 0}
          />
        </Box>
      </Paper>
    </Box>
  )
}

