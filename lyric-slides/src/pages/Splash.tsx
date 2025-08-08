import { useNavigate } from 'react-router-dom'
import { Button, Container, Stack, Text, Title, Center } from '@mantine/core'

export default function Splash() {
  const navigate = useNavigate()
  return (
    <Container size={560} mih="100dvh" style={{ position: 'relative' }}>
      <Center mih="100dvh">
        <Stack gap="sm" align="center">
          <Title order={1} size={56} ta="center">Auto Presenter</Title>
          <Text c="dimmed" ta="center">Plan, edit and present lyrics with ease.</Text>
          <Button size="lg" mt="sm" onClick={() => navigate('/plan')}>
            Let's Sing!
          </Button>
        </Stack>
      </Center>
      <Text size="sm" c="dimmed" style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center' }}>
        Made with <span role="img" aria-label="heart">❤️</span> by Martin — <a href="https://patreon.com/placeholder" target="_blank" rel="noreferrer">Support on Patreon</a>
      </Text>
    </Container>
  )
}

