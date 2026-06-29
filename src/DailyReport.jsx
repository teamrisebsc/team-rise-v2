import { useEffect, useRef } from 'react'

const CONVENTION_DATA = [
  { name: 'Olivia',  count: 20, top: true },
  { name: 'McGann',  count: 18 },
  { name: 'Julie',   count: 13 },
  { name: 'Alarcon', count: 11 },
  { name: 'Rhonda',  count: 10 },
  { name: 'Corey',   count: 9  },
  { name: 'Kander',  count: 8  },
  { name: 'Kaili',   count: 7  },
  { name: 'Kari',    count: 6  },
  { name: 'Cortez',  count: 5  },
  { name: 'Odalys',  count: 4  },
  { name: 'Cathy L', count: 3  },
]
const CONV_TOTAL = CONVENTION_DATA.reduce((s, r) => s + r.count, 0)
const CONV_GOAL  = 300
const CONV_PCT   = ((CONV_TOTAL / CONV_GOAL) * 100).toFixed(1)

const GX_DATA = [
  { rank: 'SMD', name: 'Olivia',   qualified: true,  sub: '$42,750 GX',     status: 'QUALIFIED'   },
  { rank: 'MD',  name: 'Kaili K',  qualified: true,  sub: '$28,400 GX',     status: 'QUALIFIED'   },
  { rank: 'MD',  name: 'Edgar A',  qualified: false, sub: '$20,800 / $25K', status: 'NEEDS $4.2K' },
  { rank: 'SFE', name: 'Jayson C', qualified: false, sub: '$7,200 / $10K',  status: 'NEEDS $2.8K' },
  { rank: 'FE',  name: 'Lorena R', qualified: false, sub: '$3,500 / $5K',   status: 'NEEDS $1.5K' },
  { rank: 'FE',  name: 'Toni P',   qualified: false, sub: '$2,900 / $5K',   status: 'NEEDS $2.1K' },
]

const LIC_DATA = [
  { type: 'pass',    name: 'Sandoval, M',   status: 'PASSED',   date: 'Jun 27' },
  { type: 'testing', name: 'Chen, Wendy',   status: 'TESTING',  date: 'Jun 30' },
  { type: 'testing', name: 'Ramirez, J',    status: 'TESTING',  date: 'Jun 30' },
  { type: 'study',   name: 'Okafor, Chidi', status: 'STUDYING', date: '~Jul 8'  },
  { type: 'study',   name: 'Flores, Ana',   status: 'STUDYING', date: '~Jul 12' },
]

const PROD_DATA = [
  { name: 'Garcia, Maria',  amt: '$4,200', tag: 'missing', label: 'Missing Req' },
  { name: 'Nguyen, Thanh',  amt: '$6,800', tag: 'done',    label: 'Submitted'   },
  { name: 'Reyes, Carlos',  amt: '$3,500', tag: 'pending', label: 'Pending Req' },
  { name: 'Kim, Soo-Jin',   amt: '$5,100', tag: 'done',    label: 'Submitted'   },
]

const RECRUIT_DATA = [
  { name: 'Sandoval, Elena', tag: 'new',     label: 'New',         date: 'Jun 28' },
  { name: 'Wu, David',       tag: 'new',     label: 'New',         date: 'Jun 27' },
  { name: 'Flores, Ana',     tag: 'pre-lic', label: 'Pre-License', date: 'Jun 25' },
  { name: 'Okafor, Chidi',   tag: 'study',   label: 'Studying',    date: 'Jun 22' },
]

const RECO_DATA = [
  { icon: '🏆', name: 'Kaili Kimura',   desc: 'MD Qualification — June 2026. Strong month leading Praise team.'   },
  { icon: '⭐', name: 'Edgar Alarcon',  desc: '4 recruits this week. On pace for top recruiter in June.'          },
  { icon: '🎓', name: 'Maria Sandoval', desc: 'Passed licensing exam Jun 27. Ready to start taking apps!'         },
]

