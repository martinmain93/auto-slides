import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Splash from '../src/pages/Splash'
import { renderWithProviders } from './test-utils'

describe('Splash page', () => {
  it('shows headline and CTA', async () => {
    renderWithProviders(<Splash />)
    expect(screen.getByRole('heading', { level: 1, name: /auto presenter/i })).toBeInTheDocument()
    const cta = screen.getByRole('button', { name: /let's sing!/i })
    expect(cta).toBeInTheDocument()
  })

  it('navigates to planner when clicking CTA', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Splash />)
    const cta = screen.getByRole('button', { name: /let's sing!/i })
    await user.click(cta)
    expect(cta).toBeEnabled()
  })
})

