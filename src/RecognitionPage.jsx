import { useEffect, useState } from 'react'

// Collapse repeated names into { name, count } sorted by count desc
function tally(list) {
  const counts = {}
  for (const name of list || []) counts[name] = (counts[name] || 0) + 1
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

const SECTIONS = [
  { key: 'new_teammates',     title: 'NEW TEAMMATES',     icon: '🎉', tone: 'teal',  sub: 'Welcome to Team RISE!' },
  { key: 'families_helped',   title: 'FAMILIES HELPED',   icon: '👨‍👩‍👧', tone: 'green', sub: 'One row per family protected' },
  { key: 'business_builders', title: 'BUSINESS BUILDERS', icon: '🚀', tone: 'gold',  sub: 'Brought a new teammate to the mission' },
]

export default function RecognitionPage({ onBack }) {
  const [snap, setSnap]       = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [showConvention, setShowConvention] = useState(false)

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()

  useEffect(() => {
    let alive = true
    fetch('/api/recognition')
      .then(r => r.json())
      .then(res => {
        if (!alive) return
        if (res.ok) setSnap({ data: res.data, updatedAt: res.updated_at })
        else setError(res.error || 'Could not load recognition data.')
      })
      .catch(e => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const data      = snap?.data
  const updatedAt = snap?.updatedAt ? new Date(snap.updatedAt) : null
  const asOf      = updatedAt
    ? updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
      updatedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null

  const convention = data?.convention || []

  return (
    <div>
      <header className="dr-header">
        <div className="dr-sweep" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <button className="prof-back-btn" onClick={onBack}>← Back</button>
          <div className="brand">
            <div className="brand-name">TEAM RISE</div>
            <div className="brand-sub" style={{ letterSpacing: '0.38em' }}>RECOGNITION</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <div className="dr-date-chip">{today}</div>
          <button className="dr-print-btn" onClick={() => window.print()}>PRINT</button>
        </div>
      </header>

      {asOf && <div className="dr-freshness">Recognition period data as of {asOf} — updated by the Tuesday R&amp;A prep</div>}

      <div className="lic-page">
        {loading && <div className="dr-card"><div className="dr-card-body dr-loading">Loading recognition…</div></div>}
        {error && !loading && (
          <div className="dr-card"><div className="r-section-head">UNAVAILABLE</div><div className="dr-card-body">{error}</div></div>
        )}

        {data && !loading && (
          <>
            <div className="lic-summary">
              <div className="r-stat r-stat--total">
                <div className="r-stat-num">{(data.new_teammates || []).length}</div>
                <div className="r-stat-label">New Teammates</div>
              </div>
              <div className="r-stat r-stat--green">
                <div className="r-stat-num">{(data.families_helped || []).length}</div>
                <div className="r-stat-label">Families Helped</div>
              </div>
              <div className="r-stat r-stat--gold">
                <div className="r-stat-num">{tally(data.business_builders).length}</div>
                <div className="r-stat-label">Business Builders</div>
              </div>
            </div>

            {SECTIONS.map(s => {
              const entries = s.key === 'new_teammates'
                ? (data[s.key] || []).map(name => ({ name, count: 1 }))
                : tally(data[s.key])
              return (
                <div key={s.key} className="dr-card">
                  <div className="r-section-head">
                    <span>{s.icon} {s.title}</span>
                    <span className="dr-section-tag">{entries.length}</span>
                  </div>
                  <div className="dr-card-body">
                    <div className="reco-grid">
                      {entries.map(e => (
                        <div key={e.name} className={'reco-chip reco-chip--' + s.tone}>
                          <span className="reco-chip-name">{e.name}</span>
                          {e.count > 1 && <span className="reco-chip-count">×{e.count}</span>}
                        </div>
                      ))}
                      {!entries.length && <div className="r-unavail">Nothing yet this period.</div>}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Convention 2026 */}
            <div className="dr-card">
              <div className="r-section-head">
                <span>🎰 CONVENTION 2026 — REGISTERED</span>
                <span className="dr-section-tag">{convention.length}</span>
              </div>
              <div className="dr-card-body">
                {showConvention ? (
                  <div className="reco-grid">
                    {convention.map((name, i) => (
                      <div key={name + '|' + i} className="reco-chip reco-chip--teal">
                        <span className="reco-chip-name">{name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button className="gxl-show-all" onClick={() => setShowConvention(true)}>
                    Show all {convention.length} registered
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="status-bar">
        <div className="dot dot-green" />
        <span className="sb-item">TEAM RISE AI SYSTEM</span>
        <div className="sb-divider" />
        <span className="sb-item">Recognition &nbsp;·&nbsp; {today}</span>
      </div>
    </div>
  )
}
