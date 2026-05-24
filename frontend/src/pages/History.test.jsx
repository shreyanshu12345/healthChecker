import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import History from './History'

describe('History Page', () => {
  const fakeHistory = {
    history: [
      {
        url: 'https://test-up.com',
        status: 'up',
        status_code: 200,
        latency_ms: 45,
        checked_at: '2026-05-24T12:00:00.000Z'
      },
      {
        url: 'https://test-down.org',
        status: 'down',
        status_code: 503,
        error: 'Service Unavailable',
        checked_at: '2026-05-24T12:05:00.000Z'
      }
    ]
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('fetches and shows history records on load', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeHistory
    })

    const { container } = render(<History />)

    expect(screen.getByText('Check History')).toBeInTheDocument()

    await waitFor(() => {
      expect(container.querySelector('.skeleton-row')).toBeNull()
    })

    expect(screen.getByText('https://test-up.com')).toBeInTheDocument()
    expect(screen.getByText('45 ms')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('https://test-down.org')).toBeInTheDocument()
    expect(screen.getByText('503')).toBeInTheDocument()
    expect(screen.getByText('2 records')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /all \(2\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /up \(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /down \(1\)/i })).toBeInTheDocument()
  })

  test('url search box filters the list', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeHistory
    })

    render(<History />)

    await waitFor(() => {
      expect(screen.getByText('https://test-up.com')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Filter by URL...'), {
      target: { value: 'down' }
    })

    expect(screen.queryByText('https://test-up.com')).not.toBeInTheDocument()
    expect(screen.getByText('https://test-down.org')).toBeInTheDocument()
    expect(screen.getByText('1 record')).toBeInTheDocument()
  })

  test('status tabs filter records correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeHistory
    })

    render(<History />)

    await waitFor(() => {
      expect(screen.getByText('https://test-up.com')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /up \(1\)/i }))
    expect(screen.getByText('https://test-up.com')).toBeInTheDocument()
    expect(screen.queryByText('https://test-down.org')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /down \(1\)/i }))
    expect(screen.queryByText('https://test-up.com')).not.toBeInTheDocument()
    expect(screen.getByText('https://test-down.org')).toBeInTheDocument()
  })

  test('shows an error if the fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    })

    render(<History />)

    await waitFor(() => {
      expect(screen.getByText('Server error: 404')).toBeInTheDocument()
    })
  })

  test('refresh button fetches the data again', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeHistory
    })

    render(<History />)

    await waitFor(() => {
      expect(screen.getByText('https://test-up.com')).toBeInTheDocument()
    })

    const refreshBtn = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    await waitFor(() => {
      expect(refreshBtn).not.toBeDisabled()
    })
  })
})
