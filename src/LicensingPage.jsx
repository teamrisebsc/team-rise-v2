import { useEffect, useState } from 'react'

// Display order + styling for blocker categories (mirrors the Licensing Agent's logic)
const CATEGORIES = [
  { key: 'Test Scheduled',               tone: 'green',  icon: '🗓️' },
  { key: 'Needs Retake / Check Status',  tone: 'gold',   icon: '🔁' },
  { key: 'No Test Date Scheduled',       tone: 'gold',   icon: '⏳' },
  { key: 'Access Issue',                 tone: 'red',    icon: '🔒' },
  { key: 'Expired Xcel',                 tone: 'red',    icon: '⌛' },
  { key: 'No Course Started (Stalled)',  tone: 'muted',  icon: '💤' },
  { key: 'New / No Course Yet',          tone: 'teal',   icon: '🌱' },
]

const catMeta = key =>
  CATEGORIES.find(c => c.key === key) || { key, tone: 'muted', icon: '•' }

export default function LicensingPage({ onBack }) {
  const [people, setPeople]         = useState([])
  const [lastSynced, setLastSynced] = useState(null)
  const [error, setError]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [groupBy, setGroupBy]       = useState('category') // 'category' | 'leader'
  const [search, setSearch]         = useState('')

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()

  useEffect(() => {
    let alive = true
    fetch('/api/licensing')
      .then(r => r.json())
      .then(res => {
        if (!alive) return
        if (res.ok) { setPeople(res.people); setLastSynced(res.lastSynced) }
        else setError(res.error || 'Could not load licensing data.')
      })
      .catch(e => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const filtered = search
    ? people.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.teamLeader.toLowerCase().includes(search.toLowerCase()))
    : people

  // Build groups in display order
  const groups = (() => {
    if (groupBy === 'category') {
      const known = CATEGORIES.map(c => c.key)
      const keys  = [...known.filter(k => filtered.some(p => p.category === k)),
                     ...[...new Set(filtered.map(p => p.category))].filter(k => !known.includes(k))]
      return keys.map(k => ({ label: k, meta: catMeta(k), rows: filtered.filter(p => p.category === k) }))
    }
    const leaders = [...new Set(filtered.map(p => p.teamLeader || '(no team)'))]
      .sort((a, b) => filtered.filter(p => (p.teamLeader || '(no team)') === b).length -
                      filtered.filter(p => (p.teamLeader || '(no team)') === a).length)
    return leaders.map(l => ({
      label: l, meta: { tone: 'teal', icon: '👥' },
      rows: filtered.filter(p => (p.teamLeader || '(no team)') === l),
    }))
  })()

  const testScheduled = people.filter(p => p.category === 'Test Scheduled').length
  const needsRetake   = people.filter(p => p.category === 'Needs Retake / Check Status').length

  return (
    <div>
      {/* ── Header ── */}
      <header className="dr-header">
        <div className="dr-sweep" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <button className="prof-back-btn" onClick={onBack}>← Back</button>
          <div className="brand">
            <div className="brand-name">TEAM RISE</div>
            <div className="brand-sub" style={{ letterSpacing: '0.38em' }}>LICENSING PIPELINE</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <div className="dr-date-chip">{today}</div>
          <button className="dr-print-btn" onClick={() => window.print()}>PRINT</button>
        </div>
      </header>

      {lastSynced && <div className="dr-freshness">BSCpro last synced: {lastSynced}</div>}

      <div className="lic-page">
        {loading && <div className="dr-card"><div className="dr-card-body dr-loading">Loading pipeline…</div></div>}
        {error && !loading && (
          <div className="dr-card"><div className="r-section-head">UNAVAILABLE</div><div className="dr-card-body">{error}</div></div>
        )}

        {!loading && !error && (
          <>
            {/* Summary tiles */}
            <div className="lic-summary">
              <div className="r-stat r-stat--total">
                <div className="r-stat-num">{people.length}</div>
                <div className="r-stat-label">In Pipeline</div>
              </div>
              <div className="r-stat r-stat--green">
                <div className="r-stat-num">{testScheduled}</div>
                <div className="r-stat-label">Tests Scheduled</div>
              </div>
              <div className="r-stat r-stat--gold">
                <div className="r-stat-num">{needsRetake}</div>
                <div className="r-stat-label">Need Retake</div>
              </div>
            </div>

            {/* Controls */}
            <div className="lic-controls">
              <div className="lic-group-toggle">
                <button className={groupBy === 'category' ? 'active' : ''} onClick={() => setGroupBy('category')}>By Status</button>
                <button className={groupBy === 'leader'   ? 'active' : ''} onClick={() => setGroupBy('leader')}>By Team Leader</button>
              </div>
              <input
                className="lic-search"
                placeholder="Search name or leader…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Groups */}
            {groups.map(g => (
              <div key={g.label} className="dr-card">
                <div className="r-section-head">
                  <span>{g.meta.icon} {g.label.toUpperCase()}</span>
                  <span className="dr-section-tag">{g.rows.length}</span>
                </div>
                <div className="dr-card-body">
                  <div className="lic-rows">
                    {g.rows.map((p, i) => (
                      <div key={p.name + '|' + i} className="lic-row">
                        <div className="lic-row-main">
                          <span className="lic-name">{p.name}</span>
                          {p.state && <span className="lic-state">{p.state}</span>}
                          {p.level && <span className="lic-level">{p.level}</span>}
                        </div>
                        <div className="lic-row-meta">
                          {groupBy === 'category' && p.teamLeader && <span className="lic-leader">{p.teamLeader}</span>}
                          {groupBy === 'leader' && <span className={'lic-cat lic-cat--' + catMeta(p.category).tone}>{p.category}</span>}
                          {p.testDate && <span className="lic-test">Test: {p.testDate}</span>}
                          {p.phone && <a className="lic-phone" href={'tel:' + p.phone.replace(/\D/g, '')}>{p.phone}</a>}
                          <span className="lic-days">{p.days}d</span>
                        </div>
                        {p.notes && <div className="lic-notes">{p.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="status-bar">
        <div className="dot dot-green" />
        <span className="sb-item">TEAM RISE AI SYSTEM</span>
        <div className="sb-divider" />
        <span className="sb-item">Licensing Pipeline &nbsp;·&nbsp; {today}</span>
      </div>
    </div>
  )
}
