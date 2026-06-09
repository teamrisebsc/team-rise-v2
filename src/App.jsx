import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'
import ActivityFeed from './ActivityFeed'
import BookAppointment from './BookAppointment'
import ProfilePage from './ProfilePage'

const QUICK_ACTIONS = [
  { icon: '📊', label: 'Daily Report',          prompt: 'Run the daily report for Team Rise.' },
  { icon: '👤', label: 'Personal Prospects',    prompt: 'Run the Follow-Up Agent for my personal prospect sheet. Check who needs follow-up today.' },
  { icon: '👥', label: 'Team Prospects',        prompt: 'Run the Follow-Up Agent for the team prospect pipeline. Show who needs follow-up across the team.' },
  { icon: '📈', label: 'GX Tracker',            prompt: 'Run the Performance Agent to pull the current GX tracker and show where we stand.' },
  { icon: '🏆', label: 'Monthly Contest',       prompt: 'Run the Performance Agent to show current monthly contest standings and progress.' },
  { icon: '🎉', label: 'Recognition',           prompt: "Run the Recognition Agent to pull this week's recognition milestones and shoutouts." },
  { icon: '📐', label: 'Metrics (NPR/PPR/PPL)', prompt: 'Run the Metrics Agent to calculate current NPR, PPR, and PPL for Team Rise.' },
  { icon: '📋', label: 'BPM Follow-Up',         prompt: 'Run the Recruiting Pipeline Agent for BPM follow-up. Show which Captains need to follow up with their BPMs today.' },
  { icon: '📑', label: 'FNA Report',            prompt: 'Run the FNA Report for Team Rise.' },
]

const AGENTS = [
  { icon: '🔄', name: 'Follow-Up Agent',    desc: 'Personal and team prospect pipeline',   prompt: 'Launch the Follow-Up Agent for Team Rise. Manage personal and team prospect pipelines and client annual reviews.' },
  { icon: '📊', name: 'Closing Ratio',       desc: 'Step 1 to AMA to App conversion',       prompt: 'Launch the Closing Ratio Agent. Show conversion rates from Step 1 through to application submitted.' },
  { icon: '🆕', name: 'Onboarding Agent',    desc: 'New recruit welcome and milestones',     prompt: 'Launch the Recruit Onboarding Agent for Team Rise. Check for new recruits who need welcome emails or follow-up.' },
  { icon: '📜', name: 'Licensing Agent',     desc: 'Auto messages and test tracking',        prompt: 'Launch the Licensing Agent for Team Rise. Check the pipeline and show upcoming test dates.' },
  { icon: '📅', name: 'Event Coordinator',   desc: 'Events, sponsorships and logistics',     prompt: 'Launch the Event Coordinator Agent for Team Rise. Show upcoming events and any logistics tasks.' },
  { icon: '🏅', name: 'Recognition Agent',   desc: 'Promotions and production awards',       prompt: "Launch the Recognition Agent for Team Rise. Pull this week's promotions and production awards." },
  { icon: '📁', name: 'Recruiting Pipeline', desc: 'Steps 4/5, BPM and recruit tracker',     prompt: 'Launch the Recruiting Pipeline Agent for Team Rise. Show Steps 4 and 5 status and BPM follow-ups.' },
  { icon: '📱', name: 'Social Media Agent',  desc: 'Instagram, TikTok and content',          prompt: 'Launch the Social Media Agent for Team Rise. Help plan content or write captions.' },
  { icon: '👑', name: 'Queen Bee',           desc: 'Master orchestrator for all tasks',       prompt: 'Queen Bee, I need your help. What can you do for Team Rise today?', queen: true },
]

const DEFAULT_GX = { partners: { current: 0, goal: 3 }, points: { current: 0, goal: 15000 }, deadline: 'June 30, 2026' }

