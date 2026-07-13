import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import ProspectsPage from './ProspectsPage'

const TABS = [
  { key: 'prospects', icon: '👤', label: 'Personal Prospects' },
  { key: 'bpm',       icon: '📋', label: 'BPM Follow-Up' },
  { key: 'faststart', icon: '🚀', label: 'Fast Start Steps' },
  { key: 'appts',     icon: '📅', label: 'Appt Follow-Up' },
]

function ApptRow({ a, showFollowUpFlag = false }) {
  return (
    <div className="lic-row">
      <div className="lic-row-main">
        <span className="lic-name">{a.prospect}</span>
        <span className="lic-level">{a.date} · {a.time}</span>
        {a.step && <span className="lic-state">{a.step}</span>}
      </div>
      <div className="lic-row-meta">
        {a.trainee && a.trainee !== 'N/A' && <span className="lic-leader">Trainee: {a.trainee}</span>}
        {a.trainer && a.trainer !== 'N/A' && <span className="lic-leader">Trainer: {a.trainer}</span>}
        {a.phone && <a className="lic-phone" href={'tel:' + a.phone.replace(/\D/g, '')}>{a.phone}</a>}
        {showFollowUpFlag && <span className="lic-cat lic-cat--gold">NO NEXT APPT</span>}
        {a.fna_taken === 'Yes' && <span className="lic-cat lic-cat--green">FNA TAKEN</span>}
      </div>
      {a.comments && <div className="lic-notes">{a.comments}</div>}
    </div>
  )
}

function ApptSection({ title, tag, rows, empty, showFollowUpFlag }) {
  return (
    <div className="dr-card">
      <div className="r-section-head">
        <span>{title}</span>
        <span className="dr-section-tag">{rows.length}</span>
      </div>
      <div className="dr-card-body">
        <div className="lic-rows">
          {rows.map((a, i) => <ApptRow key={a.prospect + '|' + i} a={a} showFollowUpFlag={showFollowUpFlag} />)}
          {!rows.length && <div className="r-unavail">{empty}</div>}
        </div>
      </div>
    </div>
  )
}

