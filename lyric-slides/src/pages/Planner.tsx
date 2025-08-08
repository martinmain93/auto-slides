import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AppState, Song } from '../types'
import { demoLibrary } from '../types'
import { Button, TextInput, Group, Stack, Paper, Title, Anchor, Box, ScrollArea, Divider, Badge, Card, Text, AppShell } from '@mantine/core'

function useAppState() {
  const [state, setState] = useState<AppState>(() => {
    const recents = JSON.parse(localStorage.getItem('recents') || '[]') as string[]
    return {
      library: demoLibrary,
      recents,
      queue: [],
      currentSlideIndex: 0,
    }
  })

  useEffect(() => {
    localStorage.setItem('recents', JSON.stringify(state.recents))
  }, [state.recents])

  const addToQueue = (songId: string) =>
    setState(s => {
      if (s.queue.includes(songId)) {
        return { ...s, currentSongId: s.currentSongId ?? songId }
      }
      return {
        ...s,
        queue: [...s.queue, songId],
        currentSongId: s.currentSongId ?? songId,
      }
    })

  const addRecent = (songId: string) =>
    setState(s => ({ ...s, recents: [songId, ...s.recents.filter(id => id !== songId)].slice(0, 12) }))

  const selectSong = (songId: string) => setState(s => ({ ...s, currentSongId: songId, currentSlideIndex: 0 }))

  const removeFromQueue = (songId: string) =>
    setState(s => ({ ...s, queue: s.queue.filter(id => id !== songId), currentSongId: s.currentSongId === songId ? undefined : s.currentSongId }))

  const nextSlide = () =>
    setState(s => {
      const song = s.library.find(x => x.id === s.currentSongId)
      if (!song) return s
      const next = Math.min(s.currentSlideIndex + 1, song.slides.length - 1)
      return { ...s, currentSlideIndex: next }
    })

  const prevSlide = () =>
    setState(s => ({ ...s, currentSlideIndex: Math.max(0, s.currentSlideIndex - 1) }))

  const moveNextSong = () =>
    setState(s => {
      if (!s.currentSongId) return s
      const idx = s.queue.indexOf(s.currentSongId)
      const nextSongId = s.queue[idx + 1]
      if (!nextSongId) return s
      return { ...s, currentSongId: nextSongId, currentSlideIndex: 0 }
    })

  return { state, setState, addToQueue, addRecent, selectSong, removeFromQueue, nextSlide, prevSlide, moveNextSong }
}

function SongSearch({ library, onPick, selectedIds }: { library: Song[]; onPick: (song: Song) => void; selectedIds: string[] }) {
  const [q, setQ] = useState('')
  const results = useMemo(() => library.filter(s => s.title.toLowerCase().includes(q.toLowerCase())), [library, q])
  const handlePick = (s: Song) => {
    if (selectedIds.includes(s.id)) return
    onPick(s)
    setQ('')
  }
  return (
    <Stack gap="xs" style={{ position: 'relative' }}>
      <TextInput
        value={q}
        onChange={e => setQ(e.currentTarget.value)}
        placeholder="Search songs..."
        label="What songs are we singing today?"
        data-autofocus
      />
      {q && (
        <Paper withBorder shadow="sm" radius="md" style={{ position: 'absolute', top: 70, left: 0, right: 0, zIndex: 10, maxHeight: 240, overflow: 'auto' }}>
          <Stack gap={0}>
            {results.map(s => {
              const added = selectedIds.includes(s.id)
              return (
                <Group key={s.id} justify="space-between" p="sm" style={{ cursor: added ? 'not-allowed' : 'pointer', opacity: added ? 0.5 : 1 }} onClick={() => handlePick(s)} aria-disabled={added}>
                  <span>{s.title}</span>
                  {added && <Badge size="xs" variant="light">Added</Badge>}
                </Group>
              )
            })}
            {results.length === 0 && <Box p="sm" style={{ opacity: 0.7 }}>No matches</Box>}
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}

export default function Planner() {
  const navigate = useNavigate()
  const { state, addToQueue, addRecent, selectSong, removeFromQueue } = useAppState()
  const currentSong = state.library.find(s => s.id === state.currentSongId)

  const onPick = (song: Song) => {
    addToQueue(song.id)
    addRecent(song.id)
    selectSong(song.id)
  }

  return (
    <AppShell padding="md" withBorder={false} navbar={{ width: 320, breakpoint: 'sm' }}>
      <AppShell.Navbar p="md">
      <Paper withBorder p="md" radius={0} style={{ borderRight: '1px solid var(--mantine-color-dark-5)', background: 'var(--mantine-color-dark-8)' }}>
        <Button fullWidth size="md" onClick={() => navigate('/present')}>
          Start Presentation
        </Button>
        <Title order={3} mt="md">Queue</Title>
        <Stack gap="xs" mt="xs">
          {state.queue.map(id => {
            const s = state.library.find(x => x.id === id)!
            const selected = id === state.currentSongId
            return (
              <Group key={id} gap="xs" align="center">
                <Button variant={selected ? 'light' : 'filled'} color={selected ? 'dark' : 'gray'} style={{ flex: 1 }} onClick={() => selectSong(id)}>
                  {s.title}
                </Button>
                <Button variant="light" color="red" aria-label="remove" onClick={() => removeFromQueue(id)}>
                  ×
                </Button>
              </Group>
            )
          })}
          {state.queue.length === 0 && <Box style={{ opacity: 0.7 }}>No songs yet</Box>}
        </Stack>
      </Paper>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box p="md" style={{ position: 'relative' }}>
        <Box style={{ position: 'relative' }}>
          <SongSearch library={state.library} onPick={onPick} selectedIds={state.queue} />
        </Box>

        <Box mt="md">
          <Title order={3}>Recently picked</Title>
          <Box mt="xs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {state.recents.filter(id => !state.queue.includes(id)).map(id => {
              const s = state.library.find(x => x.id === id)!
              return (
                <Card key={id} withBorder radius="md" p="sm" style={{ cursor: 'pointer' }} onClick={() => onPick(s)}>
                  <Text fw={600}>{s.title}</Text>
                </Card>
              )
            })}
            {state.recents.filter((id) => !state.queue.includes(id)).length === 0 && (
              <Box style={{ opacity: 0.7 }}>No recents yet. Search to add some.</Box>
            )}
          </Box>
        </Box>

        <Divider my="md" />

        <Box>
          <Title order={3}>Song editor (skeleton)</Title>
          {currentSong ? (
            <Box mt="sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Paper withBorder p="sm" radius="md">
                <Title order={4} mt={0}>{currentSong.title}</Title>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {currentSong.slides.map((sl, i) => (
                    <li key={sl.id} style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                      <strong>Slide {i + 1}:</strong>
                      <div>{sl.text}</div>
                    </li>
                  ))}
                </ul>
              </Paper>
              <Paper withBorder p="sm" radius="md">
                <em>Editor controls will go here.</em>
              </Paper>
            </Box>
          ) : (
            <Box style={{ opacity: 0.7 }}>Select a song from the queue to edit.</Box>
          )}
        </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}

