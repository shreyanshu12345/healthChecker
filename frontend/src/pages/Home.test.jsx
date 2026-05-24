import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Home from './Home'

describe('Home Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('renders the page with one input and two buttons', () => {
    render(<Home />)
    expect(screen.getByText('Check URLs')).toBeInTheDocument()

    const inputs = screen.getAllByPlaceholderText('https://example.com')
    expect(inputs).toHaveLength(1)
    expect(inputs[0].value).toBe('')

    expect(screen.getByRole('button', { name: /\+ add url/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /check status/i })).toBeInTheDocument()
  })

  test('can add more url inputs and remove them', () => {
    render(<Home />)
    const addBtn = screen.getByRole('button', { name: /\+ add url/i })

    fireEvent.click(addBtn)
    fireEvent.click(addBtn)

    let inputs = screen.getAllByPlaceholderText('https://example.com')
    expect(inputs).toHaveLength(3)

    const removeBtns = screen.getAllByLabelText('Remove URL')
    fireEvent.click(removeBtns[1])

    inputs = screen.getAllByPlaceholderText('https://example.com')
    expect(inputs).toHaveLength(2)
  })

  test('remove button is disabled when only one url input is left', () => {
    render(<Home />)
    const removeBtns = screen.getAllByLabelText('Remove URL')
    expect(removeBtns[0]).toBeDisabled()
  })

  test('pasting multiple urls splits them into separate inputs', () => {
    render(<Home />)
    const input = screen.getByPlaceholderText('https://example.com')

    const pasteEvent = {
      clipboardData: {
        getData: () => 'google.com\nfacebook.com\ntwitter.com'
      },
      preventDefault: vi.fn()
    }

    fireEvent.paste(input, pasteEvent)

    const inputs = screen.getAllByPlaceholderText('https://example.com')
    expect(inputs).toHaveLength(3)
    expect(inputs[0].value).toBe('google.com')
    expect(inputs[1].value).toBe('facebook.com')
    expect(inputs[2].value).toBe('twitter.com')
  })

  test('submitting urls shows results with up and down status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { url: 'https://google.com', status: 'up', status_code: 200, latency_ms: 120 },
          { url: 'https://badurl.xyz', status: 'down', error: 'Connection refused' }
        ]
      })
    })

    render(<Home />)

    const addBtn = screen.getByRole('button', { name: /\+ add url/i })
    fireEvent.click(addBtn)

    const inputs = screen.getAllByPlaceholderText('https://example.com')
    fireEvent.change(inputs[0], { target: { value: 'google.com' } })
    fireEvent.change(inputs[1], { target: { value: 'badurl.xyz' } })

    fireEvent.click(screen.getByRole('button', { name: /check status/i }))

    expect(screen.getByRole('button', { name: /checking\.\.\./i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('1 up')).toBeInTheDocument()
    })

    expect(screen.getByText('1 down')).toBeInTheDocument()
    expect(screen.getByText('2 total')).toBeInTheDocument()
    expect(screen.getByText('https://google.com')).toBeInTheDocument()
    expect(screen.getByText('120 ms')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('https://badurl.xyz')).toBeInTheDocument()
    expect(screen.getByText('Connection refused')).toBeInTheDocument()

    expect(global.fetch).toHaveBeenCalledWith('/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: ['google.com', 'badurl.xyz'] })
    })
  })

  test('shows error message if server returns an error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    })

    render(<Home />)

    const input = screen.getByPlaceholderText('https://example.com')
    fireEvent.change(input, { target: { value: 'google.com' } })
    fireEvent.click(screen.getByRole('button', { name: /check status/i }))

    await waitFor(() => {
      expect(screen.getByText('Server error: 500')).toBeInTheDocument()
    })
  })
})
