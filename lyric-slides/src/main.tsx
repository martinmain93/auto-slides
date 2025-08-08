import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@mantine/core/styles.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Splash from './pages/Splash'
import Planner from './pages/Planner'
import Presentation from './pages/Presentation'
import { MantineProvider } from '@mantine/core'

const router = createBrowserRouter([
  { path: '/', element: <Splash /> },
  { path: '/plan', element: <Planner /> },
  { path: '/present', element: <Presentation /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="dark">
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
)
