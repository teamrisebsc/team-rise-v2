import { useEffect, useState } from 'react'

const TOP_Y = 32
const ZERO_Y = 480
const OUTLINE = 'M 88,56 A 24,24 0 0 1 112,32 A 24,24 0 0 1 136,56 L 136,436.7 A 64,64 0 1 1 88,436.7 Z'

function valueToY(value, goal) {
  if (!goal || goal <= 0) return ZERO_Y
  const clamped = Math.max(0, Math.min(value, goal))
  return ZERO_Y - (clamped / goal) * (ZERO_Y - TOP_Y)
}

export default function BigEventPage({ onBack }) {
  const [convention, setConvention] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()

  useEffect(() => {
    let alive = true
    fetch('/api/convention')
      .then(r => r.json())
      .then(res => {
        if (!alive) return
        if (res.ok) setConvention(res.data)
        else setError(res.error || 'Could not load event data.')
      })
      .catch(e => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const goal      = convention?.goal || 0
  const total     = convention?.tickets_total || 0
  const named     = convention?.tickets_named || 0
  const unnamed   = Math.max(0, total - named)
  const remaining = Math.max(0, goal - total)
  const pct       = goal > 0 ? Math.round((total / goal) * 100) : 0
  const hasGoal   = goal > 0 && convention?.tickets_total != null

  const unnamedY  = valueToY(total, goal)
  const namedY    = valueToY(named, goal)
  const namedList = convention?.tickets_named_list || []

  const ticks = hasGoal
    ? [0, 0.2, 0.4, 0.6, 0.8, 1].map(f => ({
        y: ZERO_Y - f * (ZERO_Y - TOP_Y),
        label: Math.round(goal * f),
        edge: f === 0 || f === 1,
      }))
    : []

  const dateRange = convention?.start_date && convention?.end_date
    ? new Date(convention.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      + ' – ' + new Date(convention.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div>
      <header className="dr-header">
        <div className="dr-sweep" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <button className="prof-back-btn" onClick={onBack}>← Back</button>
          <div className="brand">
            <div className="brand-name">TEAM RISE</div>
            <div className="brand-sub" style={{ letterSpacing: '0.38em' }}>BIG EVENT</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <div className="dr-date-chip">{today}</div>
          <button className="dr-print-btn" onClick={() => window.print()}>PRINT</button>
        </div>
      </header>

      <div className="lic-page">
        {loading && <div className="dr-card"><div className="dr-card-body dr-loading">Loading event data…</div></div>}
        {error && !loading && (
          <div className="dr-card"><div className="r-section-head">UNAVAILABLE</div><div className="dr-card-body">{error}</div></div>
        )}

        {convention && !loading && !error && (
          <>
          <div className="dr-card">
            <div className="r-section-head">
              🌡️ {(convention.event || 'BIG EVENT').toUpperCase()} — REGISTRATION
            </div>
            <div className="dr-card-body">
              <p className="be-subtitle">
                {[convention.location, dateRange].filter(Boolean).join(' · ')}
              </p>
              {convention.tickets_by_scope && <p className="be-scope-tag">Hierarchy (Base + Super Base)</p>}

              {!hasGoal ? (
                <div className="be-no-goal">
                  No registration goal set yet — add one from the Big Event widget on the dashboard to enable the thermometer.
                </div>
              ) : (
                <div className="be-layout">
                  <div className="be-therm-wrap">
                    <svg width="180" height="464" viewBox="0 0 224 576" role="img"
                      aria-label={`Thermometer showing ${total} of ${goal} goal tickets purchased, ${named} with a name assigned`}>
                      <g>
                        {ticks.map(t => (
                          <g key={t.label + '-' + t.y}>
                            <line className="be-tick-line" x1={t.edge ? 67.2 : 76.8} y1={t.y} x2="156.8" y2={t.y} />
                            <text className="be-tick-label" x="163.2" y={t.y + 5}>{t.label}</text>
                          </g>
                        ))}
                      </g>

                      <path d={OUTLINE} className="be-tube-empty" />

                      <clipPath id="beThermClip">
                        <path d={OUTLINE} />
                      </clipPath>

                      <g clipPath="url(#beThermClip)">
                        <circle cx="112" cy="496" r="64" className="be-fill-named" />
                        <rect x="64" y={unnamedY} width="96" height={ZERO_Y - unnamedY + 200} className="be-fill-unnamed" />
                        <rect x="64" y={namedY} width="96" height={ZERO_Y - namedY + 200} className="be-fill-named" />
                      </g>

                      <path d={OUTLINE} fill="none" className="be-outline" />
                    </svg>
                  </div>

                  <div className="be-stats">
                    <div className="be-hero">
                      <span className="be-hero-num">{total}</span>
                      <span className="be-hero-goal">/ {goal} goal</span>
                    </div>
                    <p className="be-hero-label">tickets purchased · {pct}% of goal</p>

                    <div className="be-legend">
                      <div className="be-legend-row">
                        <span className="be-swatch be-swatch--named" />
                        <div className="be-legend-text">
                          <span className="be-legend-name">Named</span>
                          <span className="be-legend-sub">attendee assigned to seat</span>
                        </div>
                        <span className="be-legend-val">{named}</span>
                      </div>
                      <div className="be-legend-row">
                        <span className="be-swatch be-swatch--unnamed" />
                        <div className="be-legend-text">
                          <span className="be-legend-name">Purchased, unnamed</span>
                          <span className="be-legend-sub">seat bought, no name yet</span>
                        </div>
                        <span className="be-legend-val">{unnamed}</span>
                      </div>
                      <div className="be-legend-row">
                        <span className="be-swatch be-swatch--empty" />
                        <div className="be-legend-text">
                          <span className="be-legend-name">Remaining to goal</span>
                          <span className="be-legend-sub">not yet purchased</span>
                        </div>
                        <span className="be-legend-val">{remaining}</span>
                      </div>
                    </div>

                    <div className="be-divider" />
                    <p className="be-footnote">
                      {total} tickets purchased across {named} purchaser groups; {unnamed} seats still need
                      a name assigned before the event.
                    </p>
                    {convention.registration_link && (
                      <a className="be-reg-link" href={convention.registration_link} target="_blank" rel="noreferrer">
                        Registration link ↗
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {namedList.length > 0 && (
            <div className="dr-card">
              <div className="r-section-head">
                <span>🎟️ NAMED REGISTRANTS</span>
                <span className="dr-section-tag">{namedList.length}</span>
              </div>
              <div className="dr-card-body">
                <div className="reco-grid">
                  {namedList.map((name, i) => (
                    <div key={name + '|' + i} className="reco-chip reco-chip--teal">
                      <span className="reco-chip-name">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      <div className="status-bar">
        <div className="dot dot-green" />
        <span className="sb-item">TEAM RISE AI SYSTEM</span>
        <div className="sb-divider" />
        <span className="sb-item">Big Event &nbsp;·&nbsp; {today}</span>
      </div>
    </div>
  )
}
