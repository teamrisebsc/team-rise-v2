import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import ActivityFeed from './ActivityFeed'
import BookAppointment from './BookAppointment'
import ProfilePage from './ProfilePage'
import Confetti from './Confetti'
import RecruitPipeline from './RecruitPipeline'

const QUICK_ACTIONS = [
  { icon: '📊', label: 'Daily Report',          prompt: '', endpoint: '/api/daily-report' },
  { icon: '👤', label: 'Personal Prospects',    prompt: 'Run the Follow-Up Agent for my personal prospect sheet. Check who needs follow-up today.' },
  { icon: '👥', label: 'Team Prospects',        prompt: 'Run the Follow-Up Agent for the team prospect pipeline. Show who needs follow-up across the team.' },
  { icon: '📈', label: 'GX Tracker',            prompt: 'Run the Performance Agent to pull the current GX tracker and show where we stand.' },
  { icon: '🏆', label: 'Monthly Contest',       prompt: 'Run the Performance Agent to show current monthly contest standings and progress.' },
  { icon: '🎉', label: 'Recognition',           prompt: "Run the Recognition Agent to pull this week's recognition milestones and shoutouts." },
  { icon: '📐', label: 'Metrics (NPR/PPR/PPL)', prompt: 'Run the Metrics Agent to calculate current NPR, PPR, and PPL for Team Rise.' },
  { icon: '📋', label: 'BPM Follow-Up',         prompt: 'Run the Recruiting Pipeline Agent for BPM follow-up. Show which Captains need to follow up with their BPMs today.' },
  { icon: '⚖️', label: 'Closing Ratio',         prompt: 'Run the Closing Ratio Agent. Show conversion rates from Step 1 through to application submitted.' },
]

const AGENTS = [
  { icon: '🔄', name: 'Follow-Up Agent',    desc: 'Personal and team prospect pipeline',   prompt: 'Launch the Follow-Up Agent for Team Rise. Manage personal and team prospect pipelines and client annual reviews.' },
  { icon: '🆕', name: 'Onboarding Agent',    desc: 'New recruit welcome and milestones',     prompt: 'Launch the Recruit Onboarding Agent for Team Rise. Check for new recruits who need welcome emails or follow-up.' },
  { icon: '📜', name: 'Licensing Agent',     desc: 'Auto messages and test tracking',        prompt: 'Launch the Licensing Agent for Team Rise. Check the pipeline and show upcoming test dates.' },
  { icon: '📅', name: 'Event Coordinator',   desc: 'Events, sponsorships and logistics',     prompt: 'Launch the Event Coordinator Agent for Team Rise. Show upcoming events and any logistics tasks.' },
  { icon: '🏅', name: 'Recognition Agent',   desc: 'Promotions and production awards',       prompt: "Launch the Recognition Agent for Team Rise. Pull this week's promotions and production awards." },
  { icon: '📁', name: 'Fast Start Pipeline', desc: 'Steps 4/5, BPM and recruit tracker',     prompt: 'Launch the Recruiting Pipeline Agent for Team Rise. Show Steps 4 and 5 status and BPM follow-ups.' },
  { icon: '📱', name: 'Social Media Agent',  desc: 'Instagram, TikTok and content',          prompt: 'Launch the Social Media Agent for Team Rise. Help plan content or write captions.' },
  { icon: '👑', name: 'Queen Bee',           desc: 'Master orchestrator for all tasks',       prompt: 'Queen Bee, I need your help. What can you do for Team Rise today?', queen: true },
]

const DEFAULT_GX = { partners: { current: 0, goal: 3 }, points: { current: 0, goal: 15000 }, deadline: 'June 30, 2026' }

const DEFAULT_REPORT_CONFIG = {
  showTimestamp:    true,
  showPdf:          true,
  expandByDefault:  true,
  density:          'normal',
}

