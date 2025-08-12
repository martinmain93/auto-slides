import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Text } from '@mantine/core'
import { useAppState } from '../state/AppStateContext'
import { useSpeechTranscript } from '../ai/useSpeechTranscript'
import { usePhoneticSlideMatch } from '../ai/usePhoneticSlideMatch'
import { useNavigation } from '../presentation/useNavigation'
import { ControlsOverlay } from '../presentation/ControlsOverlay'
import { DevPanel } from '../presentation/DevPanel'

const DEBUG_MATCH = true

export default function Presentation() {
  const navigate = useNavigate()
  const { state, setState } = useAppState()
  const nav = useNavigation({ state, setState, onExit: () => { void navigate('/plan') } })
  const { queue, currentSongId, currentSong, slideIndex, setSlideIndex, blankPos, setBlankPos, goSong } = nav
  const [controlsVisible, setControlsVisible] = useState(true)
  const [devVisible, setDevVisible] = useState(true)
  const slidesScrollerRef = useRef<HTMLDivElement | null>(null)

  const hasSong = Boolean(currentSong)

  // Pre-index progress and last match score (debug)
  const [lastScore, setLastScore] = useState<number | null>(null)

  // Speech / mic state
  const { isListening, partial, finals, toggleMic, resetTranscript } = useSpeechTranscript()

  // Reset debug score when song changes
  useEffect(() => { setLastScore(null) }, [currentSongId])

  // Phonetic matching and navigation decision
  const [acceptNextThreshold, setAcceptNextThreshold] = useState(0.7)
  const [acceptAnyThreshold, setAcceptAnyThreshold] = useState(0.6)
  const [blankThreshold, setBlankThreshold] = useState(0.45)
  const [crossSongThreshold, setCrossSongThreshold] = useState(0.8)

  const { transcriptWindow, decision } = usePhoneticSlideMatch({
    currentSong,
    library: state.library,
    queue,
    finals,
    partial,
    slideIndex,
    acceptNextThreshold,
    acceptAnyThreshold,
    blankThreshold,
    crossSongThreshold,
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
  }, [decision.action, decision.targetIndex, decision.targetSongId, decision.blankPos, decision.best, currentSong, currentSongId, slideIndex, setState, resetTranscript, blankPos, setBlankPos])


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
    // The picker component scrolls itself on selection; no button refs required here after refactor.
  }, [slideIndex, blankPos, currentSongId])

  const onMouseMove = (e: React.MouseEvent) => {
    const nearBottom = window.innerHeight - e.clientY <= 30
    if (nearBottom) setControlsVisible(true)
  }


  // Hotkey: toggle Dev Panel with "D"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (isTyping) return
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setDevVisible(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

      {devVisible && (
        <DevPanel
          library={state.library}
          currentSongId={currentSongId}
          queue={queue}
          transcript={transcriptWindow}
          currentSong={currentSong}
          slideIndex={slideIndex}
          thresholds={{
            acceptNextThreshold,
            setAcceptNextThreshold,
            acceptAnyThreshold,
            setAcceptAnyThreshold,
            blankThreshold,
            setBlankThreshold,
            crossSongThreshold,
            setCrossSongThreshold,
          }}
        />
      )}

      <ControlsOverlay
        queue={queue}
        library={state.library}
        currentSongId={currentSongId}
        slideIndex={slideIndex}
        blankPos={blankPos}
        setBlankPos={setBlankPos}
        goSong={goSong}
        onSelectSlide={(i) => setSlideIndex(i)}
        navigateToPlanner={() => { void navigate('/plan') }}
        isListening={isListening}
        toggleMic={toggleMic}
        transcriptWindow={transcriptWindow}
        debugScore={DEBUG_MATCH ? lastScore : null}
        controlsVisible={controlsVisible}
        setControlsVisible={setControlsVisible}
        slidesScrollerRef={slidesScrollerRef}
      />
    </Box>
  )
}

