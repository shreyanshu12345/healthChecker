import { useState } from 'react'
import './Home.css'

export default function Home() {
  const [urls, setUrls] = useState([''])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const addUrl = () => setUrls([...urls, ''])

  const removeUrl = (index) => {
    if (urls.length === 1) return
    setUrls(urls.filter((_, i) => i !== index))
  }

  const updateUrl = (index, value) => {
    const updated = [...urls]
    updated[index] = value
    setUrls(updated)
  }

  const handlePaste = (index, e) => {
    const text = e.clipboardData.getData('text')
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length > 1) {
      e.preventDefault()
      setUrls([...urls.slice(0, index), ...lines, ...urls.slice(index + 1)])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validUrls = urls.filter(u => u.trim() !== '')
    if (!validUrls.length) return

    setLoading(true)
    setError(null)
    setResults([])

    try {
      const res = await fetch('/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validUrls }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setResults(data.results)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-home">
      <div className="page-header">
        <h2>Check URLs</h2>
        <p>Enter one or more URLs to check their status</p>
      </div>

      <form onSubmit={handleSubmit} className="url-form">
        <div className="url-list">
          {urls.map((url, index) => (
            <div key={index} className="url-row">
              <span className="url-index">{index + 1}</span>
              <input
                type="text"
                className="url-input"
                value={url}
                placeholder="https://example.com"
                onChange={e => updateUrl(index, e.target.value)}
                onPaste={e => handlePaste(index, e)}
                autoFocus={index === urls.length - 1 && index !== 0}
              />
              <button
                type="button"
                className="btn-remove"
                onClick={() => removeUrl(index)}
                disabled={urls.length === 1}
                aria-label="Remove URL"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="btn-add" onClick={addUrl}>
          + Add URL
        </button>

        <button
          type="submit"
          className="btn-check"
          disabled={loading || urls.every(u => u.trim() === '')}
        >
          {loading ? 'Checking...' : 'Check Status'}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {results.length > 0 && (
        <div className="results">
          <div className="results-summary">
            <span>{results.filter(r => r.status === 'up').length} up</span>
            <span className="dot-sep">·</span>
            <span>{results.filter(r => r.status === 'down').length} down</span>
            <span className="dot-sep">·</span>
            <span>{results.length} total</span>
          </div>
          {results.map((r, i) => (
            <div key={i} className={`result-row ${r.status}`}>
              <span className={`status-badge ${r.status}`}>
                {r.status === 'up' ? 'UP' : 'DOWN'}
              </span>
              <span className="result-url">{r.url}</span>
              <div className="result-right">
                {r.status === 'up' ? (
                  <>
                    <span className="result-latency">{r.latency_ms} ms</span>
                    <span className="result-code">{r.status_code}</span>
                  </>
                ) : (
                  <span className="result-error">{r.error}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
