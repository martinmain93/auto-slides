import { useMemo, useState } from 'react'
import { Box, Button, Group, Stack, Text, Textarea, TextInput, Title, Paper, ScrollArea } from '@mantine/core'
import { useAppState } from '../state/AppStateContext'
import type { Song } from '../types'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function SongEditor() {
  const { state, upsertSong, selectSong } = useAppState()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isNew = searchParams.get('new') !== null
  const existing = !isNew && state.currentSongId ? state.library.find(s => s.id === state.currentSongId) : undefined

  const [title, setTitle] = useState(existing?.title ?? '')
  const [content, setContent] = useState(existing ? existing.slides.map(s => s.text).join('\n\n') : '')
  const [credits, setCredits] = useState(existing?.credits ?? '')

  const slides = useMemo(() => {
    return content
      .split(/\n{2,}/)
      .map(s => s.trim())
      .filter(Boolean)
  }, [content])

  const save = () => {
    const id = existing?.id ?? (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `song-${Math.random().toString(36).slice(2,6)}`)
    const song: Song = {
      id,
      title: title || 'Untitled Song',
      slides: slides.map((text, i) => ({ id: `${id}-${i+1}`, text })),
      credits: credits.trim() || undefined,
    }
    upsertSong(song)
    selectSong(song.id)
  }

  return (
    <Box p="md" style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12 }}>
      <Paper withBorder p="md" radius="md" style={{ fontSize: 16 }}>
        <Stack gap="md">
          <Group justify="space-between" mb="xs">
            <Button variant="default" onClick={() => navigate('/plan')}>Back</Button>
            <Button onClick={save}>Save</Button>
          </Group>

          <div>
            <TextInput size="lg" value={title} onChange={e => setTitle(e.currentTarget.value)} label="Title" placeholder="Song title" labelProps={{ style: { fontSize: 16 } }} />
            <Text size="sm" c="dimmed">Enter the song title</Text>
          </div>

          <div style={{ minHeight: '50vh' }}>
            <Textarea size="md" value={content} onChange={e => setContent(e.currentTarget.value)} label="Content" placeholder="Lyrics..." autosize minRows={12} styles={{ input: { height: '52vh', overflow: 'auto' } }} />
            <Text size="sm" c="dimmed">Slides for the song are separated by a blank line (two newlines)</Text>
          </div>

          <div>
            <Textarea size="md" value={credits} onChange={e => setCredits(e.currentTarget.value)} label="Credits" placeholder="Authors, copyright..." autosize minRows={3} maxRows={3} />
            <Text size="sm" c="dimmed">Credits are shown on slides in small text</Text>
          </div>
        </Stack>
      </Paper>

      <Paper withBorder p="sm" radius="md" style={{ overflow: 'hidden' }}>
        <Title order={5} ta="center" mb="xs">Preview</Title>
        <ScrollArea h={600} type="hover">
          <Stack gap="sm">
            {slides.length === 0 ? (
              <Text c="dimmed" ta="center">No slides yet</Text>
            ) : (
              slides.map((t, i) => (
                <Box key={i} style={{ background: 'black', color: 'white', borderRadius: 6, width: '100%', height: 112, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                    <div style={{ fontSize: 14, lineHeight: 1.2, whiteSpace: 'pre-wrap', textAlign: 'center', fontWeight: 700, fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', padding: 6 }}>{t}</div>
                  </div>
                  {credits && <div style={{ position: 'absolute', right: 6, bottom: 4, fontSize: 10, opacity: 0.7 }}>{credits}</div>}
                  <div style={{ position: 'absolute', left: 0, right: 0, top: 2, textAlign: 'center', fontSize: 10, opacity: 0.5 }}>Slide {i+1}</div>
                </Box>
              ))
            )}
          </Stack>
        </ScrollArea>
      </Paper>
    </Box>
  )
}