export default function DailyReport({ onBack }) {
  const pageRef = useRef(null)
  const today   = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()

  useEffect(() => {
    const el = pageRef.current
    if (!el) return

    // Count-up animation for all [data-count] elements
    el.querySelectorAll('[data-count]').forEach(node => {
      const target = parseInt(node.dataset.count, 10)
      const dur    = target > 50 ? 1100 : 800
      const start  = performance.now()
      const tick   = (now) => {
        const t = Math.min((now - start) / dur, 1)
        node.textContent = Math.round((1 - Math.pow(1 - t, 3)) * target)
        if (t < 1) requestAnimationFrame(tick)
        else node.textContent = target
      }
      requestAnimationFrame(tick)
    })

    // Animate progress bar after a short delay
    setTimeout(() => {
      const bar = el.querySelector('.dr-progress-fill')
      if (bar) bar.style.width = CONV_PCT + '%'
    }, 350)
  }, [])

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

      {/* ── Report Body ── */}
      <div className="dr-page">

        {/* LEFT / MAIN COL */}
        <div className="dr-main-col">

          {/* Convention 2026 */}
          <div className="dr-card">
            <div className="r-section-head">
              CONVENTION 2026
              <span className="dr-section-tag">LAS VEGAS · NOV 2026</span>
            </div>
            <div className="dr-card-body">
              <div className="dr-hero-row">
                <div className="dr-hero-num" data-count={CONV_TOTAL}>0</div>
                <div className="dr-hero-label">
                  <strong>Confirmed Seats</strong>
                  <span>out of {CONV_GOAL} goal &nbsp;·&nbsp; {CONV_GOAL - CONV_TOTAL} still unregistered</span>
                </div>
              </div>
              <div className="dr-progress-wrap">
                <div className="dr-progress-meta">
                  <span>0</span>
                  <span className="dr-goal">{CONV_PCT}% · Goal: {CONV_GOAL}</span>
                </div>
                <div className="progress-track">
                  <div className="dr-progress-fill" style={{ width: 0 }} />
                </div>
                <div className="dr-progress-foot">
                  <span className="dr-pct-badge">{CONV_PCT}% to goal</span>
                </div>
              </div>
              <div className="dr-divider" />
              <div className="dr-sub-label">CONFIRMED BY SECTION</div>
              <div className="dr-breakdown-grid">
                {CONVENTION_DATA.map(r => (
                  <div key={r.name} className={'dr-b-tile' + (r.top ? ' top' : '')}>
                    <div className="dr-b-tile-name">{r.name}</div>
                    <div className="dr-b-tile-num" data-count={r.count}>0</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Production */}
          <div className="dr-card">
            <div className="r-section-head">
              PRODUCTION — JUNE 2026
              <span className="dr-section-tag">Q2 CLOSE · 2 DAYS LEFT</span>
            </div>
            <div className="dr-card-body">
              <div className="r-stat-row">
                <div className="r-stat r-stat--total">
                  <div className="r-stat-num">$42,750</div>
                  <div className="r-stat-label">Submitted GX</div>
                </div>
                <div className="r-stat r-stat--green">
                  <div className="r-stat-num" data-count={14}>0</div>
                  <div className="r-stat-label">Clients Helped</div>
                </div>
                <div className="r-stat r-stat--gold">
                  <div className="r-stat-num" data-count={5}>0</div>
                  <div className="r-stat-label">Pending Req's</div>
                </div>
              </div>
              <div className="dr-sub-label">PENDING / RECENT CLIENTS</div>
              <div className="dr-prod-list">
                {PROD_DATA.map(p => (
                  <div key={p.name} className="dr-prod-row">
                    <span className="dr-prod-client">{p.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="dr-prod-amt">{p.amt}</span>
                      <span className={'dr-p-tag ' + p.tag}>{p.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recruiting */}
          <div className="dr-card">
            <div className="r-section-head">
              RECRUITING
              <span className="dr-section-tag">THIS WEEK</span>
            </div>
            <div className="dr-card-body">
              <div className="r-stat-row">
                <div className="r-stat r-stat--total">
                  <div className="r-stat-num" data-count={3}>0</div>
                  <div className="r-stat-label">New This Week</div>
                </div>
                <div className="r-stat">
                  <div className="r-stat-num" data-count={19}>0</div>
                  <div className="r-stat-label">New This Month</div>
                </div>
                <div className="r-stat">
                  <div className="r-stat-num" data-count={107}>0</div>
                  <div className="r-stat-label">Active Recruits</div>
                </div>
              </div>
              <div className="dr-sub-label">NEWEST MEMBERS</div>
              <div className="dr-recruit-list">
                {RECRUIT_DATA.map(r => (
                  <div key={r.name} className="dr-recruit-row">
                    <span className="dr-recruit-name">{r.name}</span>
                    <div className="dr-recruit-meta">
                      <span className={'dr-r-tag ' + r.tag}>{r.label}</span>
                      <span className="dr-recruit-date">{r.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>{/* /dr-main-col */}

        {/* RIGHT / SIDE COL */}
        <div className="dr-side-col">

          {/* GX Tracker */}
          <div className="dr-card">
            <div className="r-section-head">
              GX TRACKER
              <span className="dr-section-tag">JUNE</span>
            </div>
            <div className="dr-card-body">
              <div className="r-gx-list">
                {GX_DATA.map(r => (
                  <div key={r.name} className={'r-gx-row' + (r.qualified ? ' r-gx-qualified' : '')}>
                    <span className="r-gx-rank">{r.rank}</span>
                    <span className="r-gx-name">{r.name}</span>
                    <span className="r-gx-progress">{r.sub}</span>
                    {r.qualified
                      ? <span className="r-gx-qualified-badge">QUALIFIED</span>
                      : <span className="r-gx-needs">{r.status}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Licensing */}
          <div className="dr-card">
            <div className="r-section-head">
              LICENSING PIPELINE
              <span className="dr-section-tag">107 ACTIVE</span>
            </div>
            <div className="dr-card-body">
              <div className="r-stat-row">
                <div className="r-stat r-stat--green">
                  <div className="r-stat-num" data-count={4}>0</div>
                  <div className="r-stat-label">Passed / Month</div>
                </div>
                <div className="r-stat">
                  <div className="r-stat-num" data-count={8}>0</div>
                  <div className="r-stat-label">Testing Soon</div>
                </div>
              </div>
              <div className="dr-sub-label">RECENT ACTIVITY</div>
              <div className="dr-lic-list">
                {LIC_DATA.map(r => (
                  <div key={r.name + r.date} className="dr-lic-row">
                    <div className={'dr-lic-dot ' + r.type} />
                    <div className="dr-lic-name">{r.name}</div>
                    <div className={'dr-lic-status ' + r.type}>{r.status}</div>
                    <div className="dr-lic-date">{r.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recognition */}
          <div className="dr-card">
            <div className="r-section-head">RECOGNITION</div>
            <div className="dr-card-body">
              <div className="dr-reco-list">
                {RECO_DATA.map(r => (
                  <div key={r.name} className="dr-reco-row">
                    <div className="dr-reco-icon">{r.icon}</div>
                    <div>
                      <div className="dr-reco-name">{r.name}</div>
                      <div className="dr-reco-desc">{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>{/* /dr-side-col */}
      </div>{/* /dr-page */}

      {/* Footer */}
      <div className="status-bar">
        <div className="dot dot-green" />
        <span className="sb-item">TEAM RISE AI SYSTEM</span>
        <div className="sb-divider" />
        <span className="sb-item">Daily Report &nbsp;·&nbsp; {today}</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(0,140,140,0.4)' }}>
          teamrise-v2.netlify.app
        </span>
      </div>

    </div>
  )
}
