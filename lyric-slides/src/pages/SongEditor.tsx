import { useMemo, useRef, useState, useEffect } from 'react'
import { Box, Button, Group, Stack, Text, Textarea, TextInput, Title, Paper, ScrollArea } from '@mantine/core'
import { useAppState } from '../state/AppStateContext'
import type { Song, SongSection } from '../types'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { sectionLabel, sectionToColor } from '../utils/sections'

type DraftSlide = { text: string; section?: SongSection }

export default function SongEditor() {
  const { state, upsertSong, selectSong, enqueue } = useAppState()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isNew = searchParams.get('new') !== null
  const existing = !isNew && state.currentSongId ? state.library.find(s => s.id === state.currentSongId) : undefined

  const [title, setTitle] = useState(existing?.title ?? '')
  const titleRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => { titleRef.current?.focus() }, [])
  const [content, setContent] = useState(existing ? existing.slides.map(s => s.text).join('\n\n') : '')
  const [credits, setCredits] = useState(existing?.credits ?? '')

  const slides: DraftSlide[] = useMemo(() => {
    const blocks = content.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
    const detect = (line: string): SongSection | undefined => {
      const l = line.toLowerCase().replace(/[^a-z\- ]+/g, '').trim()
      if (/^verse(\s*\d+)?$/.test(l)) return 'verse'
      if (/^chorus(\s*\d+)?$/.test(l)) return 'chorus'
      if (/^pre[- ]?chorus(\s*\d+)?$/.test(l)) return 'pre-chorus'
      if (/^bridge(\s*\d+)?$/.test(l)) return 'bridge'
      if (/^intro$/.test(l)) return 'intro'
      if (/^outro$/.test(l)) return 'outro'
      if (/^tag$/.test(l)) return 'tag'
      if (/^(instrumental|interlude)$/.test(l)) return 'instrumental'
      return undefined
    }
    return blocks.map((block) => {
      const lines = block.split('\n')
      const maybe = detect(lines[0])
      if (maybe) {
        const text = lines.slice(1).join('\n').trim() || block
        return { text, section: maybe }
      }
      return { text: block }
    })
  }, [content])

  const save = () => {
    const id = existing?.id ?? (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `song-${Math.random().toString(36).slice(2,6)}`)
    const song: Song = {
      id,
      title: title || 'Untitled Song',
      slides: slides.map((s, i) => ({ id: `${id}-${i+1}`, text: s.text, section: s.section })),
      credits: credits.trim() || undefined,
    }
    upsertSong(song)
    selectSong(song.id)
    if (!existing) enqueue(song.id)
    void navigate('/plan')
  }

  return (
    <Box p="md" style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12, height: '100dvh' }}>
      <Paper withBorder p="md" radius="md" style={{ fontSize: 16, height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr auto', gap: 12 }}>
        <Group justify="space-between">
          Button variant="default" onClick={() => { void navigate('/plan') }}Back/Button
          <Button onClick={save}>Save</Button>
        </Group>

        <div>
          <TextInput ref={titleRef} size="lg" value={title} onChange={e => setTitle(e.currentTarget.value)} label="Title" placeholder="Song title" labelProps={{ style: { fontSize: 16 } }} />
          <Text size="sm" c="dimmed">Enter the song title</Text>
        </div>

        <Box style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Text size="sm" fw={600} mb={4}>Content</Text>
          <Textarea
            size="md"
            value={content}
            onChange={e => setContent(e.currentTarget.value)}
            placeholder="Lyrics..."
            autosize={false}
            styles={{ root: { flex: 1, display: 'flex' }, wrapper: { flex: 1 }, input: { height: '100%', overflow: 'auto', resize: 'none' } }}
          />
          <Text size="sm" c="dimmed" mt={4}>Slides for the song are separated by a blank line (two newlines)</Text>
        </Box>

        <Box>
          <Text size="sm" fw={600} mb={4}>Credits</Text>
          <Textarea
            size="md"
            value={credits}
            onChange={e => setCredits(e.currentTarget.value)}
            placeholder="Authors, copyright..."
            autosize={false}
            styles={{ input: { height: 72, overflow: 'auto', resize: 'none' } }}
          />
          <Text size="sm" c="dimmed" mt={4}>Credits are shown on slides in small text</Text>
        </Box>
      </Paper>

      <Paper withBorder p="sm" radius="md" style={{ overflow: 'hidden', height: '100%' }}>
        <Title order={5} ta="center" mb="xs">Preview</Title>
        <ScrollArea h={600} type="hover">
          <Stack gap="sm">
            {slides.length === 0 ? (
              <Text c="dimmed" ta="center">No slides yet</Text>
            ) : (
              slides.map((s, i) => {
                const text = s.text
                const section = s.section
                const color = sectionToColor(section)
                const border = `4px solid var(--mantine-color-${color}-4)`
                return (
                  <Box key={i} style={{ background: 'black', color: 'white', borderRadius: 6, width: '100%', height: 112, position: 'relative', overflow: 'hidden', borderTop: border }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                      <div style={{ fontSize: 14, lineHeight: 1.2, whiteSpace: 'pre-wrap', textAlign: 'center', fontWeight: 700, fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', padding: 6 }}>{text}</div>
                    </div>
                    {credits && <div style={{ position: 'absolute', right: 6, bottom: 4, fontSize: 10, opacity: 0.7 }}>{credits}</div>}
                    {section && (
                      <div style={{ position: 'absolute', left: 0, right: 0, top: 2, textAlign: 'center', fontSize: 10, opacity: 0.6 }}>
                        {sectionLabel(section)}
                      </div>
                    )}
                  </Box>
                )
              })
            )}
          </Stack>
        </ScrollArea>
      </Paper>
    </Box>
  )
}