export default function App() {
  const { profile, signOut, updateProfile } = useAuth()
  const [theme, setTheme]       = useState(() => localStorage.getItem('tr-theme-' + (profile?.id || 'default')) || 'dark')
  const [clock, setClock]       = useState('')
  const [liveDate, setLiveDate] = useState('')
  const [pipeline, setPipeline] = useState([])
  const [gx, setGx]             = useState(DEFAULT_GX)
  const [touched, setTouched]   = useState({})
  const [fnaFile, setFnaFile]   = useState(null)
  const [fnaDrag, setFnaDrag]   = useState(false)
  const [feedItems, setFeedItems] = useState([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [activeSkill, setActiveSkill] = useState('')
  const [matchupProspect, setMatchupProspect] = useState(null)
  const [view, setView] = useState('dashboard')
  const [gxSyncing, setGxSyncing] = useState(false)
  const [showLovableBanner, setShowLovableBanner] = useState(true)
  const [lovableKey, setLovableKey] = useState(0)

  useEffect(() => {
    if (profile?.id) {
      const done = localStorage.getItem('lovable_ready_' + profile.id) === 'true'
      setShowLovableBanner(!done)
    }
  }, [profile?.id])

  useEffect(() => {
    document.body.dataset.theme = theme
    localStorage.setItem('tr-theme-' + (profile?.id || 'default'), theme)
  }, [theme, profile])

  useEffect(() => {
    const d = new Date()
    setLiveDate(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }))
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (profile?.google_sheet_id) loadPipeline(profile.google_sheet_id, profile.google_sheet_tabs)
  }, [profile])

  useEffect(() => { fetchGxStats() }, [])

  async function fetchGxStats() {
    try {
      const name = profile?.full_name || ''
      const res  = await fetch(`/api/gx-stats?name=${encodeURIComponent(name)}`)
      const data = await res.json()
      if (!data.error) setGx(data)
    } catch(e) { /* use defaults */ }
  }

  async function syncGx() {
    setGxSyncing(true)
    try {
      const name = profile?.full_name || ''
      const res  = await fetch(`/api/gx-sync?name=${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bscproEmail:    profile?.bscpro_email,
          bscproPassword: profile?.bscpro_password,
        }),
      })
      const data = await res.json()
      if (data.ok) setGx(data)
    } catch(e) { /* silent */ }
    setGxSyncing(false)
  }

  function extractSheetId(input) {
    if (!input) return null
    const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
    return m ? m[1] : input.trim()
  }

  async function loadPipeline(sheetId, tabs) {
    const id = extractSheetId(sheetId)
    if (!id) return
    // Support new tabs array, fall back to old single tab field
    const tabList = (tabs?.length ? tabs : [profile?.google_sheet_tab]).filter(Boolean)
    if (!tabList.length) return
    try {
      const results = await Promise.all(
        tabList.map(tab =>
          fetch(`/api/pipeline?sheet_id=${id}&tab=${encodeURIComponent(tab)}`)
            .then(r => r.json())
            .catch(() => ({ prospects: [] }))
        )
      )
      const merged = results.flatMap(d => d.prospects || [])
      if (merged.length) setPipeline(merged)
    } catch(e) {
      console.error('Pipeline fetch failed:', e)
    }
  }

  async function runSkill(prompt, name) {
    setFeedLoading(true)
    setActiveSkill(name)
    const { data, error } = await supabase.functions.invoke('run-skill', { body: { prompt } })
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const response = error ? 'Error running skill. Please try again.' : (data?.response || 'Done.')
    setFeedItems(prev => [{ skill: name, response, time }, ...prev].slice(0, 5))
    setFeedLoading(false)
    setActiveSkill('')
  }

  function handleDrop(e) {
    e.preventDefault()
    setFnaDrag(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') setFnaFile(file)
  }

  const hotCount  = pipeline.filter(p => p.heat === 'hot').length
  const warmCount = pipeline.filter(p => p.heat === 'warm').length
  const pPct  = Math.min(100, Math.round((gx.partners.current / gx.partners.goal) * 100))
  const ptPct = Math.min(100, Math.round((gx.points.current / gx.points.goal) * 100))

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const initials  = profile?.avatar_initials || (profile?.full_name?.split(' ').map(n => n[0]).join('') || '??')

  return (
    <>
      <header>
        <div className="brand">
          <div className="brand-name">Team Rise</div>
          <div className="brand-sub">AI Command Center</div>
        </div>
        <div className="header-right">
          <div className="live-date">{liveDate}</div>
          <div className="user-chip" onClick={() => setView(v => v === 'profile' ? 'dashboard' : 'profile')} style={{ cursor: 'pointer' }} title="Edit Profile">
            <div className="user-avatar">{initials}</div>
            <span className="user-name">{firstName}</span>
          </div>
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button className="logout-btn" onClick={signOut}>Sign Out</button>
        </div>
      </header>

      {view === 'profile' && <ProfilePage onBack={() => setView('dashboard')} />}

      <div className="dashboard" style={{ display: view === 'profile' ? 'none' : 'grid' }}>

        {/* LEFT — GX Stats + Lovable App */}
        <div className="col-left">
          <aside className="gx-panel">
            <div className="panel-label">GX This Month</div>
            <div className="gx-stat">
              <div className="gx-row">
                <span className="gx-name">Partners</span>
                <span className="gx-value">{gx.partners.current} / {gx.partners.goal}</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: pPct + '%' }} /></div>
              <div className="gx-sub">{gx.partners.current} of {gx.partners.goal} direct business partners</div>
            </div>
            <div className="gx-stat">
              <div className="gx-row">
                <span className="gx-name">Points</span>
                <span className="gx-value">{gx.points.current.toLocaleString()} / {gx.points.goal.toLocaleString()}</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: ptPct + '%' }} /></div>
              <div className="gx-sub">{gx.points.current.toLocaleString()} of {gx.points.goal.toLocaleString()} pts</div>
            </div>
            <div className="gx-deadline">Deadline: {gx.deadline}</div>
            <button className="sync-btn" onClick={syncGx} disabled={gxSyncing}>
            {gxSyncing ? 'Syncing…' : 'Sync GX'}
          </button>
          </aside>

          <div className="lovable-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="panel-label" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>Team RISE App</div>
              <button className="lovable-switch-btn" onClick={() => {
                localStorage.removeItem('lovable_ready_' + profile?.id)
                setShowLovableBanner(true)
                setLovableKey(k => k + 1)
              }}>Switch Account</button>
            </div>
            <div className="lovable-wrap">
              {showLovableBanner && (
                <div className="lovable-banner">
                  <div className="lovable-banner-text">
                    <span className="lovable-banner-title">First Time Setup</span>
                    Enter your team's access code in the app below, then click "I'm In" when you're through.
                  </div>
                  <button className="lovable-ready-btn" onClick={() => {
                    localStorage.setItem('lovable_ready_' + profile?.id, 'true')
                    setShowLovableBanner(false)
                  }}>I'm In</button>
                </div>
              )}
              <iframe
                key={`${profile?.id}-${lovableKey}`}
                src={`https://teamrise.lovable.app/?t=${lovableKey}`}
                className="lovable-frame"
                title="Team RISE Lovable App"
                allow="camera; microphone; fullscreen"
              />
            </div>
          </div>
        </div>

        {/* CENTER — Actions + Agents + FNA + Feed */}
        <main className="col-center">
          <section className="quick-section">
            <div className="section-label">Quick Actions</div>
            <div className="pill-grid">
              {QUICK_ACTIONS.map((a, i) => (
                <button key={i} className="pill" style={{ animationDelay: `${0.03 + i * 0.04}s` }} onClick={() => runSkill(a.prompt, a.label)}>
                  <span className="em">{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </section>

          <section className="agents-section">
            <div className="section-label">AI Agents</div>
            <div className="agents-grid">
              {AGENTS.map((a, i) => (
                <div key={i} className={`card${a.queen ? ' queen' : ''}`} style={{ animationDelay: `${0.06 + i * 0.05}s` }} onClick={() => runSkill(a.prompt, a.name)}>
                  <div className="card-icon">{a.icon}</div>
                  <div className="card-name">{a.name}</div>
                  <div className="card-desc">{a.desc}</div>
                  <div className="card-foot">
                    <button className="launch" onClick={e => { e.stopPropagation(); runSkill(a.prompt, a.name) }}>Launch</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FNA Drop Zone */}
          <section className="fna-section">
            <div className="section-label">Run FNA</div>
            <div
              className={'fna-drop' + (fnaDrag ? ' drag-over' : '') + (fnaFile ? ' has-file' : '')}
              onDragOver={e => { e.preventDefault(); setFnaDrag(true) }}
              onDragLeave={() => setFnaDrag(false)}
              onDrop={handleDrop}
              onClick={() => !fnaFile && document.getElementById('fna-input').click()}
            >
              <input id="fna-input" type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) setFnaFile(f) }} />
              {fnaFile ? (
                <div className="fna-ready">
                  <div className="fna-icon">📑</div>
                  <div className="fna-filename">{fnaFile.name}</div>
                  <div className="fna-actions">
                    <button className="fna-run-btn" onClick={e => { e.stopPropagation(); runSkill('Run the FNA Report for Team Rise. FNA collection sheet: ' + fnaFile.name, 'FNA Report') }}>Run FNA</button>
                    <button className="fna-clear-btn" onClick={e => { e.stopPropagation(); setFnaFile(null) }}>Clear</button>
                  </div>
                </div>
              ) : (
                <div className="fna-empty">
                  <div className="fna-icon">📄</div>
                  <div className="fna-drop-text">Drop FNA collection sheet PDF</div>
                  <div className="fna-drop-sub">or click to browse</div>
                </div>
              )}
            </div>
          </section>

          {/* Activity Feed */}
          <section className="feed-section">
            <div className="section-label">Activity Feed</div>
            <ActivityFeed items={feedItems} loading={feedLoading} activeSkill={activeSkill} />
          </section>
        </main>

        {/* RIGHT — Pipeline + Book a Matchup */}
        <aside className="col-right">
          <div className="panel-label">Pipeline - Needs Action</div>
          <div className="pipeline-counts">
            <span className="heat-badge hot">{hotCount} Hot</span>
            <span className="heat-badge warm">{warmCount} Warm</span>
            <span className="heat-badge total">{pipeline.length} Total</span>
          </div>

          {pipeline.length === 0 ? (
            <div className="pipeline-empty">Loading prospects...</div>
          ) : (
            <div className="pipeline-list">
              {pipeline.map((p, i) => (
                <div key={i} className={'prospect' + (touched[i] ? ' is-touched' : '')}>
                  <div className="prospect-dot" data-heat={p.heat} />
                  <div className="prospect-info">
                    <div className="prospect-top">
                      <span className="prospect-name">{p.name}</span>
                      <span className="prospect-role">{p.role}</span>
                      <span className="prospect-last">{p.last}</span>
                    </div>
                    <div className="prospect-note">{p.note}</div>
                  </div>
                  <div className="prospect-btns">
                    <button className={'touch-btn' + (touched[i] ? ' done' : '')} onClick={() => setTouched(t => ({ ...t, [i]: true }))}>
                      {touched[i] ? 'Done' : 'Touched'}
                    </button>
                    <button className="matchup-btn" onClick={() => setMatchupProspect(p)}>Matchup</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="matchup-divider" />
          <div className="panel-label">Book Appointment</div>
          <BookAppointment
            prospect={matchupProspect}
            onClose={() => setMatchupProspect(null)}
            onBooked={() => setMatchupProspect(null)}
          />
        </aside>

      </div>

      {view !== 'profile' && <div className="status-bar" style={{ display: '' }}>
        <div className="sb-item"><div className="dot dot-green" /> System Active</div>
        <div className="sb-divider" />
        <div className="sb-item">{clock}</div>
        <div className="sb-divider" />
        <div className="sb-item"><span className="agents-num">9</span>&nbsp;Agents Ready</div>
        <div className="sb-right sb-item"><div className="dot dot-teal" /> {profile?.full_name || 'Team Rise'}</div>
      </div>}
    </>
  )
}
