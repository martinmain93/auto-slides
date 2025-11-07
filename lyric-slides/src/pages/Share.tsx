import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Center, Loader, Stack, Title, Text, Button, Paper } from '@mantine/core'
import { fetchSharedSetlist } from '../lib/supabaseSync'
import { useAppState } from '../state/AppStateContext'

export default function ShareImport() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { importSharedSetlist } = useAppState()
  const importSharedSetlistRef = useRef(importSharedSetlist)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState<string>('Loading setlist...')

  useEffect(() => {
    importSharedSetlistRef.current = importSharedSetlist
  }, [importSharedSetlist])

  useEffect(() => {
    let cancelled = false

    async function importSetlist() {
      if (!code) {
        setStatus('error')
        setMessage('Missing share code.')
        return
      }

      const payload = await fetchSharedSetlist(code)

      if (cancelled) return

      if (!payload || !payload.songs || payload.songs.length === 0) {
        setStatus('error')
        setMessage('This share link is invalid or has expired.')
        return
      }

      try {
        await importSharedSetlistRef.current(payload)
        if (cancelled) return
        setStatus('success')
        setMessage('Setlist imported! Redirecting to planner...')
        setTimeout(() => {
          navigate('/plan', { replace: true })
        }, 1200)
      } catch (error) {
        console.error('Failed to import shared setlist:', error)
        if (cancelled) return
        setStatus('error')
        setMessage('Unable to import this setlist. Please try again later.')
      }
    }

    importSetlist()

    return () => {
      cancelled = true
    }
  }, [code, navigate])

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder p="xl" radius="md" style={{ maxWidth: 420, width: '100%' }}>
        <Stack align="center" gap="md">
          <Title order={3}>Importing Setlist</Title>
          {status === 'loading' && <Loader />}
          <Text ta="center">{message}</Text>
          {status === 'error' && (
            <Button variant="light" onClick={() => navigate('/plan')}>
              Go to planner
            </Button>
          )}
        </Stack>
      </Paper>
    </Center>
  )
}