function ReportConfigPanel({ config, quickActions, agents, enabledReports, onSave, onCancel }) {
  const [cfg, setCfg] = useState({ ...config })
  const [enabled, setEnabled] = useState(new Set(enabledReports))

  function toggle(key) {
    setEnabled(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="report-config-panel">
      <div className="rcp-title">Configure Report View</div>
      <div className="rcp-desc">Enable reports as you build them. Display settings apply to all active reports.</div>

      <div className="rcp-section-head">Display Settings</div>
      <div className="rcp-options">
        <label className="rcp-toggle">
          <input type="checkbox" checked={cfg.showTimestamp} onChange={e => setCfg({ ...cfg, showTimestamp: e.target.checked })} />
          <span>Show timestamps on reports</span>
        </label>
        <label className="rcp-toggle">
          <input type="checkbox" checked={cfg.showPdf} onChange={e => setCfg({ ...cfg, showPdf: e.target.checked })} />
          <span>Show PDF export button</span>
        </label>
        <label className="rcp-toggle">
          <input type="checkbox" checked={cfg.expandByDefault} onChange={e => setCfg({ ...cfg, expandByDefault: e.target.checked })} />
          <span>Expand reports fully by default</span>
        </label>
        <div className="rcp-row">
          <span className="rcp-row-label">Display density</span>
          <div className="rcp-segmented">
            <button className={cfg.density === 'normal' ? 'active' : ''} onClick={() => setCfg({ ...cfg, density: 'normal' })}>Normal</button>
            <button className={cfg.density === 'compact' ? 'active' : ''} onClick={() => setCfg({ ...cfg, density: 'compact' })}>Compact</button>
          </div>
        </div>
      </div>

      <div className="rcp-section-head">Quick Actions</div>
      <div className="rcp-report-list">
        {quickActions.map(a => (
          <label className="rcp-toggle" key={a.label}>
            <input type="checkbox" checked={enabled.has(a.label)} onChange={() => toggle(a.label)} />
            <span>{a.icon} {a.label}</span>
          </label>
        ))}
      </div>

      <div className="rcp-section-head">AI Agents</div>
      <div className="rcp-report-list">
        {agents.map(a => (
          <label className="rcp-toggle" key={a.name}>
            <input type="checkbox" checked={enabled.has(a.name)} onChange={() => toggle(a.name)} />
            <span>{a.icon} {a.name}</span>
          </label>
        ))}
      </div>

      <div className="rcp-footer">
        <button className="rcp-cancel" onClick={onCancel}>Cancel</button>
        <button className="rcp-save" onClick={() => onSave(cfg, enabled)}>Save</button>
      </div>
    </div>
  )
}

export default function App() {
  const { profile, signOut, updateProfile } = useAuth()
  const [theme, setTheme]       = useState(() => localStorage.getItem('tr-theme-' + (profile?.id || 'default')) || 'dark')
  const [clock, setClock]       = useState('')
  const [liveDate, setLiveDate] = useState('')
  const [pipeline, setPipeline] = useState([])
  const [gx, setGx]             = useState(DEFAULT_GX)
  const [touched, setTouched]     = useState({})
  const [graduated, setGraduated] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pipeline_graduated') || '{}') } catch { return {} }
  })
  const [graduating, setGraduating] = useState({})
  const [confetti, setConfetti]     = useState({ active: false, name: '', type: 'teammate' })
  const [fnaFile, setFnaFile]   = useState(null)
  const [fnaDrag, setFnaDrag]   = useState(false)
  const [feedItems, setFeedItems] = useState([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [activeSkill, setActiveSkill] = useState('')
  const feedRef = useRef(null)
  const [matchupProspect, setMatchupProspect] = useState(null)
  const [view, setView] = useState('dashboard')
  const [gxSyncing, setGxSyncing] = useState(false)
  const [showLovableBanner, setShowLovableBanner] = useState(true)
  const [lovableKey, setLovableKey] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [configuredReports, setConfiguredReports] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('tr-configured-reports') || '[]')) }
    catch { return new Set() }
  })
  const [reportConfig, setReportConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tr-report-config') || 'null') || DEFAULT_REPORT_CONFIG }
    catch { return DEFAULT_REPORT_CONFIG }
  })
  const [showReportConfig, setShowReportConfig] = useState(false)
  const [recruitList, setRecruitList]     = useState([])
  const [recruitLoading, setRecruitLoading] = useState(false)

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

  useEffect(() => {
    if (profile?.full_name) loadRecruitSteps()
  }, [profile?.full_name])

  async function loadRecruitSteps() {
    setRecruitLoading(true)
    try {
      const name = profile?.full_name || ''
      const res = await fetch(`/api/recruit-pipeline?name=${encodeURIComponent(name)}`)
      const data = await res.json()
      if (data.recruits) setRecruitList(data.recruits)
    } catch(e) { /* silent */ }
    setRecruitLoading(false)
  }

  useEffect(() => {
    if (profile?.full_name) fetchGxStats()
  }, [profile?.full_name])

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

  function graduateProspect(name) {
    setConfetti({ active: true, name, type: 'teammate' })
    setGraduating(g => ({ ...g, [name]: true }))
    setTimeout(() => {
      const next = { ...graduated, [name]: true }
      setGraduated(next)
      localStorage.setItem('pipeline_graduated', JSON.stringify(next))
      setGraduating(g => { const n = { ...g }; delete n[name]; return n })
    }, 550)
  }

  function graduateClient(name) {
    setConfetti({ active: true, name, type: 'client' })
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

  const activeAgents       = profile?.custom_agents?.length       ? profile.custom_agents       : AGENTS
  const activeQuickActions = profile?.custom_quick_actions?.length ? profile.custom_quick_actions : QUICK_ACTIONS

  async function runSkill(prompt, name, skillFile, endpoint) {
    setFeedLoading(true)
    setActiveSkill(name)
    feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    try {
      const url  = endpoint || '/api/run-skill'
      const body = endpoint
        ? JSON.stringify({})
        : JSON.stringify({ prompt, skillFile: skillFile || null, apiKey: profile?.anthropic_api_key })
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      const data = await res.json()
      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      setFeedItems(prev => [{ skill: name, response: data.response || data.error || 'Done.', time, ok: !!data.ok }, ...prev].slice(0, 10))
    } catch(e) {
      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      setFeedItems(prev => [{ skill: name, response: `Error: ${e.message}`, time, ok: false }, ...prev].slice(0, 10))
    }
    setFeedLoading(false)
    setActiveSkill('')
  }

  function saveReportConfig(cfg, enabledSet) {
    setReportConfig(cfg)
    setConfiguredReports(enabledSet)
    localStorage.setItem('tr-report-config', JSON.stringify(cfg))
    localStorage.setItem('tr-configured-reports', JSON.stringify([...enabledSet]))
    setShowReportConfig(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setFnaDrag(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') setFnaFile(file)
  }

  const visiblePipeline = pipeline.filter(p => !graduated[p.name])
  const hotCount  = visiblePipeline.filter(p => p.heat === 'hot').length
  const warmCount = visiblePipeline.filter(p => p.heat === 'warm').length
  const pPct  = Math.min(100, Math.round((gx.partners.current / gx.partners.goal) * 100))
  const ptPct = Math.min(100, Math.round((gx.points.current / gx.points.goal) * 100))

  const gxDaysLeft = (() => {
    if (!gx.deadline) return null
    const deadline = new Date(gx.deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadline.setHours(0, 0, 0, 0)
    return Math.max(0, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)))
  })()

  const notifications = (() => {
    const items = []
    // GX pace alerts
    if (gx.deadline && gxDaysLeft !== null) {
      const deadline = new Date(gx.deadline)
      const monthStart = new Date(deadline.getFullYear(), deadline.getMonth(), 1)
      const totalDays = Math.ceil((deadline - monthStart) / (1000 * 60 * 60 * 24)) + 1
      const daysElapsed = totalDays - gxDaysLeft
      const pacePct = daysElapsed / totalDays

      const partnersPace = gx.partners.goal > 0 ? gx.partners.current / gx.partners.goal : 1
      const pointsPace   = gx.points.goal   > 0 ? gx.points.current   / gx.points.goal   : 1

      if (gxDaysLeft <= 7 && partnersPace < 1)
        items.push({ level: 'urgent', text: `${gxDaysLeft}d left — ${gx.partners.current}/${gx.partners.goal} partners` })
      else if (partnersPace < pacePct - 0.15)
        items.push({ level: 'warning', text: `Partners behind pace — ${gx.partners.current}/${gx.partners.goal} (${Math.round(pacePct * 100)}% through month)` })

      if (gxDaysLeft <= 7 && pointsPace < 1)
        items.push({ level: 'urgent', text: `${gxDaysLeft}d left — ${gx.points.current.toLocaleString()}/${gx.points.goal.toLocaleString()} pts` })
      else if (pointsPace < pacePct - 0.15)
        items.push({ level: 'warning', text: `Points behind pace — ${gx.points.current.toLocaleString()}/${gx.points.goal.toLocaleString()}` })
    }
    // Pipeline alerts
    if (hotCount > 0)
      items.push({ level: 'urgent', text: `${hotCount} hot prospect${hotCount > 1 ? 's' : ''} need follow-up` })
    if (warmCount > 0)
      items.push({ level: 'info', text: `${warmCount} warm prospect${warmCount > 1 ? 's' : ''} in pipeline` })

    return items
  })()

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
          <div className="notif-wrap">
            <button className="notif-bell" onClick={() => setShowNotifications(v => !v)} title="Notifications">
              🔔
              {notifications.length > 0 && <span className={`notif-count ${notifications.some(n => n.level === 'urgent') ? 'urgent' : 'warning'}`}>{notifications.length}</span>}
            </button>
            {showNotifications && (
              <div className="notif-dropdown">
                <div className="notif-header">Notifications</div>
                {notifications.length === 0
                  ? <div className="notif-empty">All clear!</div>
                  : notifications.map((n, i) => (
                      <div key={i} className={`notif-item ${n.level}`}>
                        <span className="notif-dot" />
                        {n.text}
                      </div>
                    ))
                }
              </div>
            )}
          </div>
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            <span className="btn-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className="btn-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <button className="logout-btn" onClick={signOut}>
            <span className="btn-icon">⏏</span>
            <span className="btn-label">Sign Out</span>
          </button>
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
            <div className="gx-deadline">
              <span>Deadline: {gx.deadline}</span>
              {gxDaysLeft !== null && (
                <span className={`gx-days-badge ${gxDaysLeft <= 7 ? 'urgent' : gxDaysLeft <= 14 ? 'warning' : ''}`}>
                  {gxDaysLeft === 0 ? 'Last day!' : `${gxDaysLeft}d left`}
                </span>
              )}
            </div>
            <button className="sync-btn" onClick={syncGx} disabled={gxSyncing}>
            {gxSyncing ? 'Syncing…' : 'Sync GX'}
          </button>
          </aside>

          <RecruitPipeline recruits={recruitList} loading={recruitLoading} onRefresh={loadRecruitSteps} />

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
              {activeQuickActions.map((a, i) => (
                <button
                  key={i}
                  className={`pill${!configuredReports.has(a.label) ? ' pill--locked' : ''}`}
                  style={{ animationDelay: `${0.03 + i * 0.04}s` }}
                  disabled={!configuredReports.has(a.label)}
                  title={!configuredReports.has(a.label) ? 'Enable this report in Configure Report View to unlock' : ''}
                  onClick={() => runSkill(a.prompt, a.label, a.skill, a.endpoint)}
                >
                  <span className="em">{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </section>

          <section className="agents-section">
            <div className="section-label">AI Agents</div>
            <div className="agents-grid">
              {activeAgents.map((a, i) => (
                <div
                  key={i}
                  className={`card${a.queen ? ' queen' : ''}${!configuredReports.has(a.name) ? ' card--locked' : ''}`}
                  style={{ animationDelay: `${0.06 + i * 0.05}s` }}
                  title={!configuredReports.has(a.name) ? 'Enable this agent in Configure Report View to unlock' : ''}
                  onClick={() => configuredReports.has(a.name) && runSkill(a.prompt, a.name, a.skill)}
                >
                  <div className="card-icon">{a.icon}</div>
                  <div className="card-name">{a.name}</div>
                  <div className="card-desc">{a.desc}</div>
                  <div className="card-foot">
                    <button className="launch" disabled={!configuredReports.has(a.name)} onClick={e => { e.stopPropagation(); runSkill(a.prompt, a.name, a.skill) }}>Launch</button>
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
          <section className="feed-section" ref={feedRef}>
            <div className="feed-header">
              <div className="section-label" style={{ marginBottom: 0 }}>Activity Feed</div>
              <button
                className={`feed-config-btn${configuredReports.size > 0 ? ' configured' : ''}`}
                onClick={() => setShowReportConfig(v => !v)}
              >
                {configuredReports.size > 0 ? `⚙ ${configuredReports.size} Active` : '⚙ Configure Reports'}
              </button>
            </div>
            {showReportConfig && (
              <ReportConfigPanel
                config={reportConfig}
                quickActions={activeQuickActions}
                agents={activeAgents}
                enabledReports={configuredReports}
                onSave={saveReportConfig}
                onCancel={() => setShowReportConfig(false)}
              />
            )}
            <ActivityFeed items={feedItems} loading={feedLoading} activeSkill={activeSkill} reportConfig={reportConfig} />
          </section>
        </main>

        {/* RIGHT — Pipeline + Book a Matchup */}
        <aside className="col-right">
          <div className="panel-label">Personal Prospect Pipeline</div>
          <div className="pipeline-counts">
            <span className="heat-badge hot">{hotCount} Hot</span>
            <span className="heat-badge warm">{warmCount} Warm</span>
            <span className="heat-badge total">{visiblePipeline.length} Total</span>
          </div>

          {pipeline.length === 0 ? (
            <div className="pipeline-empty">Loading prospects...</div>
          ) : (
            <div className="pipeline-list">
              {visiblePipeline.map((p, i) => (
                <div key={p.name} className={'prospect' + (touched[i] ? ' is-touched' : '') + (graduating[p.name] ? ' is-graduating' : '')}>
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
                    <button className="joined-btn" onClick={() => graduateProspect(p.name)}>New Teammate!</button>
                    <button className="client-btn" onClick={() => graduateClient(p.name)}>New Client!</button>
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

      <Confetti
        active={confetti.active}
        name={confetti.name}
        type={confetti.type}
        onDone={() => setConfetti({ active: false, name: '', type: 'teammate' })}
      />
    </>
  )
}
