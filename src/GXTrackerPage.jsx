import { useEffect, useState } from 'react'

const fmt = n => Math.round(n || 0).toLocaleString('en-US')

export default function GXTrackerPage({ onBack }) {
  const [board, setBoard]     = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })

  const daysLeft = (() => {
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return Math.max(0, Math.ceil((end - now) / 86400000))
  })()

  useEffect(() => {
    let alive = true
    fetch('/api/gx-leaderboard')
      .then(r => r.json())
      .then(res => {
        if (!alive) return
        if (res.ok) setBoard(res)
        else setError(res.error || 'Could not load GX standings.')
      })
      .catch(e => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const agents    = board?.agents || []
  const active    = agents.filter(a => a.partners > 0 || a.points > 0)
  const qualified = agents.filter(a => a.qualified)
  const shown     = showAll ? agents : active
  const updatedAt = board?.updatedAt ? new Date(board.updatedAt) : null
  const asOf      = updatedAt
    ? updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
      updatedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div>
      <header className="dr-header">
        <div className="dr-sweep" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <button className="prof-back-btn" onClick={onBack}>← Back</button>
          <div className="brand">
            <div className="brand-name">TEAM RISE</div>
            <div className="brand-sub" style={{ letterSpacing: '0.38em' }}>GX TRACKER</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <div className="dr-date-chip">{today}</div>
          <button className="dr-print-btn" onClick={() => window.print()}>PRINT</button>
        </div>
      </header>

      {asOf && <div className="dr-freshness">Last GX sync: {asOf} — use Sync GX on the dashboard (local) to refresh</div>}

      <div className="lic-page">
        {loading && <div className="dr-card"><div className="dr-card-body dr-loading">Loading standings…</div></div>}
        {error && !loading && (
          <div className="dr-card"><div className="r-section-head">UNAVAILABLE</div><div className="dr-card-body">{error}</div></div>
        )}

        {board && !loading && (
          <>
            <div className="lic-summary">
              <div className="r-stat r-stat--green">
                <div className="r-stat-num">{qualified.length}</div>
                <div className="r-stat-label">Qualified</div>
              </div>
              <div className="r-stat r-stat--total">
                <div className="r-stat-num">{active.length}</div>
                <div className="r-stat-label">On the Board</div>
              </div>
              <div className="r-stat r-stat--gold">
                <div className="r-stat-num">{daysLeft}</div>
                <div className="r-stat-label">Days Left in {monthName}</div>
              </div>
            </div>

            <div className="dr-card">
              <div className="r-section-head">
                GX STANDINGS — {monthName.toUpperCase()}
                <span className="dr-section-tag">{board.partnerGoal} PARTNERS + {fmt(board.pointsGoal)} PTS</span>
              </div>
              <div className="dr-card-body">
                <div className="gxl-list">
                  {shown.map((a, i) => (
                    <div key={a.name + '|' + i} className={'gxl-row' + (a.qualified ? ' qualified' : '')}>
                      <span className="gxl-rank">{i + 1}</span>
                      <span className="gxl-name">{a.name}</span>
                      <div className="gxl-bars">
                        <div className="gxl-bar-group">
                          <span className="gxl-bar-label">Partners {a.partners}/{board.partnerGoal}</span>
                          <div className="progress-track"><div className="progress-fill" style={{ width: Math.min(100, (a.partners / board.partnerGoal) * 100) + '%' }} /></div>
                        </div>
                        <div className="gxl-bar-group">
                          <span className="gxl-bar-label">{fmt(a.points)} / {fmt(board.pointsGoal)} pts</span>
                          <div className="progress-track"><div className="progress-fill gold" style={{ width: Math.min(100, (a.points / board.pointsGoal) * 100) + '%' }} /></div>
                        </div>
                      </div>
                      {a.qualified
                        ? <span className="r-gx-qualified-badge">QUALIFIED</span>
                        : <span className="gxl-needs">
                            {[
                              a.partners < board.partnerGoal ? `${board.partnerGoal - a.partners} partner${board.partnerGoal - a.partners > 1 ? 's' : ''}` : null,
                              a.points < board.pointsGoal ? `$${fmt(board.pointsGoal - a.points)} pts` : null,
                            ].filter(Boolean).join(' + ') || ''}
                          </span>}
                    </div>
                  ))}
                  {!shown.length && <div className="r-unavail">No GX activity yet this month.</div>}
                </div>
                {!showAll && agents.length > active.length && (
                  <button className="gxl-show-all" onClick={() => setShowAll(true)}>
                    Show all {agents.length} agents
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
        <span className="sb-item">GX Tracker &nbsp;·&nbsp; {today}</span>
      </div>
    </div>
  )
}