export default function FollowUpPage({ onBack }) {
  const { profile } = useAuth()
  const [tab, setTab] = useState('prospects')

  // Appointment-based data (BPM + appt follow-up tabs)
  const [fu, setFu]             = useState(null)
  const [fuError, setFuError]   = useState(null)
  const [fuLoading, setFuLoading] = useState(true)

  // Fast Start data
  const [recruits, setRecruits]   = useState([])
  const [fsLoading, setFsLoading] = useState(true)

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()

  useEffect(() => {
    let alive = true
    fetch('/api/followups')
      .then(r => r.json())
      .then(res => {
        if (!alive) return
        if (res.ok) setFu(res)
        else setFuError(res.error || 'Could not load appointment data.')
      })
      .catch(e => alive && setFuError(e.message))
      .finally(() => alive && setFuLoading(false))

    fetch(`/api/recruit-pipeline?name=${encodeURIComponent(profile?.full_name || '')}`)
      .then(r => r.json())
      .then(d => alive && setRecruits(d.recruits || []))
      .catch(() => {})
      .finally(() => alive && setFsLoading(false))

    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scrapedAt = fu?.scrapedAt ? new Date(fu.scrapedAt) : null
  const asOf = scrapedAt
    ? scrapedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
      scrapedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null

  // Fast Start: next step per recruit, least progress first (API already sorts)
  const nextStepOf = r => !r.step3Done ? 'Step 3 — Goals & Reachouts' : !r.step4Done ? 'Step 4 — FNA Collection' : !r.step5Done ? 'Step 5 — FNA Report' : null
  const fastStart = recruits.map(r => ({ ...r, nextStep: nextStepOf(r) })).filter(r => r.nextStep)

  return (
    <div>
      <header className="dr-header">
        <div className="dr-sweep" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <button className="prof-back-btn" onClick={onBack}>← Back</button>
          <div className="brand">
            <div className="brand-name">TEAM RISE</div>
            <div className="brand-sub" style={{ letterSpacing: '0.38em' }}>FOLLOW-UP HUB</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <div className="dr-date-chip">{today}</div>
          <button className="dr-print-btn" onClick={() => window.print()}>PRINT</button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="fu-tabs">
        {TABS.map(t => (
          <button key={t.key} className={'fu-tab' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>
            <span className="fu-tab-icon">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── Personal Prospects ── */}
      {tab === 'prospects' && <ProspectsPage embedded />}

      {/* ── BPM Follow-Up ── */}
      {tab === 'bpm' && (
        <div className="lic-page">
          {asOf && <div className="dr-freshness">Appointments scraped {asOf}</div>}
          {fuLoading && <div className="dr-card"><div className="dr-card-body dr-loading">Loading appointments…</div></div>}
          {fuError && !fuLoading && <div className="dr-card"><div className="r-section-head">UNAVAILABLE</div><div className="dr-card-body">{fuError}</div></div>}
          {fu && !fuLoading && (
            <>
              <ApptSection
                title="🤝 ATTENDED BPM — CAPTAIN FOLLOW-UP CALL"
                rows={fu.bpm.showed}
                empty="No BPM guests in the current scrape window."
              />
              <ApptSection
                title="📵 BPM NO-SHOWS — REBOOK TO NEXT BPM"
                rows={fu.bpm.noShows}
                empty="No BPM no-shows in the current scrape window."
              />
            </>
          )}
        </div>
      )}

      {/* ── Fast Start Steps ── */}
      {tab === 'faststart' && (
        <div className="lic-page">
          {fsLoading && <div className="dr-card"><div className="dr-card-body dr-loading">Loading recruits…</div></div>}
          {!fsLoading && (
            <div className="dr-card">
              <div className="r-section-head">
                🚀 FAST START — NEXT STEP NEEDED
                <span className="dr-section-tag">{fastStart.length}</span>
              </div>
              <div className="dr-card-body">
                <div className="lic-rows">
                  {fastStart.map((r, i) => (
                    <div key={r.code + '|' + i} className="lic-row">
                      <div className="lic-row-main">
                        <span className="lic-name">{r.name}</span>
                        <span className="lic-cat lic-cat--teal">{r.nextStep}</span>
                      </div>
                      <div className="lic-row-meta">
                        {r.trainer && <span className="lic-leader">Trainer: {r.trainer}</span>}
                        {r.phone && <a className="lic-phone" href={'tel:' + r.phone.replace(/\D/g, '')}>{r.phone}</a>}
                        <span className="lic-days">{[r.step3Done, r.step4Done, r.step5Done].filter(Boolean).length}/3 done</span>
                      </div>
                    </div>
                  ))}
                  {!fastStart.length && <div className="r-unavail">Everyone is through Fast Start steps 3–5. 🎉</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Appointment Follow-Up ── */}
      {tab === 'appts' && (
        <div className="lic-page">
          {asOf && <div className="dr-freshness">Appointments scraped {asOf}</div>}
          {fuLoading && <div className="dr-card"><div className="dr-card-body dr-loading">Loading appointments…</div></div>}
          {fuError && !fuLoading && <div className="dr-card"><div className="r-section-head">UNAVAILABLE</div><div className="dr-card-body">{fuError}</div></div>}
          {fu && !fuLoading && (
            <>
              <ApptSection
                title="⚠️ SHOWED — NO NEXT APPOINTMENT BOOKED"
                rows={fu.apptFollowUp.noNextBooked}
                empty="Every completed appointment has a next one booked. 🎉"
                showFollowUpFlag
              />
              <ApptSection
                title="📵 NO-SHOWS — REBOOK"
                rows={fu.apptFollowUp.noShows}
                empty="No no-shows in the current scrape window."
              />
            </>
          )}
        </div>
      )}

      <div className="status-bar">
        <div className="dot dot-green" />
        <span className="sb-item">TEAM RISE AI SYSTEM</span>
        <div className="sb-divider" />
        <span className="sb-item">Follow-Up Hub &nbsp;·&nbsp; {today}</span>
      </div>
    </div>
  )
}
