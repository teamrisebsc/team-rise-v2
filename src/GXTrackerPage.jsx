import { useEffect, useMemo, useState } from 'react'

const fmt = n => Math.round(n || 0).toLocaleString('en-US')
const SCOPES = ['base', 'superbase', 'superteam']

export default function GXTrackerPage({ onBack, theme, setTheme }) {
  const [scope, setScope]         = useState(() => new Set(['base']))
  const [board, setBoard]         = useState(null)
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [zoom, setZoom]           = useState(100)

  function zoomOut() { setZoom(z => Math.max(50, z - 10)) }
  function zoomIn()  { setZoom(z => Math.min(200, z + 10)) }

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })
  const asOfDate  = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const daysLeft = (() => {
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return Math.max(0, Math.ceil((end - now) / 86400000))
  })()

  // 'base'+'superbase' together resolves to the combined/deduped hierarchy view —
  // matches BSCpro's own scope_filter behavior, not a client-side sum of the two.
  const resolvedKey = scope.has('base') && scope.has('superbase')
    ? 'hierarchy'
    : scope.has('superbase') ? 'superbase' : 'base'

  const heroTitle = { base: 'Baseshop', superbase: 'Superbase', hierarchy: 'Hierarchy' }[resolvedKey]

  useEffect(() => {
    let alive = true
    setLoading(true)
    const q = Array.from(scope).join(',') || 'base'
    fetch(`/api/gx-leaderboard?scope=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(res => {
        if (!alive) return
        if (res.ok) setBoard(res)
        else setError(res.error || 'Could not load GX standings.')
      })
      .catch(e => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [resolvedKey])

  function toggleScope(s) {
    setScope(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      if (!next.has('base') && !next.has('superbase')) next.add('base') // never let the board go empty
      return next
    })
  }

  const ranked = useMemo(() => {
    const agents = board?.agents || []
    return agents
      .map(a => ({
        ...a,
        rMet: a.partners >= (board.partnerGoal || 3),
        pMet: a.points >= (board.pointsGoal || 15000),
      }))
      .filter(a => a.partners > 0 || a.points > 0)
  }, [board])

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
          <div className="dr-date-chip">{asOfDate.toUpperCase()}</div>
          <div className="gx-scope-group">
            {SCOPES.map(s => (
              <label key={s} className={'gx-scope-chip' + (scope.has(s) ? ' active' : '')} onClick={(e) => { e.preventDefault(); toggleScope(s) }}>
                <span className="box" />
                {s === 'base' ? 'Base' : s === 'superbase' ? 'Super Base' : 'Super Team'}
              </label>
            ))}
          </div>
          {setTheme && (
            <button className="dr-print-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '☀ LIGHT' : '🌙 DARK'}
            </button>
          )}
          <div className="gx-zoom-group">
            <button className="dr-print-btn gx-zoom-btn" onClick={zoomOut} disabled={zoom <= 50} title="Zoom out">−</button>
            <button className="dr-print-btn gx-zoom-pct" onClick={() => setZoom(100)} title="Reset zoom">{zoom}%</button>
            <button className="dr-print-btn gx-zoom-btn" onClick={zoomIn} disabled={zoom >= 200} title="Zoom in">+</button>
          </div>
        </div>
      </header>

      {asOf && <div className="dr-freshness">Last GX sync: {asOf} — use Sync GX on the dashboard (local) to refresh</div>}
      {scope.has('superteam') && (
        <div className="gx-scope-note gx-scope-note-standalone">Super Team returns no records for this account (verified 7/13/26) — shown for parity with BSCpro's own selector.</div>
      )}

      <div className="gx-zoom-viewport" style={{ zoom: zoom / 100 }}>
      <div className="lic-page">
        <div className="gx-hero">
          <h1 className="gx-hero-title">RISE <span className="accent">{heroTitle}</span></h1>
          <div className="gx-hero-sub">GX TRACKER · {monthName.toUpperCase()} {new Date().getFullYear()} · MTD</div>
          <div className="gx-hero-rule" />
          <div className="gx-hero-stats">
            <div>
              <div className="gx-hero-num">{board?.partnerGoal ?? 3}</div>
              <div className="gx-hero-label">Business Partners</div>
            </div>
            <div>
              <div className="gx-hero-num">{fmt(board?.pointsGoal ?? 15000)}</div>
              <div className="gx-hero-label">Personal Points</div>
            </div>
            <div>
              <div className="gx-hero-num">{daysLeft}</div>
              <div className="gx-hero-label">Days Left</div>
            </div>
          </div>
        </div>

        {loading && <div className="dr-card" style={{ marginTop: 18 }}><div className="dr-card-body dr-loading">Loading standings…</div></div>}
        {error && !loading && (
          <div className="dr-card" style={{ marginTop: 18 }}><div className="r-section-head">UNAVAILABLE</div><div className="dr-card-body">{error}</div></div>
        )}

        {board && !loading && !error && (
          ranked.length
            ? (
              <div className="gx-board">
                {ranked.map((a, i) => {
                  const rPct = Math.min(100, (a.partners / (board.partnerGoal || 3)) * 100)
                  const pPct = Math.min(100, (a.points / (board.pointsGoal || 15000)) * 100)
                  return (
                    <div key={a.name + '|' + i} className={'gx-card' + (a.rMet || a.qualified ? ' hi' : '')}>
                      <div className="gx-card-top">
                        <span className="gx-card-rank">{i + 1}</span>
                        <span className="gx-card-name" title={a.name}>{a.name}</span>
                        {a.qualified
                          ? <span className="gx-card-badge">Qualified</span>
                          : (a.rMet ? <span className="gx-card-badge">Partners ✓</span> : null)}
                      </div>
                      <div className="gx-stat-row">
                        <div className="gx-stat-head">
                          <span className="gx-stat-label">Partners</span>
                          <span className="gx-stat-value"><b>{a.partners}</b> / {board.partnerGoal}</span>
                        </div>
                        <div className="gx-bar-track"><div className={'gx-bar-fill' + (a.rMet ? ' full' : '')} style={{ width: rPct + '%' }} /></div>
                        <div className={'gx-stat-need' + (a.rMet ? ' met' : '')}>{a.rMet ? 'goal met!' : `needs ${board.partnerGoal - a.partners}`}</div>
                      </div>
                      <div className="gx-stat-row">
                        <div className="gx-stat-head">
                          <span className="gx-stat-label">Points</span>
                          <span className="gx-stat-value"><b>{fmt(a.points)}</b> / {fmt(board.pointsGoal)}</span>
                        </div>
                        <div className="gx-bar-track"><div className={'gx-bar-fill' + (a.pMet ? ' full' : '')} style={{ width: pPct + '%' }} /></div>
                        <div className={'gx-stat-need' + (a.pMet ? ' met' : '')}>{a.pMet ? 'goal met!' : `needs $${fmt(board.pointsGoal - a.points)}`}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
            : <div className="gx-board-empty">No GX activity in this scope yet this month.</div>
        )}

        {board && !loading && !error && (
          <div className="gx-board-foot">RISE · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {ranked.length} on the board</div>
        )}
      </div>
      </div>

      <div className="status-bar">
        <div className="dot dot-green" />
        <span className="sb-item">TEAM RISE AI SYSTEM</span>
        <div className="sb-divider" />
        <span className="sb-item">GX Tracker &nbsp;·&nbsp; {asOfDate}</span>
      </div>
    </div>
  )
}
