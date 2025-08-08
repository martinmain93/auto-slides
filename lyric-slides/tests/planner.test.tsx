import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Planner from '../src/pages/Planner'
import { renderWithProviders } from './test-utils'


describe('Planner', () => {
  it('allows searching, adding to queue, and clearing', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Planner />, { router: { initialEntries: ['/plan'] } })

    const search = screen.getByLabelText(/what are we singing today\?/i)
    await user.click(search)
    await user.type(search, 'a')

    // Pick a known demo song from results
    const option = await screen.findByText('Amazing Grace')
    await user.click(option)

    const clearBtn = screen.getByRole('button', { name: /clear/i })
    await user.click(clearBtn)

    expect(screen.getByText(/no songs yet/i)).toBeInTheDocument()
  })
})

