import { useNavigate } from 'react-router-dom'
import { Button, Container, Stack, Text, Title, Center } from '@mantine/core'

export default function Splash() {
  const navigate = useNavigate()
  return (
    <Container size={560} mih="100dvh">
      <Center mih="100dvh">
        <Stack gap="sm" align="center">
          <Title order={1} size={56} ta="center">Lyric Slides</Title>
          <Text c="dimmed" ta="center">Plan, edit and present lyrics with ease.</Text>
          <Button size="lg" mt="sm" onClick={() => navigate('/plan')}>
            Get Started
          </Button>
        </Stack>
      </Center>
    </Container>
  )
}

