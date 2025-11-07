import { Button, Menu, Avatar, Text } from '@mantine/core'
import { useAuth } from '../state/AuthContext'

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.204c0-.638-.057-1.252-.163-1.84H9v3.481h4.844a4.137 4.137 0 0 1-1.796 2.714v2.258h2.908c1.703-1.568 2.684-3.877 2.684-6.613z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.183l-2.908-2.258c-.806.54-1.837.859-3.048.859-2.345 0-4.33-1.584-5.036-3.711H.973v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707a5.41 5.41 0 0 1-.283-1.707c0-.593.103-1.168.283-1.707V4.961H.973A8.997 8.997 0 0 0 0 9c0 1.457.348 2.836.973 4.039l2.991-2.332z" />
      <path fill="#EA4335" d="M9 3.579c1.321 0 2.507.454 3.441 1.346l2.582-2.582C13.463.883 11.426 0 9 0A8.997 8.997 0 0 0 .973 4.961l2.991 2.332C4.67 5.784 6.655 4.2 9 4.2z" />
    </svg>
  )
}

export function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()

  if (loading) {
    return <Button variant="light" disabled>Loading...</Button>
  }

  if (user) {
    return (
      <Menu shadow="md" width={220}>
        <Menu.Target>
          <Button
            variant="white"
            color="dark"
            leftSection={<Avatar size="sm" radius="xl" />}
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
          >
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
    <Button
      variant="white"
      color="dark"
      leftSection={<GoogleIcon />}
      onClick={() => void signInWithGoogle()}
      style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)', width: '193px' }}
    >
      Sign in with Google
    </Button>
  )
}

