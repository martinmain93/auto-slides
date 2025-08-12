import React, { useMemo } from 'react'
import { Box, Paper, Title, Text, Slider, Group, Divider, ScrollArea, Badge } from '@mantine/core'
import type { Song } from '../types'
import { phoneticTokens, phoneticScoresForSongs, buildPhoneticIndex } from '../lib/phonetics'

export type DevPanelProps = {
  library: Song[]
  currentSongId?: string
  queue: string[]
  transcript: string
  currentSong?: Song
  slideIndex: number
  thresholds: {
    acceptNextThreshold: number
    setAcceptNextThreshold: (v: number) => void
    acceptAnyThreshold: number
    setAcceptAnyThreshold: (v: number) => void
    blankThreshold: number
    setBlankThreshold: (v: number) => void
    crossSongThreshold: number
    setCrossSongThreshold: (v: number) => void
  }
}

export function DevPanel(props: DevPanelProps) {
  const { library, queue, currentSongId, transcript, currentSong, slideIndex, thresholds } = props
  const { acceptNextThreshold, setAcceptNextThreshold, acceptAnyThreshold, setAcceptAnyThreshold, blankThreshold, setBlankThreshold, crossSongThreshold, setCrossSongThreshold } = thresholds

  const ph = useMemo(() => phoneticTokens(transcript), [transcript])

  const indexes = useMemo(() => {
    const map: Record<string, ReturnType<typeof buildPhoneticIndex>> = {}
    for (const s of library) map[s.id] = buildPhoneticIndex(s)
    return map
  }, [library])

  const preferNextSlideId = currentSong ? currentSong.slides[Math.min(currentSong.slides.length - 1, slideIndex + 1)]?.id : undefined

  const scores = useMemo(() => phoneticScoresForSongs({
    library,
    songIndexes: indexes,
    query: transcript,
    preferSongId: currentSong?.id,
    preferNextSlideId,
    inOrderSongIds: queue,
  }), [library, indexes, transcript, currentSong?.id, preferNextSlideId, queue])

  return (
    <Paper withBorder p="md" radius="md" style={{ position: 'fixed', top: 8, right: 8, width: 380, maxHeight: '85vh', overflow: 'hidden', background: 'rgba(20,20,20,0.9)', color: 'white', zIndex: 1200 }}>
      <Title order={4} mb="xs">Dev Panel</Title>

      <Box mb="sm">
        <Text size="sm" c="dimmed">Transcript</Text>
        <Text style={{ wordBreak: 'break-word' }}>{transcript || '—'}</Text>
        <Text size="sm" c="dimmed" mt={4}>Phonetic</Text>
        <Text style={{ wordBreak: 'break-word' }}>{ph.join(' ') || '—'}</Text>
      </Box>

      <Divider my="xs" />
      <Title order={5} mb={4}>Thresholds</Title>
      <Box>
        <Text size="sm">Accept Next ({acceptNextThreshold.toFixed(2)})</Text>
        <Slider value={acceptNextThreshold} onChange={setAcceptNextThreshold} min={0} max={1} step={0.01} marks={[{ value: 0.7 }]} mb="xs" />
        <Text size="sm">Accept Any ({acceptAnyThreshold.toFixed(2)})</Text>
        <Slider value={acceptAnyThreshold} onChange={setAcceptAnyThreshold} min={0} max={1} step={0.01} marks={[{ value: 0.6 }]} mb="xs" />
        <Text size="sm">Blank ({blankThreshold.toFixed(2)})</Text>
        <Slider value={blankThreshold} onChange={setBlankThreshold} min={0} max={1} step={0.01} marks={[{ value: 0.45 }]} mb="xs" />
        <Text size="sm">Cross-Song ({crossSongThreshold.toFixed(2)})</Text>
        <Slider value={crossSongThreshold} onChange={setCrossSongThreshold} min={0} max={1} step={0.01} marks={[{ value: 0.8 }]} />
      </Box>

      <Divider my="xs" />
      <Title order={5} mb={4}>Candidate scores</Title>
      <ScrollArea style={{ height: 220 }}>
        <Box>
          {scores.slice(0, 60).map((s) => {
            const song = library.find((x) => x.id === s.songId)
            const songTitle = song?.title || s.songId
            const slideIdx = song ? song.slides.findIndex((sl) => sl.id === s.slideId) : -1
            const isCurrentSong = s.songId === currentSongId
            const badge = isCurrentSong ? <Badge size="xs" color="blue" variant="light" ml={6}>current</Badge> : null
            return (
              <Group key={`${s.songId}:${s.slideId}`} gap={6} wrap="nowrap" mb={4} style={{ opacity: isCurrentSong ? 1 : 0.8 }}>
                <Text size="sm" style={{ width: 38, textAlign: 'right' }}>{s.score.toFixed(2)}</Text>
                <Text size="sm" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {songTitle} · {slideIdx >= 0 ? `#${slideIdx + 1}` : s.slideId}
                </Text>
                {badge}
              </Group>
            )
          })}
          {scores.length === 0 && <Text size="sm" c="dimmed">No candidates</Text>}
        </Box>
      </ScrollArea>
    </Paper>
  )
}

