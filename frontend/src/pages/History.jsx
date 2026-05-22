import { useState, useEffect, useCallback } from 'react'
import './History.css'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function History() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/history?limit=200')
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setRecords(data.history)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const filtered = records.filter(r => {
    const matchUrl = r.url.toLowerCase().includes(filter.toLowerCase())
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchUrl && matchStatus
  })

  const upCount = records.filter(r => r.status === 'up').length
  const downCount = records.filter(r => r.status === 'down').length

  return (
    <div className="page-history">
      <div className="history-header">
        <div>
          <h2>Check History</h2>
          <p>Past URL health checks stored in MongoDB</p>
        </div>
        <button className="btn-refresh" onClick={fetchHistory} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="history-controls">
        <input
          type="text"
          className="filter-input"
          placeholder="Filter by URL..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div className="status-tabs">
          {['all', 'up', 'down'].map(s => (
            <button
              key={s}
              className={`tab ${statusFilter === s ? 'active' : ''} ${s}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? `All (${records.length})` : s === 'up' ? `Up (${upCount})` : `Down (${downCount})`}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="empty-state">
              {records.length === 0 ? 'No checks recorded yet. Run a check on the Checker page.' : 'No results match your filter.'}
            </div>
          ) : (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>URL</th>
                    <th>Response Time</th>
                    <th>HTTP Code</th>
                    <th>Checked At</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i} className={r.status}>
                      <td>
                        <span className={`status-badge ${r.status}`}>
                          {r.status === 'up' ? 'UP' : 'DOWN'}
                        </span>
                      </td>
                      <td className="td-url">
                        <a href={r.url} target="_blank" rel="noreferrer">{r.url}</a>
                      </td>
                      <td className="td-num">
                        {r.status === 'up' ? `${r.latency_ms} ms` : <span className="td-error">—</span>}
                      </td>
                      <td className="td-num">
                        {r.status_code
                          ? <span className={`code-chip code-${Math.floor(r.status_code / 100)}xx`}>{r.status_code}</span>
                          : <span className="td-error">—</span>}
                      </td>
                      <td className="td-time">{formatDate(r.checked_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > 0 && (
            <p className="row-count">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
          )}
        </>
      )}

      {loading && (
        <div className="loading-rows">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton-row" />)}
        </div>
      )}
    </div>
  )
}
