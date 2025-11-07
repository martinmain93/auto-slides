import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Song } from '../types'
import { Button, TextInput, Group, Stack, Paper, Title, Box, ScrollArea, Divider, Badge, Card, Text, AppShell, FileButton, Modal, Menu, ActionIcon, CopyButton, Loader, Alert, Center } from '@mantine/core'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppState } from '../state/AppStateContext'
import { sectionToColor } from '../utils/sections'
import { AuthButton } from '../components/AuthButton'
import { useAuth } from '../state/AuthContext'
import { createSharedSetlist } from '../lib/supabaseSync'

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
        style={{ position: 'absolute', top: -6, right: 5, width: 22, height: 22, borderRadius: 999, padding: 0, lineHeight: 1, display: 'grid', placeItems: 'center' }}
      >
        ×
      </Button>
    </Box>
  )
}

const LoadIcon = () => <span aria-hidden="true" style={{ fontSize: 12 }}>▶</span>
const ShareIcon = () => <span aria-hidden="true" style={{ fontSize: 12 }}>🔗</span>
const DeleteIcon = () => <span aria-hidden="true" style={{ fontSize: 12 }}>🗑</span>

export default function Planner() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state, setState, addToQueue, addRecent, selectSong, removeFromQueue, clearQueue, upsertSong, createSetlist, loadSetlist, deleteSetlist } = useAppState()
  const currentSong = state.library.find(s => s.id === state.currentSongId)

  const [importOpen, setImportOpen] = useState(false)
  const [importPreview, setImportPreview] = useState<Song[] | null>(null)
  const [saveSetlistOpen, setSaveSetlistOpen] = useState(false)
  const [setlistLabel, setSetlistLabel] = useState('')
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

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
    
    // Use upsertSong to ensure songs are saved to Supabase and update library state
    merged.forEach(song => {
      upsertSong(song)
    })
    
    // Update recents (library is already updated by upsertSong)
    setState(prev => ({ 
      ...prev, 
      recents: [...merged.map(x => x.id), ...prev.recents.filter(id => !merged.some(s => s.id === id))].slice(0, 12) 
    }))
    
    setImportOpen(false)
    setImportPreview(null)
  }

  const resetShareModal = () => {
    setShareModalOpen(false)
    setShareLink(null)
    setShareError(null)
    setShareLoading(false)
  }

  const handleShare = async (setlistId: string) => {
    const target = state.setlists.find((sl) => sl.id === setlistId)
    if (!target) return

    if (!user) {
      alert('Sign in to share setlists.')
      return
    }

    const songs = target.songIds
      .map((id) => state.library.find((song) => song.id === id))
      .filter((song): song is Song => Boolean(song))

    if (songs.length !== target.songIds.length) {
      alert('Some songs in this setlist are missing from your library. Please ensure all songs exist before sharing.')
      return
    }

    setShareModalOpen(true)
    setShareLoading(true)
    setShareError(null)
    setShareLink(null)

    try {
      const code = await createSharedSetlist(user.id, target, songs)
      const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : ''
      setShareLink(`${origin}/share/${code}`)
    } catch (error) {
      console.error('Failed to create share link:', error)
      setShareError('Unable to create share link. Please try again.')
    } finally {
      setShareLoading(false)
    }
  }
 
  return (
    <AppShell padding="md" withBorder={false} navbar={{ width: 320, breakpoint: 'sm' }}>
      <AppShell.Navbar p="md">
      <Paper withBorder p="md" radius={0} style={{ borderRight: '1px solid var(--mantine-color-dark-5)', background: 'var(--mantine-color-dark-8)', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Button fullWidth size="md" onClick={() => { void navigate('/present') }}>
          Start Presentation
        </Button>
        
        <Group justify="space-between" mt="md" mb="xs">
          <Title order={3} m={0}>Queue</Title>
          <Button size="xs" variant="subtle" color="gray" onClick={() => clearQueue()} disabled={state.queue.length === 0}>Clear</Button>
        </Group>
        <ScrollArea flex={1} style={{ minHeight: 0 }}>
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
        </ScrollArea>
        
        <Divider my="md" />
        
        <Group justify="space-between" mb="xs">
          <Title order={4} m={0}>Saved Setlists</Title>
          <Button 
            size="xs" 
            variant="light" 
            onClick={() => {
              if (state.queue.length === 0) {
                alert('Queue is empty. Add some songs to create a setlist.')
                return
              }
              setSaveSetlistOpen(true)
            }}
            disabled={state.queue.length === 0}
          >
            Save Current
          </Button>
        </Group>
        <ScrollArea flex={1} style={{ minHeight: 0 }}>
          <Stack gap="xs">
            {state.setlists.length === 0 ? (
              <Text size="sm" c="dimmed" style={{ opacity: 0.7 }}>No saved setlists</Text>
            ) : (
              state.setlists.map((setlist) => (
                <Card key={setlist.id} withBorder p="xs" radius="sm">
                  <Group justify="space-between" gap="xs">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>{setlist.label}</Text>
                      <Text size="xs" c="dimmed">
                        {setlist.songIds.length} song{setlist.songIds.length !== 1 ? 's' : ''} • {new Date(setlist.createdAt).toLocaleDateString()}
                      </Text>
                    </Box>
                    <Menu shadow="md" width={150}>
                      <Menu.Target>
                        <ActionIcon variant="subtle" size="sm">
                          ⋮
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<LoadIcon />} onClick={() => loadSetlist(setlist.id)}>Load</Menu.Item>
                        <Menu.Item leftSection={<ShareIcon />} onClick={() => handleShare(setlist.id)}>Share</Menu.Item>
                        <Menu.Item
                          leftSection={<DeleteIcon />}
                          onClick={() => {
                            if (confirm(`Delete "${setlist.label}"?`)) {
                              deleteSetlist(setlist.id)
                            }
                          }}
                          color="red"
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Card>
              ))
            )}
          </Stack>
        </ScrollArea>
      </Paper>
      </AppShell.Navbar>

      <AppShell.Main>
        <Modal opened={saveSetlistOpen} onClose={() => { setSaveSetlistOpen(false); setSetlistLabel('') }} title="Save Setlist">
          <Stack>
            <TextInput
              label="Setlist Name"
              placeholder="e.g., Sunday Morning Service"
              value={setlistLabel}
              onChange={(e) => setSetlistLabel(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && setlistLabel.trim()) {
                  createSetlist(setlistLabel.trim())
                  setSaveSetlistOpen(false)
                  setSetlistLabel('')
                }
              }}
              data-autofocus
            />
            <Text size="sm" c="dimmed">
              This will save {state.queue.length} song{state.queue.length !== 1 ? 's' : ''} from your current queue.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => { setSaveSetlistOpen(false); setSetlistLabel('') }}>Cancel</Button>
              <Button onClick={() => {
                if (setlistLabel.trim()) {
                  createSetlist(setlistLabel.trim())
                  setSaveSetlistOpen(false)
                  setSetlistLabel('')
                }
              }} disabled={!setlistLabel.trim()}>Save</Button>
            </Group>
          </Stack>
        </Modal>

        <Modal opened={shareModalOpen} onClose={resetShareModal} title="Share Setlist">
          <Stack gap="sm">
            {shareLoading ? (
              <Center>
                <Loader size="sm" />
              </Center>
            ) : shareError ? (
              <Alert color="red" variant="light">
                {shareError}
              </Alert>
            ) : shareLink ? (
              <Stack gap="xs">
                <Text size="sm">Share this link:</Text>
                <Group gap="xs" align="center" wrap="nowrap">
                  <TextInput value={shareLink} readOnly style={{ flex: 1 }} />
                  <CopyButton value={shareLink} timeout={2000}>
                    {({ copied, copy }) => (
                      <Button variant={copied ? 'light' : 'filled'} color={copied ? 'teal' : 'blue'} onClick={copy}>
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    )}
                  </CopyButton>
                </Group>
                <Text size="xs" c="dimmed">
                  Anyone with the link can import this setlist.
                </Text>
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">Generating share link...</Text>
            )}
            {!shareLoading && !shareError && shareLink && (
              <Button variant="light" onClick={() => window.open(shareLink, '_blank')}>
                Open link
              </Button>
            )}
          </Stack>
        </Modal>
        
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
          <Group justify="space-between" mb="sm" align="flex-start">
            <SongSearch library={state.library} onPick={onPick} selectedIds={state.queue} />
            <Stack gap="md" align="end">
              <AuthButton />
              <Stack gap={4} align="end">
                <FileButton onChange={file => { if (file) void onImport(file) }} accept=".txt">
                  {(props) => <Button {...props} variant="light">Import ProPresenter .txt</Button>}
                </FileButton>
                <Button variant="default" style={{ width: '193px', marginTop: '10px' }} onClick={() => { void navigate('/edit?new=1') }}>Add New Song</Button>
              </Stack>
            </Stack>
          </Group>
        </Box>

        <Box mt="md">
          <Title order={3}>Recently picked</Title>
          <Box mt="xs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {state.recents
              .filter(id => !state.queue.includes(id))
              .map(id => {
                const s = state.library.find(x => x.id === id)
                if (!s) return null // Skip if song doesn't exist
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
              })
              .filter(Boolean)}
            {state.recents.filter((id) => !state.queue.includes(id)).length === 0 && (
              <Box style={{ opacity: 0.7 }}>No recents yet. Search to add some.</Box>
            )}
          </Box>
        </Box>

        <Divider my="md" />

        <Box>
          <Group justify="space-between">
            <Title order={3}>Song Preview</Title>
            <Button variant="default" onClick={() => { void navigate('/edit') }} disabled={!currentSong}>Edit Song</Button>
          </Group>
          {currentSong ? (
            <Box mt="sm">
              <ScrollArea type="hover">
                <Group wrap="nowrap" gap="sm" pr="sm" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
{currentSong.slides.map((sl) => {
                    const section = sl.section
                    const color = sectionToColor(section)
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

