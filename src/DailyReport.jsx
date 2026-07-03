import { useEffect, useRef, useState } from 'react'

const fmt = n => Math.round(n || 0).toLocaleString('en-US')

const TEAM_LABELS = [
  { key: 'rise',    label: 'RISE Baseshop' },
  { key: 'ffg',     label: 'FFG' },
  { key: 'ignite',  label: 'Ignite' },
  { key: 'praise',  label: 'Praise' },
  { key: 'freedom', label: 'Freedom' },
]

export default function DailyReport({ onBack }) {
  const pageRef = useRef(null)
  const [report, setReport]   = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()

  useEffect(() => {
    let alive = true
    fetch('/api/daily-report')
      .then(r => r.json())
      .then(res => {
        if (!alive) return
        if (res.ok && res.data) setReport({ data: res.data, updatedAt: res.updated_at })
        else setError(res.error || 'No report data available yet.')
      })
      .catch(e => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  // Count-up animation once data lands
  useEffect(() => {
    if (!report) return
    const el = pageRef.current
    if (!el) return
    el.querySelectorAll('[data-count]').forEach(node => {
      const target = parseInt(node.dataset.count, 10)
      if (!Number.isFinite(target)) return
      const dur   = target > 50 ? 1100 : 800
      const start = performance.now()
      const tick  = (now) => {
        const t = Math.min((now - start) / dur, 1)
        node.textContent = Math.round((1 - Math.pow(1 - t, 3)) * target).toLocaleString('en-US')
        if (t < 1) requestAnimationFrame(tick)
        else node.textContent = target.toLocaleString('en-US')
      }
      requestAnimationFrame(tick)
    })
  }, [report])

  const data      = report?.data
  const updatedAt = report?.updatedAt ? new Date(report.updatedAt) : null
  const staleDays = updatedAt ? Math.floor((Date.now() - updatedAt.getTime()) / 86400000) : null
  const asOf      = updatedAt
    ? updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
      updatedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null

  const recruits  = data?.recruits
  const families  = data?.families_helped
  const gxTop5    = data?.gx_top5
  const licensing = data?.licensing
  const monthName = data?.month_name || ''

  return (
    <div ref={pageRef}>

      {/* ── Report Header ── */}
      <header className="dr-header">
        <div className="dr-sweep" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <button className="prof-back-btn" onClick={onBack}>← Back</button>
          <div className="brand">
            <div className="brand-name">TEAM RISE</div>
            <div className="brand-sub" style={{ letterSpacing: '0.38em' }}>DAILY REPORT</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <div className="dr-date-chip">{today}</div>
          <button className="dr-print-btn" onClick={() => window.print()}>PRINT</button>
        </div>
      </header>

      {/* Data freshness banner */}
      {asOf && (
        <div className={'dr-freshness' + (staleDays >= 2 ? ' stale' : '')}>
          Data as of {asOf}
          {staleDays >= 2 && <> — {staleDays} days old. Run the daily scrape + <code>push_daily_snapshot.js</code> to refresh.</>}
        </div>
      )}

      {loading && <div className="dr-page"><div className="dr-card"><div className="dr-card-body dr-loading">Loading report…</div></div></div>}

      {error && !loading && (
        <div className="dr-page">
          <div className="dr-card">
            <div className="r-section-head">REPORT UNAVAILABLE</div>
            <div className="dr-card-body">{error}</div>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="dr-page">

          {/* LEFT / MAIN COL */}
          <div className="dr-main-col">

            {/* Recruiting */}
            <div className="dr-card">
              <div className="r-section-head">
                RECRUITING
                <span className="dr-section-tag">{monthName.toUpperCase()}</span>
              </div>
              <div className="dr-card-body">
                {recruits ? (
                  <>
                    <div className="dr-hero-row">
                      <div className="dr-hero-num" data-count={recruits.total}>0</div>
                      <div className="dr-hero-label">
                        <strong>New Teammates</strong>
                        <span>joined in {monthName}</span>
                      </div>
                    </div>
                    <div className="dr-divider" />
                    <div className="dr-sub-label">BY TEAM</div>
                    <div className="dr-breakdown-grid">
                      {TEAM_LABELS.filter(t => (recruits[t.key] || 0) > 0 || t.key === 'rise').map(t => (
                        <div key={t.key} className={'dr-b-tile' + (t.key === 'rise' ? ' top' : '')}>
                          <div className="dr-b-tile-name">{t.label}</div>
                          <div className="dr-b-tile-num" data-count={recruits[t.key] || 0}>0</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="r-unavail">Recruit data unavailable</div>}
              </div>
            </div>

            {/* Families Helped */}
            <div className="dr-card">
              <div className="r-section-head">
                FAMILIES HELPED — POINTS
                <span className="dr-section-tag">{monthName.toUpperCase()}</span>
              </div>
              <div className="dr-card-body">
                {families ? (
                  <>
                    <div className="r-stat-row">
                      <div className="r-stat">
                        <div className="r-stat-num">${fmt(families.gross_base)}</div>
                        <div className="r-stat-label">RISE Baseshop</div>
                      </div>
                      <div className="r-stat">
                        <div className="r-stat-num">${fmt(families.super_base_contribution)}</div>
                        <div className="r-stat-label">Superbase SMDs</div>
                      </div>
                      <div className="r-stat r-stat--total">
                        <div className="r-stat-num">${fmt(families.gross_super_base)}</div>
                        <div className="r-stat-label">Total Hierarchy</div>
                      </div>
                    </div>
                    {families.snapshot_date && (
                      <div className="dr-sub-note">MyWFG snapshot: {families.snapshot_date}</div>
                    )}
                  </>
                ) : <div className="r-unavail">MyWFG data unavailable — run scrape_mywfg_production.js</div>}
              </div>
            </div>

          </div>{/* /dr-main-col */}

          {/* RIGHT / SIDE COL */}
          <div className="dr-side-col">

            {/* GX Tracker */}
            <div className="dr-card">
              <div className="r-section-head">
                GX TOP 5
                <span className="dr-section-tag">CLOSEST TO QUALIFIED</span>
              </div>
              <div className="dr-card-body">
                {gxTop5?.length ? (
                  <div className="r-gx-list">
                    {gxTop5.map((a, i) => {
                      const needs = []
                      if (!a.qualified && a.needR > 0) needs.push(`${a.needR} rec`)
                      if (!a.qualified && a.needP > 0) needs.push(`$${fmt(a.needP)} pts`)
                      return (
                        <div key={a.name} className={'r-gx-row' + (a.qualified ? ' r-gx-qualified' : '')}>
                          <span className="r-gx-rank">{i + 1}</span>
                          <span className="r-gx-name">{a.name.replace(/\s*\([A-Z0-9]+\)$/, '')}</span>
                          <span className="r-gx-progress">{a.recruits}/3 rec · {fmt(a.points)} pts</span>
                          {a.qualified
                            ? <span className="r-gx-qualified-badge">QUALIFIED</span>
                            : <span className="r-gx-needs">{needs.length ? 'needs ' + needs.join(' + ') : ''}</span>}
                        </div>
                      )
                    })}
                  </div>
                ) : <div className="r-unavail">GX data unavailable</div>}
              </div>
            </div>

            {/* Licensing */}
            <div className="dr-card">
              <div className="r-section-head">
                LICENSING PIPELINE
                {licensing && <span className="dr-section-tag">{licensing.total} ACTIVE</span>}
              </div>
              <div className="dr-card-body">
                {licensing ? (
                  <>
                    <div className="r-stat-row">
                      <div className="r-stat">
                        <div className="r-stat-num" data-count={licensing.test_scheduled?.length || 0}>0</div>
                        <div className="r-stat-label">Tests Scheduled</div>
                      </div>
                      <div className="r-stat r-stat--gold">
                        <div className="r-stat-num" data-count={licensing.needs_retake || 0}>0</div>
                        <div className="r-stat-label">Need Retake</div>
                      </div>
                    </div>
                    {licensing.test_scheduled?.length > 0 && (
                      <>
                        <div className="dr-sub-label">UPCOMING TESTS</div>
                        <div className="dr-lic-list">
                          {licensing.test_scheduled.map(t => (
                            <div key={t.name + t.testDate} className="dr-lic-row">
                              <div className="dr-lic-dot testing" />
                              <div className="dr-lic-name">{t.name}{t.state ? ` (${t.state})` : ''}</div>
                              <div className="dr-lic-date">{t.testDate}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : <div className="r-unavail">Licensing data unavailable</div>}
              </div>
            </div>

          </div>{/* /dr-side-col */}
        </div>
      )}

      {/* Footer */}
      <div className="status-bar">
        <div className="dot dot-green" />
        <span className="sb-item">TEAM RISE AI SYSTEM</span>
        <div className="sb-divider" />
        <span className="sb-item">Daily Report &nbsp;·&nbsp; {today}</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(0,140,140,0.4)' }}>
          team-rise-v2.vercel.app
        </span>
      </div>

    </div>
  )
}
