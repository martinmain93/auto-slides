import { Button, Menu, Avatar, Text } from '@mantine/core'
import { useAuth } from '../state/AuthContext'

export function AuthButton() {
  const { user, loading, signInWithGoogle, signInWithApple, signOut } = useAuth()

  if (loading) {
    return <Button loading>Loading...</Button>
  }

  if (user) {
    return (
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" leftSection={<Avatar size="sm" radius="xl" />}>
            {user.email || user.user_metadata?.name || 'Account'}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>
            <Text size="sm" c="dimmed">
              {user.email}
            </Text>
          </Menu.Label>
          <Menu.Divider />
          <Menu.Item onClick={signOut} color="red">
            Sign out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    )
  }

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <Button>Sign in</Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Sign in with</Menu.Label>
        <Menu.Item onClick={signInWithGoogle}>Google</Menu.Item>
        <Menu.Item onClick={signInWithApple}>Apple</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

