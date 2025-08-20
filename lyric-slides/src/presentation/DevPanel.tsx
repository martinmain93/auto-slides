import { Box, Paper, Title, Text, Divider } from '@mantine/core'
import type { Song } from '../types'

export type DevPanelProps = {
  library: Song[]
  currentSongId?: string
  queue: string[]
  transcript: string
  phoneticTranscript: string[]
  vectorResults: { slideId: string; bestPos: number; score: number }[]
  currentSong?: Song
  slideIndex: number
  decision?: Object
}

// Minimal Dev Panel showing transcript and current context. Matching telemetry removed.
export function DevPanel(props: DevPanelProps) {
  const { transcript, phoneticTranscript, currentSong, slideIndex, vectorResults } = props

  const displayPhoneticTranscript = phoneticTranscript.join(' ')

  return (
    <Paper withBorder p="md" radius="md" style={{ position: 'fixed', top: 8, right: 8, width: 360, maxHeight: '85vh', overflow: 'hidden', background: 'rgba(20,20,20,0.9)', color: 'white', zIndex: 1200 }}>
      <Title order={4} mb="xs">Dev Panel</Title>

      <Box mb="sm">
        <Text size="sm" c="dimmed">Transcript</Text>
        <Text style={{ wordBreak: 'break-word' }}>{transcript || '—'}</Text>
        <Text style={{ wordBreak: 'break-word' }}>{displayPhoneticTranscript || '—'}</Text>
      </Box>

      <Divider my="xs" />
      <Box>
        <Text size="sm" c="dimmed">Current</Text>
        <Text size="sm">{currentSong ? `${currentSong.title} · Slide #${slideIndex + 1}` : 'No song selected'}</Text>
      </Box>

      <Divider my="xs" />
      <Text size="sm" c="dimmed">
        Vector Results:
        <Box>
          {vectorResults.map((result, index) => (
            <Text key={index} size="xs" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              Slide ID: {result.slideId}, Best Pos: {result.bestPos}, Score: {result.score}
            </Text>
          ))}
        </Box>
      </Text>
      <Divider my="xs" />
      {/* Show the raw decision info */}
      <Text size="sm" c="dimmed">Decision</Text>
      <Text size="xs" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {JSON.stringify(props.decision, null, 2) || 'No decision made'}
      </Text>
    </Paper>
  )
}

