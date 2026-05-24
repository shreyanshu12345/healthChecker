import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Metrics from './Metrics'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }) => (
    <div data-testid="line-chart" data-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: () => <div data-testid="chart-line" />,
  XAxis: () => <div data-testid="chart-xaxis" />,
  YAxis: () => <div data-testid="chart-yaxis" />,
  CartesianGrid: () => <div data-testid="chart-grid" />,
  Tooltip: () => <div data-testid="chart-tooltip" />,
  ReferenceLine: () => <div data-testid="chart-refline" />,
}))

describe('Metrics Page', () => {
  const fakeMetrics = {
    summary: {
      total_checks: 1050,
      overall_uptime_pct: 98.5,
      avg_latency_ms: 120,
      urls_monitored: 2
    },
    per_url: [
      {
        url: 'https://site-a.com',
        last_status: 'up',
        uptime_pct: 99.0,
        avg_latency: 110,
        min_latency: 90,
        max_latency: 150,
        total: 500,
        sparkline: [
          { t: '2026-05-24T12:00:00.000Z', l: 110, s: 'up' },
          { t: '2026-05-24T12:01:00.000Z', l: 115, s: 'up' }
        ]
      },
      {
        url: 'https://site-b.com',
        last_status: 'down',
        uptime_pct: 95.0,
        avg_latency: 220,
        min_latency: 180,
        max_latency: 350,
        total: 550,
        sparkline: [
          { t: '2026-05-24T12:00:00.000Z', l: 220, s: 'up' },
          { t: '2026-05-24T12:01:00.000Z', l: null, s: 'down' }
        ]
      }
    ]
  }

  const fakeTimeline = {
    url: 'https://site-a.com',
    timeline: [
      { t: '2026-05-24T12:00:00.000Z', latency_ms: 110, status: 'up', status_code: 200 },
      { t: '2026-05-24T12:01:00.000Z', latency_ms: 115, status: 'up', status_code: 200 }
    ]
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('loads and shows the summary cards and url table', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/metrics/timeline')) {
        return Promise.resolve({ ok: true, json: async () => fakeTimeline })
      }
      return Promise.resolve({ ok: true, json: async () => fakeMetrics })
    })

    const { container } = render(<Metrics />)

    await waitFor(() => {
      expect(screen.getByText('1,050')).toBeInTheDocument()
    })

    expect(screen.getByText('98.5%')).toBeInTheDocument()
    expect(screen.getByText('120 ms')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    expect(screen.getAllByText('https://site-a.com')[0]).toBeInTheDocument()
    expect(screen.getByText('https://site-b.com')).toBeInTheDocument()

    const sparklines = container.querySelectorAll('.td-spark svg')
    expect(sparklines).toHaveLength(1)
  })

  test('clicking a url row fetches its timeline', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/metrics/timeline')) {
        return Promise.resolve({ ok: true, json: async () => fakeTimeline })
      }
      return Promise.resolve({ ok: true, json: async () => fakeMetrics })
    })

    render(<Metrics />)

    await waitFor(() => {
      expect(screen.getByText('https://site-b.com')).toBeInTheDocument()
    })

    const row = screen.getByText('https://site-b.com').closest('tr')
    fireEvent.click(row)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/metrics/timeline?url=https%3A%2F%2Fsite-b.com')
      )
    })
  })

  test('shows error message when metrics fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    })

    render(<Metrics />)

    await waitFor(() => {
      expect(screen.getByText('Server error: 500')).toBeInTheDocument()
    })
  })
})
