import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Song } from '../types'
import { Button, TextInput, Group, Stack, Paper, Title, Anchor, Box, ScrollArea, Divider, Badge, Card, Text, AppShell, FileButton, Modal } from '@mantine/core'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppState } from '../state/AppStateContext'
import SlidePreview from '../components/SlidePreview'

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
        label="What are we singing today?"
        labelProps={{ style: { fontSize: 24, marginBottom: 8 } }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 100)}
        data-autofocus
        styles={{ input: { backgroundColor: 'white', color: 'black' }, root: { width: '60vw', maxWidth: '900px' } }}
      />
      {(focused || q) && (
        <Paper withBorder shadow="md" radius="md" style={{ position: 'absolute', top: 104, left: 0, right: 0, zIndex: 10, maxHeight: 300, overflow: 'auto' }}>
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

type SortableQueueItemProps = {
  id: string
  title: string
  selected: boolean
  onSelect: () => void
  onRemove: () => void
}

function SortableQueueItem({ id, title, selected, onSelect, onRemove }: SortableQueueItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: 'relative',
  }
  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Button
        variant={selected ? 'light' : 'default'}
        style={{ width: '100%', justifyContent: 'flex-start', border: selected ? '2px solid var(--mantine-color-blue-5)' : undefined }}
        onClick={onSelect}
      >
        {title}
      </Button>
      <Button
        variant="filled"
        color="gray"
        size="compact-sm"
        aria-label="remove"
        onClick={onRemove}
        style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 999, padding: 0, lineHeight: 1, display: 'grid', placeItems: 'center' }}
      >
        ×
      </Button>
    </Box>
  )
}

export default function Planner() {
  const navigate = useNavigate()
  const { state, setState, addToQueue, addRecent, selectSong, removeFromQueue, clearQueue } = useAppState()
  const currentSong = state.library.find(s => s.id === state.currentSongId)

  const [importOpen, setImportOpen] = useState(false)
  const [importPreview, setImportPreview] = useState<Song[] | null>(null)

  // dnd-kit sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setState(s => {
      const oldIndex = s.queue.indexOf(String(active.id))
      const newIndex = s.queue.indexOf(String(over.id))
      if (oldIndex === -1 || newIndex === -1) return s
      return { ...s, queue: arrayMove(s.queue, oldIndex, newIndex) }
    })
  }

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
        <Group justify="space-between" mt="md" mb="xs">
          <Title order={3} m={0}>Queue</Title>
          <Button size="xs" variant="subtle" color="gray" onClick={() => clearQueue()} disabled={state.queue.length === 0}>Clear</Button>
        </Group>
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <SortableContext items={state.queue} strategy={verticalListSortingStrategy}>
            <Stack gap="xs">
              {state.queue.map((id) => (
                <SortableQueueItem
                  key={id}
                  id={id}
                  title={state.library.find(x => x.id === id)?.title || id}
                  selected={id === state.currentSongId}
                  onSelect={() => selectSong(id)}
                  onRemove={() => removeFromQueue(id)}
                />
              ))}
              {state.queue.length === 0 && <Box style={{ opacity: 0.7 }}>No songs yet</Box>}
            </Stack>
          </SortableContext>
        </DndContext>
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
            <Stack gap={6} align="end">
              <FileButton onChange={file => file && onImport(file)} accept=".txt">
                {(props) => <Button {...props} variant="light">Import ProPresenter .txt</Button>}
              </FileButton>
              <Button variant="default" onClick={() => navigate('/edit?new=1')}>Add New Song</Button>
            </Stack>
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
          <Group justify="space-between">
            <Title order={3}>Song Preview</Title>
            <Button variant="default" onClick={() => navigate('/edit')} disabled={!currentSong}>Edit Song</Button>
          </Group>
          {currentSong ? (
            <Box mt="sm">
              <ScrollArea type="hover">
                <Group wrap="nowrap" gap="sm" pr="sm" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
{currentSong.slides.map((sl, i) => {
                    const section = sl.section
                    const color = section === 'chorus' ? 'grape' : section === 'verse' ? 'blue' : section === 'bridge' ? 'teal' : section === 'pre-chorus' ? 'cyan' : section === 'instrumental' ? 'green' : section === 'tag' ? 'pink' : section === 'intro' ? 'yellow' : section === 'outro' ? 'orange' : 'gray'
                    const border = `4px solid var(--mantine-color-${color}-4)`
                    return (
                      <Box key={sl.id} style={{ background: 'black', color: 'white', borderRadius: 6, width: 250, height: 160, position: 'relative', overflow: 'hidden', borderTop: border, flex: '0 0 auto' }}>
                        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                          <div style={{ fontSize: 14, lineHeight: 1.2, whiteSpace: 'pre-wrap', textAlign: 'center', fontWeight: 700, fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', padding: 6 }}>{sl.text}</div>
                        </div>
                        {currentSong.credits && (
                          <div style={{ position: 'absolute', right: 6, bottom: 4, fontSize: 10, opacity: 0.7 }}>{currentSong.credits}</div>
                        )}
                        {section && (
                          <div style={{ position: 'absolute', left: 0, right: 0, top: 2, textAlign: 'center', fontSize: 10, opacity: 0.6 }}>
                            {section.charAt(0).toUpperCase() + section.slice(1)}
                          </div>
                        )}
                      </Box>
                    )
                  })}
                </Group>
              </ScrollArea>
            </Box>
          ) : (
            <Box style={{ opacity: 0.7 }}>Select a song from the queue to preview.</Box>
          )}
        </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}

