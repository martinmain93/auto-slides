import { useNavigate } from 'react-router-dom'
import { Button, Container, Stack, Text, Title, Center } from '@mantine/core'
import { AuthButton } from '../components/AuthButton'

export default function Splash() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100dvh',
      width: '100vw',
      position: 'relative',
      backgroundImage: 'url(/star-background.jpg)',
      backgroundSize: '100% auto',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      <Container size={560} mih="100dvh" style={{ position: 'relative' }}>
      <Center mih="100dvh">
        <Stack gap="sm" align="center">
          <Title order={1} size={56} ta="center" c="white">Church Slides</Title>
          <Text c="white" ta="center">Plan, edit and present lyrics with ease.</Text>
          <Button size="xl" style={{ width: '180px', marginBottom: '10px'}} mt="sm" onClick={() => { void navigate('/plan') }}>
            Let's Sing!
          </Button>
          <AuthButton />
          <Text size="sm" c="white" opacity={0.7}>Sign in to sync your library and setlists</Text>
        </Stack>
      </Center>
      <Text size="sm" c="white" style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center' }}>
        <a href="https://patreon.com/placeholder" target="_blank" rel="noreferrer">Made with <span role="img" aria-label="heart">❤️</span> by Martin</a>
      </Text>
    </Container>
    </div>
  )
}

