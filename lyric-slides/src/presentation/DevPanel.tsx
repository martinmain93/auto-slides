import { Box, Paper, Title, Text, Divider, Switch } from '@mantine/core'
import type { Song } from '../types'

export type DevPanelProps = {
  library: Song[]
  currentSongId?: string
  queue: string[]
  transcript: string
  vectorResults: { slideId: string; bestPos: number; score: number }[]
  currentSong?: Song
  slideIndex: number
  decision?: Object
  useEnhancedAudio?: boolean
  onToggleEnhancedAudio?: (enabled: boolean) => void
}

// Minimal Dev Panel showing transcript and current context. Matching telemetry removed.
export function DevPanel(props: DevPanelProps) {
  const { transcript, currentSong, slideIndex, vectorResults, useEnhancedAudio, onToggleEnhancedAudio } = props

  return (
    <Paper withBorder p="md" radius="md" style={{ position: 'fixed', top: 8, right: 8, width: 360, maxHeight: '85vh', overflow: 'hidden', background: 'rgba(20,20,20,0.9)', color: 'white', zIndex: 1200 }}>
      <Title order={4} mb="xs">Dev Panel</Title>

      {onToggleEnhancedAudio && (
        <Box mb="sm">
          <Switch
            checked={useEnhancedAudio || false}
            onChange={(event) => onToggleEnhancedAudio(event.currentTarget.checked)}
            label="Enhanced Audio Processing"
            description="Use Web Audio API filters for better recognition with background music"
            size="sm"
          />
        </Box>
      )}

      <Divider my="xs" />

      <Box mb="sm">
        <Text size="sm" c="dimmed">Transcript</Text>
        <Text style={{ wordBreak: 'break-word' }}>{transcript || '—'}</Text>
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
          {vectorResults.slice(0, 10).map((result, index) => (
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

