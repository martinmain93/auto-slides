import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@mantine/core/styles.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Splash from './pages/Splash'
import Planner from './pages/Planner'
import Presentation from './pages/Presentation'
import PresentationView from './pages/PresentationView'
import SongEditor from './pages/SongEditor'
import { MantineProvider } from '@mantine/core'
import { AppStateProvider } from './state/AppStateContext'

const router = createBrowserRouter([
  { path: '/', element: <Splash /> },
  { path: '/plan', element: <Planner /> },
  { path: '/present', element: <Presentation /> },
  { path: '/presentation-view', element: <PresentationView /> },
  { path: '/edit', element: <SongEditor /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider
      defaultColorScheme="dark"
      theme={{
        fontFamily: 'Outfit, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
        headings: { fontFamily: 'Outfit, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", sans-serif' },
      }}
    >
      <AppStateProvider>
        <RouterProvider router={router} />
      </AppStateProvider>
    </MantineProvider>
  </StrictMode>,
)
