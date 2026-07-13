import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'
import BookAppointment from './BookAppointment'
import ProfilePage from './ProfilePage'
import DailyReport from './DailyReport'
import LicensingPage from './LicensingPage'
import GXTrackerPage from './GXTrackerPage'
import ProspectsPage from './ProspectsPage'
import RecognitionPage from './RecognitionPage'
import ActivityFeed from './ActivityFeed'
import FollowUpPage from './FollowUpPage'
import Confetti from './Confetti'
import RecruitPipeline from './RecruitPipeline'

const QUICK_ACTIONS = [
  { icon: '📊', label: 'Daily Report', view: 'daily-report', endpoint: '/api/daily-report' },
  { icon: '👤', label: 'Personal Prospects',    view: 'prospects', prompt: 'Run the Follow-Up Agent for my personal prospect sheet. Check who needs follow-up today.' },
  { icon: '👥', label: 'Team Prospects',        prompt: 'Run the Follow-Up Agent for the team prospect pipeline. Show who needs follow-up across the team.' },
  { icon: '📈', label: 'GX Tracker',            view: 'gx-tracker', prompt: 'Run the Performance Agent to pull the current GX tracker and show where we stand.' },
  { icon: '🏆', label: 'Monthly Contest',       prompt: 'Run the Performance Agent to show current monthly contest standings and progress.' },
  { icon: '🎉', label: 'Recognition',           view: 'recognition', prompt: "Run the Recognition Agent to pull this week's recognition milestones and shoutouts." },
  { icon: '📐', label: 'Metrics (NPR/PPR/PPL)', prompt: 'Run the Metrics Agent to calculate current NPR, PPR, and PPL for Team Rise.' },
  { icon: '📋', label: 'BPM Follow-Up',         view: 'follow-up', prompt: 'Run the Recruiting Pipeline Agent for BPM follow-up. Show which Captains need to follow up with their BPMs today.' },
  { icon: '⚖️', label: 'Closing Ratio',         prompt: 'Run the Closing Ratio Agent. Show conversion rates from Step 1 through to application submitted.' },
]

const AGENTS = [
  { icon: '🔄', name: 'Follow-Up Agent',    desc: 'Prospects, BPM, Fast Start and appts',  view: 'follow-up', prompt: 'Launch the Follow-Up Agent for Team Rise. Manage personal and team prospect pipelines and client annual reviews.' },
  { icon: '🆕', name: 'Onboarding Agent',    desc: 'New recruit welcome and milestones',     prompt: 'Launch the Recruit Onboarding Agent for Team Rise. Check for new recruits who need welcome emails or follow-up.' },
  { icon: '📜', name: 'Licensing Agent',     desc: 'Auto messages and test tracking',        view: 'licensing', prompt: 'Launch the Licensing Agent for Team Rise. Check the pipeline and show upcoming test dates.' },
  { icon: '📅', name: 'Event Coordinator',   desc: 'Events, sponsorships and logistics',     prompt: 'Launch the Event Coordinator Agent for Team Rise. Show upcoming events and any logistics tasks.' },
  { icon: '🏅', name: 'Recognition Agent',   desc: 'Promotions and production awards',       view: 'recognition', prompt: "Launch the Recognition Agent for Team Rise. Pull this week's promotions and production awards." },
  { icon: '📁', name: 'Fast Start Pipeline', desc: 'Steps 4/5, BPM and recruit tracker',     prompt: 'Launch the Recruiting Pipeline Agent for Team Rise. Show Steps 4 and 5 status and BPM follow-ups.' },
  { icon: '📱', name: 'Social Media Agent',  desc: 'Instagram, TikTok and content',          prompt: 'Launch the Social Media Agent for Team Rise. Help plan content or write captions.' },
  { icon: '👑', name: 'Queen Bee',           desc: 'Master orchestrator for all tasks',       prompt: 'Queen Bee, I need your help. What can you do for Team Rise today?', queen: true },
]

const monthEnd = () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const DEFAULT_GX = { partners: { current: 0, goal: 3 }, points: { current: 0, goal: 15000 }, deadline: monthEnd() }

