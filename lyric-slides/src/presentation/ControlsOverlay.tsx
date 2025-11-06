import React from 'react'
import { Box, Button, Paper, Text } from '@mantine/core'
import HorizontalPicker from '../components/HorizontalPicker'
import { firstWords, rgbaFromMantine, sectionToColor } from '../utils/sections'
import type { Song } from '../types'

export function ControlsOverlay(props: {
  queue: string[]
  library: Song[]
  currentSongId: string
  slideIndex: number
  onSelectSlide: (index: number) => void
  blankPos: null | 'start' | 'end'
  setBlankPos: (p: null | 'start' | 'end') => void
  goSong: (id: string) => void
  navigateToPlanner: () => void
  isListening: boolean
  toggleMic: () => void
  transcriptWindow: string
  debugScore: number | null
  controlsVisible: boolean
  setControlsVisible: (v: boolean) => void
  slidesScrollerRef: React.RefObject<HTMLDivElement | null>
  onEnterDualScreen: () => void
}) {
  const { queue, library, currentSongId, slideIndex, onSelectSlide, blankPos, setBlankPos, goSong, navigateToPlanner, isListening, toggleMic, transcriptWindow, debugScore, controlsVisible, setControlsVisible, slidesScrollerRef, onEnterDualScreen } = props

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

  const currentSong = library.find(s => s.id === currentSongId)
  const hasSong = Boolean(currentSong)

  return (
    <Paper style={overlayStyle}>
      <Box style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Button variant="light" onClick={navigateToPlanner}>← Planner</Button>
          <Button variant="outline" size="xs" onClick={onEnterDualScreen}>Present on 2nd screen</Button>
        </Box>
        <Box style={{ justifySelf: 'center', maxWidth: 1100, width: '100%' }}>
          <HorizontalPicker
            className="no-scrollbar"
            items={queue.map((id) => {
              const s = library.find((x) => x.id === id)!
              const active = id === currentSongId
              return {
                key: id,
                label: s.title,
                active,
                onClick: () => { setBlankPos(null); goSong(id) },
                color: 'gray',
              } as import('../components/HorizontalPicker').PickerItem
            })}
            activeIndex={Math.max(0, queue.indexOf(currentSongId))}
          />
        </Box>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 12, justifySelf: 'end' }}>
          {debugScore != null && (
            <Text size="sm" c="dimmed">score {debugScore.toFixed(2)}</Text>
          )}
          {transcriptWindow && (
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

      <Box style={{ justifySelf: 'center', maxWidth: 1100, width: '100%', overflow: 'hidden' }} ref={slidesScrollerRef}>
        <HorizontalPicker
          className="no-scrollbar"
          items={hasSong ? ([
            { key: 'blank-start', label: '—', active: blankPos === 'start', onClick: () => setBlankPos('start') } as import('../components/HorizontalPicker').PickerItem,
            ...currentSong!.slides.map((sl, i) => {
              const section = sl.section
              const color = sectionToColor(section)
              const active = i === slideIndex && !blankPos
              const bg = active ? rgbaFromMantine(color, 0.35) : rgbaFromMantine(color, 0.2)
                return ({
                  key: sl.id,
                  label: firstWords(sl.text, 5),
                  active,
                  onClick: () => { setBlankPos(null); onSelectSlide(i) },
                  variant: 'filled' as const,
                  color,
                  style: { backgroundColor: bg, color: 'white' },
                } as import('../components/HorizontalPicker').PickerItem)
            }),
            { key: 'blank-end', label: '—', active: blankPos === 'end', onClick: () => setBlankPos('end') } as import('../components/HorizontalPicker').PickerItem,
          ] as import('../components/HorizontalPicker').PickerItem[]) : []}
          activeIndex={hasSong ? (blankPos === 'start' ? 0 : blankPos === 'end' ? currentSong!.slides.length + 1 : (slideIndex + 1)) : 0}
        />
      </Box>
    </Paper>
  )
}

