import { render } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom'
import { AppStateProvider } from '../src/state/AppStateContext'
import React from 'react'

export function renderWithProviders(
  ui: React.ReactElement,
  options?: { router?: Omit<MemoryRouterProps, 'children'> }
) {
  const routerProps: MemoryRouterProps = { initialEntries: ['/'], ...(options?.router || {}) }
  return render(
    <MantineProvider defaultColorScheme="dark">
      <AppStateProvider>
        <MemoryRouter {...routerProps}>{ui}</MemoryRouter>
      </AppStateProvider>
    </MantineProvider>
  )
}

