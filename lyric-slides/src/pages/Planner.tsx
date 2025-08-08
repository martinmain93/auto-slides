import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Song } from '../types'
import { Button, TextInput, Group, Stack, Paper, Title, Anchor, Box, ScrollArea, Divider, Badge, Card, Text, AppShell, FileButton, Modal } from '@mantine/core'
import { useAppState } from '../state/AppStateContext'

function SongSearch({ library, onPick, selectedIds }: { library: Song[]; onPick: (song: Song) => void; selectedIds: string[] }) {
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const base = useMemo(() => [...library].sort((a, b) => a.title.localeCompare(b.title)), [library])
  const results = useMemo(() => {
    if (focused && !q.trim()) return base.slice(0, 8)
    return base.filter(s => s.title.toLowerCase().includes(q.toLowerCase()))
  }, [base, q, focused])
  const handlePick = (s: Song) => {
    if (selectedIds.includes(s.id)) return
    onPick(s)
    setQ('')
  }
  return (
    <Stack gap="md" style={{ position: 'relative', marginTop: 32, marginBottom: 16 }}>
      <TextInput
        value={q}
        onChange={e => setQ(e.currentTarget.value)}
        placeholder="Search songs..."
        size="xl"
        label="What songs are we singing today?"
        labelProps={{ style: { fontSize: 24, marginBottom: 8 } }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 100)}
        data-autofocus
      />
      {(focused || q) && (
        <Paper withBorder shadow="md" radius="md" style={{ position: 'absolute', top: 94, left: 0, right: 0, zIndex: 10, maxHeight: 300, overflow: 'auto' }}>
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
  const { state, setState, addToQueue, addRecent, selectSong, removeFromQueue } = useAppState()
  const currentSong = state.library.find(s => s.id === state.currentSongId)

  const [importOpen, setImportOpen] = useState(false)
  const [importPreview, setImportPreview] = useState<Song[] | null>(null)

  const onPick = (song: Song) => {
    addToQueue(song.id)
    addRecent(song.id)
    selectSong(song.id)
  }

  const onImport = async (file: File) => {
    const text = await file.text()
    const { parseProPresenterExport } = await import('../importers/propresenter')
    const imported = parseProPresenterExport(text)
    setImportPreview(imported)
    setImportOpen(true)
  }

  const confirmImport = () => {
    if (!importPreview || importPreview.length === 0) {
      setImportOpen(false)
      setImportPreview(null)
      return
    }
    // Merge into library with basic id de-duplication
    const existingIds = new Set(state.library.map(s => s.id))
    const merged = importPreview.map(s => {
      let id = s.id
      while (existingIds.has(id)) id = `${id}-${Math.random().toString(36).slice(2,5)}`
      existingIds.add(id)
      return id === s.id ? s : { ...s, id }
    })
    setState(prev => ({ ...prev, library: [...merged, ...prev.library], recents: [...merged.map(x => x.id), ...prev.recents].slice(0, 12) }))
    setImportOpen(false)
    setImportPreview(null)
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
              <Group key={id} gap="xs" align="center" style={{ position: 'relative' }}>
                <Button
                  variant={selected ? 'light' : 'default'}
                  style={{ width: '100%', justifyContent: 'flex-start', border: selected ? '2px solid var(--mantine-color-blue-5)' : undefined }}
                  onClick={() => selectSong(id)}
                >
                  {s.title}
                </Button>
                <Button
                  variant="subtle"
                  color="gray"
                  size="compact-xs"
                  aria-label="remove"
                  onClick={() => removeFromQueue(id)}
                  style={{ position: 'absolute', top: 2, right: 2 }}
                >
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
        <Modal opened={importOpen} onClose={() => setImportOpen(false)} title="Import preview">
          {importPreview && importPreview.length > 0 ? (
            <Stack>
              <Text>Found {importPreview.length} songs. The first few:</Text>
              <Stack gap="xs" style={{ maxHeight: 280, overflow: 'auto' }}>
                {importPreview.slice(0, 8).map(s => (
                  <Paper key={s.id} withBorder p="xs">
                    <Text fw={600}>{s.title}</Text>
                    <Text size="sm" c="dimmed">{s.slides.length} slides</Text>
                  </Paper>
                ))}
              </Stack>
              <Group justify="flex-end">
                <Button variant="default" onClick={() => { setImportOpen(false); setImportPreview(null) }}>Cancel</Button>
                <Button onClick={confirmImport}>Import</Button>
              </Group>
            </Stack>
          ) : (
            <Text c="dimmed">No songs detected.</Text>
          )}
        </Modal>
        <Box p="md" style={{ position: 'relative' }}>
        <Box style={{ position: 'relative' }}>
          <Group justify="space-between" mb="sm">
            <SongSearch library={state.library} onPick={onPick} selectedIds={state.queue} />
            <FileButton onChange={file => file && onImport(file)} accept=".txt">
              {(props) => <Button {...props} variant="light">Import ProPresenter .txt</Button>}
            </FileButton>
          </Group>
        </Box>

        <Box mt="md">
          <Title order={3}>Recently picked</Title>
          <Box mt="xs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {state.recents.filter(id => !state.queue.includes(id)).map(id => {
              const s = state.library.find(x => x.id === id)!
return (
                <Card
                  key={id}
                  withBorder
                  radius="md"
                  p="sm"
                  style={{ cursor: 'pointer', transition: 'background-color 120ms ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-5)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                  onClick={() => onPick(s)}
                >
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

