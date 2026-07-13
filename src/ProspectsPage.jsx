import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

const HEATS = [
  { key: 'all',    label: 'All' },
  { key: 'hot',    label: 'Hot' },
  { key: 'warm',   label: 'Warm' },
  { key: 'cool',   label: 'Cool' },
  { key: 'joined', label: 'Joined 🎉' },
]

function extractSheetId(input) {
  if (!input) return null
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : input.trim()
}

export default function ProspectsPage({ onBack, embedded = false }) {
  const { profile } = useAuth()
  const [prospects, setProspects] = useState([])
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [heat, setHeat]           = useState('all')
  const [tabFilter, setTabFilter] = useState('all')
  const [search, setSearch]       = useState('')

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()

  const sheetId = extractSheetId(profile?.google_sheet_id)
  const tabs    = (profile?.google_sheet_tabs?.length ? profile.google_sheet_tabs : [profile?.google_sheet_tab]).filter(Boolean)

  useEffect(() => {
    if (!sheetId || !tabs.length) {
      setError('No prospect sheet configured. Add your Google Sheet in Profile → Pipeline Sheet.')
      setLoading(false)
      return
    }
    let alive = true
    Promise.all(
      tabs.map(tab =>
        fetch(`/api/pipeline?sheet_id=${sheetId}&tab=${encodeURIComponent(tab)}&limit=500`)
          .then(r => r.json())
          .then(d => (d.prospects || []).map(p => ({ ...p, tab })))
          .catch(() => [])
      )
    )
      .then(results => alive && setProspects(results.flat()))
      .catch(e => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetId])

  // "Joined" prospects (became recruits per sheet notes) are hidden from every
  // view except the Joined filter — the Google Sheet itself is never modified
  const active = prospects.filter(p => !p.joined)
  const filtered = (heat === 'joined' ? prospects.filter(p => p.joined) : active.filter(p => heat === 'all' || p.heat === heat))
    .filter(p => tabFilter === 'all' || p.tab === tabFilter)
    .filter(p => !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.note || '').toLowerCase().includes(search.toLowerCase()))

  const counts = {
    hot:  active.filter(p => p.heat === 'hot').length,
    warm: active.filter(p => p.heat === 'warm').length,
    cool: active.filter(p => p.heat === 'cool').length,
  }

  return (
    <div>
      {!embedded && (
        <header className="dr-header">
          <div className="dr-sweep" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
            <button className="prof-back-btn" onClick={onBack}>← Back</button>
            <div className="brand">
              <div className="brand-name">TEAM RISE</div>
              <div className="brand-sub" style={{ letterSpacing: '0.38em' }}>PROSPECT PIPELINE</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
            <div className="dr-date-chip">{today}</div>
            <button className="dr-print-btn" onClick={() => window.print()}>PRINT</button>
          </div>
        </header>
      )}

      <div className="lic-page">
        {loading && <div className="dr-card"><div className="dr-card-body dr-loading">Loading prospects…</div></div>}
        {error && !loading && (
          <div className="dr-card"><div className="r-section-head">UNAVAILABLE</div><div className="dr-card-body">{error}</div></div>
        )}

        {!loading && !error && (
          <>
            <div className="lic-summary">
              <div className="r-stat">
                <div className="r-stat-num" style={{ color: '#f87171' }}>{counts.hot}</div>
                <div className="r-stat-label">Hot</div>
              </div>
              <div className="r-stat r-stat--gold">
                <div className="r-stat-num">{counts.warm}</div>
                <div className="r-stat-label">Warm</div>
              </div>
              <div className="r-stat r-stat--total">
                <div className="r-stat-num">{active.length}</div>
                <div className="r-stat-label">Total Prospects</div>
              </div>
            </div>

            <div className="lic-controls">
              <div className="lic-group-toggle">
                {HEATS.map(h => (
                  <button key={h.key} className={heat === h.key ? 'active' : ''} onClick={() => setHeat(h.key)}>
                    {h.label}
                  </button>
                ))}
              </div>
              {tabs.length > 1 && (
                <select className="lic-search" style={{ maxWidth: 180 }} value={tabFilter} onChange={e => setTabFilter(e.target.value)}>
                  <option value="all">All tabs</option>
                  {tabs.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              <input
                className="lic-search"
                placeholder="Search name or notes…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="dr-card">
              <div className="r-section-head">
                PROSPECTS
                <span className="dr-section-tag">{filtered.length} SHOWN</span>
              </div>
              <div className="dr-card-body">
                <div className="lic-rows">
                  {filtered.map((p, i) => (
                    <div key={p.name + i} className="lic-row" style={{ borderLeftColor: p.heat === 'hot' ? '#ef4444' : p.heat === 'warm' ? 'var(--gold)' : undefined }}>
                      <div className="lic-row-main">
                        <span className="prospect-dot" data-heat={p.heat} style={{ position: 'static' }} />
                        <span className="lic-name">{p.name}</span>
                        {tabs.length > 1 && <span className="lic-level">{p.tab}</span>}
                        <span className="lic-level">Last: {p.last}</span>
                      </div>
                      <div className="lic-row-meta">
                        {p.phone && <a className="lic-phone" href={'tel:' + p.phone.replace(/\D/g, '')}>{p.phone}</a>}
                        {p.email && <a className="lic-phone" href={'mailto:' + p.email}>{p.email}</a>}
                      </div>
                      {p.note && <div className="lic-notes">{p.note}</div>}
                    </div>
                  ))}
                  {!filtered.length && <div className="r-unavail">No prospects match the current filters.</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {!embedded && (
        <div className="status-bar">
          <div className="dot dot-green" />
          <span className="sb-item">TEAM RISE AI SYSTEM</span>
          <div className="sb-divider" />
          <span className="sb-item">Prospect Pipeline &nbsp;·&nbsp; {today}</span>
        </div>
      )}
    </div>
  )
}
