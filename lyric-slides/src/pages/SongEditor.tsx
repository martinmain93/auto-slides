import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react'
import { Box, Button, Group, Stack, Text, Textarea, TextInput, Title, Paper, ScrollArea } from '@mantine/core'
import { useAppState } from '../state/AppStateContext'
import type { Song, SongSection } from '../types'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { sectionLabel, sectionToColor } from '../utils/sections'
import { estimateSlideFit } from '../utils/fit'

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

  // Textarea and gutter syncing
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const gutterRef = useRef<HTMLDivElement | null>(null)
  const [taSizes, setTaSizes] = useState<{ scrollHeight: number; clientHeight: number }>({ scrollHeight: 0, clientHeight: 0 })
  const [scrollTop, setScrollTop] = useState(0)

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

  // Compute gutter mapping: per-slide line counts and variable gaps based on actual blank lines between slides
  const gutterMap = useMemo(() => {
    const normalized = content.replace(/\r\n?/g, '\n')
    const parts = normalized.split(/(\n{2,})/)
    const blocks: string[] = []
    const gaps: number[] = []
    for (let i = 0; i < parts.length; i += 2) {
      const raw = (parts[i] || '').trim()
      const sep = parts[i + 1] || ''
      if (!raw) continue
      blocks.push(raw)
      if (sep) {
        const nl = (sep.match(/\n/g) || []).length
        const blankLines = Math.max(1, nl - 1)
        gaps.push(blankLines)
      }
    }
    const lineCounts = blocks.map((b) => Math.max(1, b.split('\n').length))
    // Ensure gaps aligns to blocks - 1
    if (gaps.length > lineCounts.length - 1) gaps.length = lineCounts.length - 1
    return { lineCounts, gaps }
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

  // keep gutter in sync with textarea scrolling and size
  useLayoutEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    const update = () => setTaSizes({ scrollHeight: ta.scrollHeight, clientHeight: ta.clientHeight })
    update()
    const onScroll = () => {
      setScrollTop(ta.scrollTop)
      if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop
    }
    ta.addEventListener('scroll', onScroll)
    window.addEventListener('resize', update)
    const id = window.setInterval(update, 250)
    return () => {
      ta.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      window.clearInterval(id)
    }
  }, [content])

  return (
    <Box p="md" style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12, height: '100dvh' }}>
      <Paper withBorder p="md" radius="md" style={{ fontSize: 16, height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr auto', gap: 12 }}>
        <Group justify="space-between">
          <Button variant="default" onClick={() => { void navigate('/plan') }}>Back</Button>
          <Button onClick={save}>Save</Button>
        </Group>

        <div>
          <TextInput ref={titleRef} size="lg" value={title} onChange={e => setTitle(e.currentTarget.value)} label="Title" placeholder="Song title" labelProps={{ style: { fontSize: 16 } }} />
          <Text size="sm" c="dimmed">Enter the song title</Text>
        </div>

        <Box style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Text size="sm" fw={600} mb={4}>Content</Text>
          <div style={{ position: 'relative', display: 'flex', minHeight: 0, alignItems: 'stretch' }}>
            {/* Fit indicator gutter viewport (scrolls with the textarea) */}
            <div
              ref={gutterRef}
              style={{
                width: 10,
                marginRight: 8,
                borderRadius: 6,
                overflowY: 'auto',
                overflowX: 'hidden',
                background: 'transparent',
                height: taSizes.clientHeight || 0,
                scrollbarWidth: 'none',
              }}
              className="hide-scrollbar"
              aria-hidden={true}
            >
              {/* Gutter content sized to textarea scrollHeight */}
              <div style={{ paddingTop: 2, paddingBottom: 2 }}>
                {(() => {
                  const { lineCounts, gaps } = gutterMap
                  const totalUnits = lineCounts.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0)
                  const pxPerUnit = taSizes.scrollHeight / Math.max(1, totalUnits)
                  const items: React.ReactNode[] = []
                  for (let i = 0; i < lineCounts.length; i++) {
                    const fit = estimateSlideFit(slides[i]?.text || '')
                    const color = fit === 'green' ? 'green' : fit === 'orange' ? 'orange' : 'red'
                    const segH = Math.max(10, Math.round(lineCounts[i] * pxPerUnit))
                    items.push(
                      <div
                        key={`seg-${i}`}
                        style={{
                          height: segH,
                          width: '100%',
                          backgroundColor: `var(--mantine-color-${color}-5)`,
                          borderRadius: 999,
                        }}
                      />,
                    )
                    if (i < gaps.length) {
                      const gapH = Math.max(6, Math.round(gaps[i] * pxPerUnit))
                      items.push(<div key={`gap-${i}`} style={{ height: gapH, width: '100%' }} />)
                    }
                  }
                  return items
                })()}
              </div>
            </div>
            {/* Text area */}
            <Textarea
              size="md"
              value={content}
              onChange={e => setContent(e.currentTarget.value)}
              placeholder="Lyrics..."
              autosize={false}
              ref={textareaRef}
              styles={{
                root: { flex: 1, display: 'flex' },
                wrapper: { flex: 1, display: 'flex' },
                input: { flex: 1, minHeight: 240, height: '60vh', overflow: 'auto', resize: 'none' },
              }}
            />
          </div>
          <Text size="sm" c="dimmed" mt={4}>Slides for the song are separated by a blank line (two newlines). Green/Orange/Red bars next to sections indicate how well the text will fit onto a page. We recommend splitting orange and red sections into more slides</Text>
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
                    {credits && (
                      <div style={{ position: 'absolute', right: 6, bottom: 4, fontSize: 10, opacity: 0.7 }}>{credits}</div>
                    )}
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

