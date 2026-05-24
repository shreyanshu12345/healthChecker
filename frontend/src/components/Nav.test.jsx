import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Nav from './Nav'

describe('Nav', () => {
  test('shows the brand name', () => {
    render(
      <MemoryRouter>
        <Nav />
      </MemoryRouter>
    )
    expect(screen.getByText('URL Health Monitor')).toBeInTheDocument()
  })

  test('has links to all three pages', () => {
    render(
      <MemoryRouter>
        <Nav />
      </MemoryRouter>
    )

    const checker = screen.getByRole('link', { name: /checker/i })
    const history = screen.getByRole('link', { name: /history/i })
    const metrics = screen.getByRole('link', { name: /metrics/i })

    expect(checker).toHaveAttribute('href', '/')
    expect(history).toHaveAttribute('href', '/history')
    expect(metrics).toHaveAttribute('href', '/metrics')
  })
})
