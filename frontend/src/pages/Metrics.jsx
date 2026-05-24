import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import './Metrics.css'

function Sparkline({ points }) {
  const values = points.map(p => p.l).filter(v => v != null)
  if (values.length < 2) return <span className="spark-empty">—</span>

  const W = 88, H = 28, pad = 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const coords = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2)
    const y = pad + (1 - (v - min) / range) * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const hasDown = points.some(p => p.s === 'down')
  const color = hasDown ? '#f87171' : '#4ade80'

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${accent || ''}`}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

function TimelineTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <p className="tt-time">{new Date(d.t).toLocaleString()}</p>
      {d.latency_ms != null
        ? <p className="tt-val">{d.latency_ms} ms <span className={`tt-badge ${d.status}`}>{d.status.toUpperCase()}</span></p>
        : <p className={`tt-badge ${d.status}`}>{d.status.toUpperCase()}</p>}
    </div>
  )
}

export default function Metrics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedUrl, setSelectedUrl] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [tlLoading, setTlLoading] = useState(false)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/metrics')
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const json = await res.json()
      setData(json)
      if (!selectedUrl && json.per_url?.length) {
        setSelectedUrl(json.per_url[0].url)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  useEffect(() => {
    if (!selectedUrl) return
    setTlLoading(true)
    setTimeline(null)
    fetch(`/metrics/timeline?url=${encodeURIComponent(selectedUrl)}&limit=100`)
      .then(r => r.json())
      .then(json => setTimeline(json.timeline))
      .catch(() => setTimeline([]))
      .finally(() => setTlLoading(false))
  }, [selectedUrl])

  const uptimeColor = (pct) => {
    if (pct >= 99) return 'green'
    if (pct >= 90) return 'yellow'
    return 'red'
  }

  if (loading) return (
    <div className="page-metrics">
      <div className="metrics-loading">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton-card" />)}
        <div className="skeleton-table" />
      </div>
    </div>
  )

  if (error) return (
    <div className="page-metrics">
      <div className="error-banner">{error}</div>
    </div>
  )

  const { summary, per_url } = data

  return (
    <div className="page-metrics">

      <div className="metrics-header">
        <div>
          <h2>Metrics</h2>
          <p>Aggregated health stats across all monitored URLs</p>
        </div>
        <button className="btn-refresh" onClick={fetchMetrics}>Refresh</button>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Checks" value={summary.total_checks.toLocaleString()} />
        <StatCard
          label="Overall Uptime"
          value={`${summary.overall_uptime_pct}%`}
          accent={uptimeColor(summary.overall_uptime_pct)}
        />
        <StatCard
          label="Avg Response Time"
          value={summary.avg_latency_ms ? `${summary.avg_latency_ms} ms` : '—'}
        />
        <StatCard label="URLs Monitored" value={summary.urls_monitored} />
      </div>

      {/* ── Per-URL table ── */}
      {per_url.length === 0 ? (
        <div className="empty-state">No data yet — run some checks first.</div>
      ) : (
        <div className="url-table-wrap">
          <table className="url-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Last Status</th>
                <th>Uptime</th>
                <th>Avg RT</th>
                <th>Min / Max</th>
                <th>Checks</th>
                <th>Trend (last 30)</th>
              </tr>
            </thead>
            <tbody>
              {per_url.map((r) => (
                <tr
                  key={r.url}
                  className={selectedUrl === r.url ? 'selected' : ''}
                  onClick={() => setSelectedUrl(r.url)}
                >
                  <td className="td-url">
                    <span className="url-text">{r.url}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${r.last_status}`}>
                      {r.last_status === 'up' ? 'UP' : 'DOWN'}
                    </span>
                  </td>
                  <td>
                    <span className={`uptime-pct ${uptimeColor(r.uptime_pct)}`}>
                      {r.uptime_pct}%
                    </span>
                  </td>
                  <td className="td-num">{r.avg_latency != null ? `${r.avg_latency} ms` : '—'}</td>
                  <td className="td-num td-minmax">
                    {r.min_latency != null
                      ? <><span className="min">{r.min_latency}</span> / <span className="max">{r.max_latency}</span> ms</>
                      : '—'}
                  </td>
                  <td className="td-num">{r.total}</td>
                  <td className="td-spark">
                    <Sparkline points={r.sparkline} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedUrl && (
        <div className="timeline-section">
          <div className="timeline-header">
            <h3>Response Time Over Time</h3>
            <span className="timeline-url">{selectedUrl}</span>
          </div>

          {tlLoading && <div className="chart-loading"><div className="skeleton-chart" /></div>}

          {!tlLoading && timeline && timeline.length < 2 && (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              Not enough data points for this URL yet.
            </div>
          )}

          {!tlLoading && timeline && timeline.length >= 2 && (() => {
            const chartData = timeline.map(p => ({
              ...p,
              latency_ms: p.status === 'up' ? p.latency_ms : null,
            }))
            const downPoints = timeline.filter(p => p.status === 'down')

            return (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#1e2330" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="t"
                      tick={{ fill: '#475569', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={t => {
                        const d = new Date(t)
                        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#475569', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `${v}ms`}
                      width={52}
                    />
                    <Tooltip content={<TimelineTooltip />} />
                    {downPoints.map((p, i) => (
                      <ReferenceLine
                        key={i}
                        x={p.t}
                        stroke="rgba(239,68,68,0.35)"
                        strokeWidth={1}
                      />
                    ))}
                    <Line
                      type="monotone"
                      dataKey="latency_ms"
                      stroke="#4f7df3"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#4f7df3' }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                {downPoints.length > 0 && (
                  <p className="down-legend">
                    <span className="down-line-sample" /> Red lines mark outages
                  </p>
                )}
              </div>
            )
          })()}
        </div>
      )}

    </div>
  )
}