// "Oct 8–10, 2026" same-month, "Jul 30 – Aug 2, 2026" cross-month
function formatEventDateRange(startStr, endStr) {
  if (!startStr || !endStr) return ''
  const start = new Date(startStr + 'T00:00:00')
  const end   = new Date(endStr + 'T00:00:00')
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const startFmt = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endFmt = sameMonth
    ? end.toLocaleDateString('en-US', { day: 'numeric' })
    : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${startFmt}–${endFmt}, ${end.getFullYear()}`
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
  const [fnaFile, setFnaFile]       = useState(null)
  const [fnaDrag, setFnaDrag]       = useState(false)
  const [fnaRunning, setFnaRunning] = useState(false)
  const [fnaResult, setFnaResult]   = useState(null)
  const [matchupProspect, setMatchupProspect] = useState(null)
  const [view, setView] = useState('dashboard')
  const [gxSyncing, setGxSyncing] = useState(false)
  const [showLovableBanner, setShowLovableBanner] = useState(true)
  const [lovableKey, setLovableKey] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [recruitList, setRecruitList]     = useState([])
  const [recruitLoading, setRecruitLoading] = useState(false)
  const [convention, setConvention]       = useState(null)
  const [editingEvent, setEditingEvent]   = useState(false)
  const [eventForm, setEventForm]         = useState(null)
  const [eventSaving, setEventSaving]     = useState(false)
  const [linkCopied, setLinkCopied]       = useState(false)
  const [ticketScope, setTicketScope]     = useState(new Set(['base', 'superbase']))

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

  function loadConvention() {
    return fetch('/api/convention')
      .then(r => r.json())
      .then(res => { if (res.ok) setConvention(res.data) })
      .catch(() => { /* widget simply hides */ })
  }
  useEffect(() => { loadConvention() }, [])

  function openEventEditor() {
    setEventForm({
      event:              convention?.event || '',
      location:           convention?.location || '',
      start_date:         convention?.start_date || '',
      end_date:           convention?.end_date || '',
      goal:               convention?.goal || '',
      registration_link:  convention?.registration_link || '',
    })
    setEditingEvent(true)
  }

  async function copyRegistrationLink() {
    if (!convention?.registration_link) return
    try {
      await navigator.clipboard.writeText(convention.registration_link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (e) { console.error('Clipboard write failed:', e) }
  }

  async function saveEventEditor() {
    if (!eventForm?.event || !eventForm?.start_date || !eventForm?.end_date) return
    setEventSaving(true)
    try {
      const goalNum = parseInt(eventForm.goal, 10)
      const nextData = {
        ...(convention || {}),
        event:              eventForm.event.trim(),
        location:           eventForm.location.trim(),
        start_date:         eventForm.start_date,
        end_date:           eventForm.end_date,
        goal:               Number.isFinite(goalNum) && goalNum > 0 ? goalNum : null,
        registration_link:  eventForm.registration_link.trim() || null,
      }
      const { error } = await supabase
        .from('report_snapshots')
        .upsert({ report_key: 'convention', data: nextData, updated_at: new Date().toISOString() }, { onConflict: 'report_key' })
      if (error) throw error
      await loadConvention()
      setEditingEvent(false)
    } catch (e) {
      console.error('Failed to save event:', e)
    } finally {
      setEventSaving(false)
    }
  }

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

  // view/endpoint are code-level routing, not something a saved profile blob
  // should be able to override — always take those from the built-in def when
  // one matches, so a stale/blank saved value (e.g. view: '' captured before a
  // page existed) can never re-lock a feature that's since been unlocked.
  const activeAgents = profile?.custom_agents?.length
    ? profile.custom_agents.map(a => {
        const def = AGENTS.find(d => d.name === a.name)
        return def ? { ...def, ...a, view: def.view } : a
      })
    : AGENTS
  const activeQuickActions = profile?.custom_quick_actions?.length
    ? profile.custom_quick_actions.map(a => {
        const def = QUICK_ACTIONS.find(q => q.label === a.label)
        return def ? { ...def, ...a, endpoint: def.endpoint, view: def.view } : a
      })
    : QUICK_ACTIONS

  function handleDrop(e) {
    e.preventDefault()
    setFnaDrag(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') setFnaFile(file)
  }

  async function runFna() {
    if (!fnaFile || fnaRunning) return
    setFnaRunning(true)
    setFnaResult(null)
    const time = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    try {
      const bytes = new Uint8Array(await fnaFile.arrayBuffer())
      let binary = ''
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
      }
      const res = await fetch('/api/run-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Run the FNA process on the attached FNA collection sheet PDF. Extract the client data and produce the full FNA report.',
          skillFile: 'run-fna',
          apiKey: profile?.anthropic_api_key || undefined,
          pdfBase64: btoa(binary),
        }),
      })
      const data = await res.json()
      setFnaResult({ skill: 'Run FNA — ' + fnaFile.name, ok: data.ok, response: data.ok ? data.response : (data.error || 'Unknown error'), time: time() })
    } catch (e) {
      setFnaResult({ skill: 'Run FNA — ' + fnaFile.name, ok: false, response: e.message, time: time() })
    }
    setFnaRunning(false)
  }

  // Hide anyone who became a recruit (sheet notes) or was manually graduated — sheet rows stay untouched
  const visiblePipeline = pipeline.filter(p => !graduated[p.name] && !p.joined)
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

  // Views that take over the whole screen (own header) vs. the profile page (keeps app header)
  const fullPageViews = ['daily-report', 'licensing', 'gx-tracker', 'prospects', 'recognition', 'follow-up']
  const isFullPage    = fullPageViews.includes(view)
  const offDashboard  = isFullPage || view === 'profile'

  return (
    <>
      <header style={{ display: isFullPage ? 'none' : undefined }}>
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
      {view === 'daily-report' && <DailyReport onBack={() => setView('dashboard')} />}
      {view === 'licensing' && <LicensingPage onBack={() => setView('dashboard')} />}
      {view === 'gx-tracker' && <GXTrackerPage onBack={() => setView('dashboard')} />}
      {view === 'prospects' && <ProspectsPage onBack={() => setView('dashboard')} />}
      {view === 'recognition' && <RecognitionPage onBack={() => setView('dashboard')} />}
      {view === 'follow-up' && <FollowUpPage onBack={() => setView('dashboard')} />}

      <div className="dashboard" style={{ display: offDashboard ? 'none' : 'grid' }}>

        {/* LEFT — Convention + GX Stats + Lovable App */}
        <div className="col-left">
          {convention && (() => {
            const start = new Date(convention.start_date + 'T00:00:00')
            const now = new Date(); now.setHours(0, 0, 0, 0)
            const days = Math.ceil((start - now) / 86400000)
            const live = days <= 0 && now <= new Date(convention.end_date + 'T23:59:59')
            const hasCount = convention.goal != null && convention.goal > 0
            return (
              <aside className="conv-panel">
                <div className="conv-panel-head">
                  <div className="panel-label" style={{ marginBottom: 0, paddingBottom: 0, border: 'none' }}>
                    {convention.event}{convention.location ? ` · ${convention.location}` : ''}
                  </div>
                  <button className="conv-edit-btn" onClick={openEventEditor} title="Edit event">✎</button>
                </div>

                {editingEvent ? (
                  <div className="conv-edit-form">
                    <label>Event name<input value={eventForm.event} onChange={e => setEventForm(f => ({ ...f, event: e.target.value }))} placeholder="Champions Summit" /></label>
                    <label>Location<input value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="Nashville, TN" /></label>
                    <div className="conv-edit-row">
                      <label>Start date<input type="date" value={eventForm.start_date} onChange={e => setEventForm(f => ({ ...f, start_date: e.target.value }))} /></label>
                      <label>End date<input type="date" value={eventForm.end_date} onChange={e => setEventForm(f => ({ ...f, end_date: e.target.value }))} /></label>
                    </div>
                    <label>Registration goal (optional)<input type="number" min="0" value={eventForm.goal} onChange={e => setEventForm(f => ({ ...f, goal: e.target.value }))} placeholder="leave blank to hide count" /></label>
                    <label>Registration link (optional)<input value={eventForm.registration_link} onChange={e => setEventForm(f => ({ ...f, registration_link: e.target.value }))} placeholder="https://..." /></label>
                    <div className="conv-edit-actions">
                      <button className="conv-edit-cancel" onClick={() => setEditingEvent(false)} disabled={eventSaving}>Cancel</button>
                      <button className="conv-edit-save" onClick={saveEventEditor} disabled={eventSaving || !eventForm.event || !eventForm.start_date || !eventForm.end_date}>{eventSaving ? 'Saving…' : 'Save'}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="conv-row">
                      <div className="conv-days">
                        <div className="conv-days-num">{live ? '🎰' : days}</div>
                        <div className="conv-days-label">{live ? "It's event week!" : days === 1 ? 'day to go' : 'days to go'}</div>
                      </div>
                      {hasCount && (
                        <div className="conv-count">
                          <div className="conv-count-num">{convention.total || 0}</div>
                          <div className="conv-count-label">confirmed of {convention.goal}</div>
                        </div>
                      )}
                    </div>
                    {hasCount && <div className="progress-track"><div className="progress-fill" style={{ width: Math.min(100, ((convention.total || 0) / convention.goal) * 100) + '%' }} /></div>}
                    <div className="conv-dates">{formatEventDateRange(convention.start_date, convention.end_date)}</div>
                    {convention.tickets_total > 0 && (() => {
                      const byScope = convention.tickets_by_scope || {}
                      const scopes = ['base', 'superbase', 'superteam']
                      const selected = scopes.filter(s => ticketScope.has(s))
                      const shown = selected.reduce((acc, s) => {
                        const b = byScope[s] || { total: 0, named: 0 }
                        acc.total += b.total; acc.named += b.named
                        return acc
                      }, { total: 0, named: 0 })
                      function toggleTicketScope(s) {
                        setTicketScope(prev => {
                          const next = new Set(prev)
                          next.has(s) ? next.delete(s) : next.add(s)
                          if (next.size === 0) next.add('base')
                          return next
                        })
                      }
                      return (
                        <div className="conv-tickets">
                          <div className="conv-tickets-label">
                            <span>Tickets with a name</span>
                            <span className="conv-tickets-num">{shown.named} / {shown.total}</span>
                          </div>
                          <div className="progress-track"><div className="progress-fill gold" style={{ width: (shown.total ? Math.min(100, (shown.named / shown.total) * 100) : 0) + '%' }} /></div>
                          <div className="conv-scope-row">
                            {scopes.map(s => (
                              <button
                                key={s}
                                className={'conv-scope-chip' + (ticketScope.has(s) ? ' active' : '')}
                                onClick={() => toggleTicketScope(s)}
                                title={s === 'superteam' ? 'No data tracked for this account' : ''}
                              >
                                {s === 'base' ? 'Base' : s === 'superbase' ? 'Super Base' : 'Super Team'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                    {convention.registration_link && (
                      <button className="conv-copy-link-btn" onClick={copyRegistrationLink}>
                        {linkCopied ? '✓ Copied!' : '🔗 Copy Registration Link'}
                      </button>
                    )}
                  </>
                )}
              </aside>
            )
          })()}

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
        </div>

        {/* CENTER — Actions + Agents + FNA + Feed */}
        <main className="col-center">
          <section className="quick-section">
            <div className="section-label">Quick Actions</div>
            <div className="pill-grid">
              {activeQuickActions.map((a, i) => (
                <button
                  key={i}
                  className={`pill${!a.view ? ' pill--locked' : ''}`}
                  style={{ animationDelay: `${0.03 + i * 0.04}s` }}
                  disabled={!a.view}
                  title={!a.view ? 'Coming soon' : ''}
                  onClick={() => a.view && setView(a.view)}
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
                  className={`card${a.queen ? ' queen' : ''}${!a.view ? ' card--locked' : ''}`}
                  style={{ animationDelay: `${0.06 + i * 0.05}s` }}
                  title={!a.view ? 'Coming soon' : ''}
                  onClick={() => a.view && setView(a.view)}
                >
                  <div className="card-icon">{a.icon}</div>
                  <div className="card-name">{a.name}</div>
                  <div className="card-desc">{a.desc}</div>
                  <div className="card-foot">
                    <button className="launch" disabled={!a.view} onClick={e => { e.stopPropagation(); a.view && setView(a.view) }}>Launch</button>
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
                    <button className="fna-run-btn" disabled={fnaRunning} onClick={e => { e.stopPropagation(); runFna() }}>
                      {fnaRunning ? 'Running…' : 'Run FNA'}
                    </button>
                    <button className="fna-clear-btn" onClick={e => { e.stopPropagation(); setFnaFile(null); setFnaResult(null) }}>Clear</button>
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
            {(fnaRunning || fnaResult) && (
              <ActivityFeed
                items={fnaResult ? [fnaResult] : []}
                loading={fnaRunning}
                activeSkill="Run FNA"
              />
            )}
          </section>

          {/* Team RISE App */}
          <section className="lovable-panel">
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
                <div key={p.name + '|' + i} className={'prospect' + (touched[i] ? ' is-touched' : '') + (graduating[p.name] ? ' is-graduating' : '')}>
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

      {!offDashboard && <div className="status-bar" style={{ display: '' }}>
        <div className="sb-item"><div className="dot dot-green" /> System Active</div>
        <div className="sb-divider" />
        <div className="sb-item">{clock}</div>
        <div className="sb-divider" />
        <div className="sb-item"><span className="agents-num">{activeAgents.length}</span>&nbsp;Agents Ready</div>
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
