import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Text } from '@mantine/core'
import { useAppState } from '../state/AppStateContext'
import { useSpeechTranscript } from '../ai/useSpeechTranscript'
import { useEnhancedSpeechTranscript } from '../ai/useEnhancedSpeechTranscript'
import { usePhoneticSlideMatch } from '../ai/usePhoneticSlideMatch'
import { useNavigation, navigateFromDecision } from '../presentation/useNavigation'
import { ControlsOverlay } from '../presentation/ControlsOverlay'
import { DevPanel } from '../presentation/DevPanel'
import { DualScreenControls } from '../presentation/DualScreenControls'

const DEBUG_MATCH = true

export default function Presentation() {
  const navigate = useNavigate()
  const { state, setState, upsertSong } = useAppState()
  const nav = useNavigation({ state, setState, onExit: () => { void navigate('/plan') } })
  const { queue, currentSongId, currentSong, slideIndex, setSlideIndex, blankPos, setBlankPos, goSong } = nav
  const [controlsVisible, setControlsVisible] = useState(true)
  const [devVisible, setDevVisible] = useState(true)
  const [useEnhancedAudio, setUseEnhancedAudio] = useState(false)
  const [dualScreenMode, setDualScreenMode] = useState(false)
  const slidesScrollerRef = useRef<HTMLDivElement | null>(null)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const presentationWindowRef = useRef<Window | null>(null)

  const hasSong = Boolean(currentSong)

  // Broadcast state to presentation window
  useEffect(() => {
    if (dualScreenMode) {
      if (!broadcastChannelRef.current) {
        broadcastChannelRef.current = new BroadcastChannel('presentation-sync')
        
        // Listen for state requests from the presentation view
        broadcastChannelRef.current.onmessage = (event: MessageEvent) => {
          if ((event.data as { type?: string }).type === 'request-state') {
            broadcastChannelRef.current?.postMessage({
              currentSongId,
              slideIndex,
              blankPos,
            })
          }
        }
      }
      
      // Broadcast current state
      broadcastChannelRef.current.postMessage({
        currentSongId,
        slideIndex,
        blankPos,
      })
    }
    
    return () => {
      if (!dualScreenMode && broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
        broadcastChannelRef.current = null
      }
    }
  }, [dualScreenMode, currentSongId, slideIndex, blankPos])

  // Handle dual screen mode
  const handleEnterDualScreen = () => {
    setDualScreenMode(true)
    // Open presentation view in new window
    const newWindow = window.open('/presentation-view', '_blank', 'width=1920,height=1080')
    presentationWindowRef.current = newWindow
  }

  const handleExitDualScreen = () => {
    setDualScreenMode(false)
    if (presentationWindowRef.current && !presentationWindowRef.current.closed) {
      presentationWindowRef.current.close()
    }
    presentationWindowRef.current = null
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close()
      broadcastChannelRef.current = null
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
      }
      if (presentationWindowRef.current && !presentationWindowRef.current.closed) {
        presentationWindowRef.current.close()
      }
    }
  }, [])

  // Pre-index progress and last match score (debug)
  const [lastScore, setLastScore] = useState<number | null>(null)

  // Speech / mic state - use enhanced version if enabled
  const standardSpeech = useSpeechTranscript()
  const enhancedSpeech = useEnhancedSpeechTranscript()
  const speechControls = useEnhancedAudio ? enhancedSpeech : standardSpeech
  const { isListening, transcriptWindow, toggleMic } = speechControls

  // Reset debug score when song changes
  useEffect(() => { setLastScore(null) }, [currentSongId])

  // Matching disabled: use minimal hook for transcript window only
  const { decision, vectorResults } = usePhoneticSlideMatch({
    currentSong,
    library: state.library,
    queue,
    transcriptWindow,
    slideIndex,
  })

  useEffect(() => {
    // if (decision.action == 'blank') {
    //   setBlankPos(decision.blankPos)
    // }
    navigateFromDecision(decision, {
      slideIndex,
      currentSongId,
      setSlideIndex,
      setBlankPos,
      setLastScore,
      blankPos,
      currentSong,
      queue,
    })
  }, [decision])

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

  if (dualScreenMode) {
    return (
      <DualScreenControls
        queue={queue}
        library={state.library}
        currentSongId={currentSongId}
        slideIndex={slideIndex}
        onSelectSlide={(i) => setSlideIndex(i)}
        blankPos={blankPos}
        setBlankPos={setBlankPos}
        goSong={goSong}
        navigateToPlanner={() => { void navigate('/plan') }}
        onExitDualScreen={handleExitDualScreen}
        upsertSong={upsertSong}
      />
    )
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
          {!blankPos && slideIndex === 0 && (
            <Box style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <Text size="sm" c="dimmed" style={{ opacity: 0.7 }}>
                {currentSong!.title}
              </Text>
              {currentSong!.credits && (
                <Text size="sm" c="dimmed" style={{ opacity: 0.6, marginTop: 4 }}>
                  {currentSong!.credits}
                </Text>
              )}
            </Box>
          )}
          {(!blankPos && slideIndex !== 0) && (
            <Text size="sm" c="dimmed" style={{ position: 'absolute', right: 8, bottom: 4, pointerEvents: 'none' }}>
              {currentSong!.title}
            </Text>
          )}
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
          vectorResults={vectorResults}
          currentSong={currentSong}
          slideIndex={slideIndex}
          decision={decision}
          useEnhancedAudio={useEnhancedAudio}
          onToggleEnhancedAudio={setUseEnhancedAudio}
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
        onEnterDualScreen={handleEnterDualScreen}
      />
    </Box>
  )
}

