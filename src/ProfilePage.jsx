import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ROLES = ['TA', 'A', 'SA', 'MD', 'SMD']

const DEFAULT_AGENTS = [
  { icon: '🔄', name: 'Follow-Up Agent',    desc: 'Personal and team prospect pipeline',   prompt: 'Launch the Follow-Up Agent for Team RISE. Manage personal and team prospect pipelines and client annual reviews.', skill: '' },
  { icon: '📊', name: 'Closing Ratio',       desc: 'Step 1 to AMA to App conversion',       prompt: 'Launch the Closing Ratio Agent. Show conversion rates from Step 1 through to application submitted.', skill: '' },
  { icon: '🆕', name: 'Onboarding Agent',    desc: 'New recruit welcome and milestones',     prompt: 'Launch the Recruit Onboarding Agent for Team RISE. Check for new recruits who need welcome emails or follow-up.', skill: '' },
  { icon: '📜', name: 'Licensing Agent',     desc: 'Auto messages and test tracking',        prompt: 'Launch the Licensing Agent for Team RISE. Check the pipeline and show upcoming test dates.', skill: '' },
  { icon: '📅', name: 'Event Coordinator',   desc: 'Events, sponsorships and logistics',     prompt: 'Launch the Event Coordinator Agent for Team RISE. Show upcoming events and any logistics tasks.', skill: '' },
  { icon: '🏅', name: 'Recognition Agent',   desc: 'Promotions and production awards',       prompt: "Launch the Recognition Agent for Team RISE. Pull this week's promotions and production awards.", skill: '' },
  { icon: '📁', name: 'Recruiting Pipeline', desc: 'Steps 4/5, BPM and recruit tracker',     prompt: 'Launch the Recruiting Pipeline Agent for Team RISE. Show Steps 4 and 5 status and BPM follow-ups.', skill: '' },
  { icon: '📱', name: 'Social Media Agent',  desc: 'Instagram, TikTok and content',          prompt: 'Launch the Social Media Agent for Team RISE. Help plan content or write captions.', skill: '' },
  { icon: '👑', name: 'Queen Bee',           desc: 'Master orchestrator for all tasks',      prompt: 'Queen Bee, I need your help. What can you do for Team RISE today?', skill: '', queen: true },
]

const DEFAULT_QUICK_ACTIONS = [
  { icon: '📊', label: 'Daily Report',          prompt: 'Run the daily report for Team RISE.', skill: 'daily-report' },
  { icon: '👤', label: 'Personal Prospects',    prompt: 'Run the Follow-Up Agent for my personal prospect sheet. Check who needs follow-up today.', skill: '' },
  { icon: '👥', label: 'Team Prospects',        prompt: 'Run the Follow-Up Agent for the team prospect pipeline. Show who needs follow-up across the team.', skill: '' },
  { icon: '📈', label: 'GX Tracker',            prompt: 'Run the Performance Agent to pull the current GX tracker and show where we stand.', skill: '' },
  { icon: '🏆', label: 'Monthly Contest',       prompt: 'Run the Performance Agent to show current monthly contest standings and progress.', skill: '' },
  { icon: '🎉', label: 'Recognition',           prompt: "Run the Recognition Agent to pull this week's recognition milestones and shoutouts.", skill: '' },
  { icon: '📐', label: 'Metrics (NPR/PPR/PPL)', prompt: 'Run the Metrics Agent to calculate current NPR, PPR, and PPL for Team RISE.', skill: 'mywfg-metrics' },
  { icon: '📋', label: 'BPM Follow-Up',         prompt: 'Run the Recruiting Pipeline Agent for BPM follow-up. Show which Captains need to follow up with their BPMs today.', skill: '' },
]

function Field({ label, value, onChange, type = 'text', placeholder = '', mono = false }) {
  return (
    <div className="prof-field">
      <label className="prof-label">{label}</label>
      <input
        className={'prof-input' + (mono ? ' mono' : '')}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : 'off'}
      />
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="prof-section">
      <div className="prof-section-title">{title}</div>
      {children}
    </div>
  )
}

export default function ProfilePage({ onBack }) {
  const { profile, updateProfile } = useAuth()
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [showApiKey,  setShowApiKey]  = useState(false)

  const [fullName,    setFullName]    = useState('')
  const [role,        setRole]        = useState('SMD')
  const [avatarInit,  setAvatarInit]  = useState('')
  const [phone,       setPhone]       = useState('')
  const [bscEmail,    setBscEmail]    = useState('')
  const [bscPass,     setBscPass]     = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [mywfgHasOwn,   setMywfgHasOwn]   = useState(false)
  const [mywfgCode,     setMywfgCode]     = useState('')
  const [mywfgPass,     setMywfgPass]     = useState('')
  const [showMywfgPass, setShowMywfgPass] = useState(false)
  const [mywfgAccounts, setMywfgAccounts] = useState([])
  const [accessCode,  setAccessCode]  = useState('')
  const [zoomLink,    setZoomLink]    = useState('')
  const [sheetId,     setSheetId]     = useState('')
  const [sheetTabs,   setSheetTabs]   = useState([''])
  const [agents,      setAgents]      = useState(DEFAULT_AGENTS)
  const [quickActions, setQuickActions] = useState(DEFAULT_QUICK_ACTIONS)
  const [availableSkills, setAvailableSkills] = useState([])

  useEffect(() => {
    fetch('/api/skills').then(r => r.json()).then(d => setAvailableSkills(d.skills || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name    || '')
    setRole(profile.role             || 'SMD')
    setAvatarInit(profile.avatar_initials || '')
    setPhone(profile.phone           || '')
    setBscEmail(profile.bscpro_email || '')
    setBscPass(profile.bscpro_password || '')
    setAnthropicKey(profile.anthropic_api_key || '')
    setMywfgHasOwn(profile.mywfg_has_own_account || false)
    setMywfgCode(profile.mywfg_agent_code || '')
    setMywfgPass(profile.mywfg_password   || '')
    setMywfgAccounts(profile.mywfg_accounts || [])
    setAccessCode(profile.lovable_access_code || '')
    setZoomLink(profile.zoom_link    || '')
    setSheetId(profile.google_sheet_id || '')
    const tabs = profile.google_sheet_tabs?.length
      ? profile.google_sheet_tabs
      : [profile.google_sheet_tab, profile.google_sheet_tab_2].filter(Boolean)
    setSheetTabs(tabs.length ? tabs : [''])
    if (profile.custom_agents?.length)       setAgents(profile.custom_agents)
    if (profile.custom_quick_actions?.length) setQuickActions(profile.custom_quick_actions)
  }, [profile])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    const { error: err } = await updateProfile({
      full_name:        fullName,
      role,
      avatar_initials:  avatarInit || fullName.split(' ').map(n => n[0]).join('').toUpperCase(),
      phone,
      bscpro_email:     bscEmail,
      bscpro_password:  bscPass,
      anthropic_api_key: anthropicKey,
      mywfg_has_own_account: mywfgHasOwn,
      mywfg_agent_code:      mywfgCode,
      mywfg_password:        mywfgPass,
      mywfg_accounts:        mywfgAccounts.filter(a => a.code?.trim()),
      lovable_access_code: accessCode,
      zoom_link:        zoomLink,
      google_sheet_id:   sheetId,
      google_sheet_tabs: sheetTabs.filter(t => t.trim()),
      custom_agents:        agents.filter(a => a.name?.trim()),
      custom_quick_actions: quickActions.filter(a => a.label?.trim()),
    })
    setSaving(false)
    if (err) setError(err.message || 'Save failed.')
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  function updateAgent(i, key, val) {
    setAgents(prev => prev.map((a, j) => j === i ? { ...a, [key]: val } : a))
  }
  function updateQA(i, key, val) {
    setQuickActions(prev => prev.map((a, j) => j === i ? { ...a, [key]: val } : a))
  }

  const skillOptions = [{ id: '', name: 'Custom prompt only' }, ...availableSkills]

  return (
    <div className="prof-page">
      <div className="prof-header">
        <button className="prof-back-btn" onClick={onBack}>← Dashboard</button>
        <div className="prof-title-block">
          <div className="prof-avatar">{avatarInit || '?'}</div>
          <div>
            <div className="prof-name">{fullName || 'Your Profile'}</div>
            <div className="prof-role-tag">{role}</div>
          </div>
        </div>
      </div>

      <div className="prof-body">

        <Section title="Identity">
          <div className="prof-row">
            <Field label="Full Name"       value={fullName}   onChange={setFullName}   placeholder="Olivia Sula-Wang" />
            <Field label="Avatar Initials" value={avatarInit} onChange={setAvatarInit} placeholder="OS" mono />
          </div>
          <div className="prof-row">
            <div className="prof-field">
              <label className="prof-label">Role</label>
              <select className="prof-select" value={role} onChange={e => setRole(e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="(310) 555-0000" />
          </div>
        </Section>

        <Section title="BSCpro Credentials">
          <p className="prof-hint">Used to run automated tasks — appointments, notes, licensing — under your account.</p>
          <div className="prof-row">
            <Field label="BSCpro Email"    value={bscEmail} onChange={setBscEmail} placeholder="you@email.com" />
            <div className="prof-field">
              <label className="prof-label">BSCpro Password</label>
              <div className="prof-pass-wrap">
                <input className="prof-input mono" type={showPass ? 'text' : 'password'} value={bscPass} onChange={e => setBscPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                <button type="button" className="prof-pass-toggle" onClick={() => setShowPass(s => !s)}>{showPass ? 'Hide' : 'Show'}</button>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Anthropic API Key">
          <p className="prof-hint">Your personal API key from console.anthropic.com. If left blank, AI agent buttons use the team's shared key. With your own key, you can also customize which agents appear on your dashboard.</p>
          <div className="prof-field">
            <label className="prof-label">API Key</label>
            <div className="prof-pass-wrap">
              <input className="prof-input mono" type={showApiKey ? 'text' : 'password'} value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} placeholder="sk-ant-..." autoComplete="off" />
              <button type="button" className="prof-pass-toggle" onClick={() => setShowApiKey(s => !s)}>{showApiKey ? 'Hide' : 'Show'}</button>
            </div>
          </div>
        </Section>

        <Section title="MyWFG Credentials">
          <p className="prof-hint">Used to pull issued production, contest standings, and PCM contest data from mywfg.com.</p>
          <label className="prof-toggle-row">
            <input type="checkbox" className="prof-checkbox" checked={mywfgHasOwn} onChange={e => setMywfgHasOwn(e.target.checked)} />
            <span className="prof-toggle-label">I have my own MyWFG account</span>
          </label>
          {mywfgHasOwn && (
            <div className="prof-row">
              <Field label="My Agent Code" value={mywfgCode} onChange={setMywfgCode} placeholder="e.g. 19RSI" mono />
              <div className="prof-field">
                <label className="prof-label">My Password</label>
                <div className="prof-pass-wrap">
                  <input className="prof-input mono" type={showMywfgPass ? 'text' : 'password'} value={mywfgPass} onChange={e => setMywfgPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" className="prof-pass-toggle" onClick={() => setShowMywfgPass(s => !s)}>{showMywfgPass ? 'Hide' : 'Show'}</button>
                </div>
              </div>
            </div>
          )}
          <div className="prof-tabs-label" style={{ marginTop: 4 }}>Accounts I Assist</div>
          {mywfgAccounts.length === 0 && <div className="prof-hint" style={{ marginTop: -4 }}>None added yet.</div>}
          <div className="prof-tabs-list">
            {mywfgAccounts.map((acct, i) => {
              const update = (key, val) => setMywfgAccounts(prev => prev.map((a, j) => j === i ? { ...a, [key]: val } : a))
              return (
                <div key={i} className="prof-acct-row">
                  <input className="prof-input" value={acct.label || ''} onChange={e => update('label', e.target.value)} placeholder="Name (e.g. Olivia)" />
                  <input className="prof-input mono" value={acct.code || ''} onChange={e => update('code', e.target.value)} placeholder="Agent Code" />
                  <div className="prof-pass-wrap" style={{ flex: 1 }}>
                    <input className="prof-input mono" type={acct.showPass ? 'text' : 'password'} value={acct.password || ''} onChange={e => update('password', e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                    <button type="button" className="prof-pass-toggle" onClick={() => update('showPass', !acct.showPass)}>{acct.showPass ? 'Hide' : 'Show'}</button>
                  </div>
                  <button type="button" className="prof-tab-remove" onClick={() => setMywfgAccounts(prev => prev.filter((_, j) => j !== i))}>×</button>
                </div>
              )
            })}
          </div>
          <button type="button" className="prof-tab-add" onClick={() => setMywfgAccounts(prev => [...prev, { label: '', code: '', password: '', showPass: false }])}>+ Add Account</button>
        </Section>

        <Section title="AI Agents">
          <p className="prof-hint">Customize the agent cards that appear on your dashboard. Each button launches a Claude AI task when clicked. Requires an Anthropic API key (yours or the team's).</p>
          <div className="prof-agents-list">
            {agents.map((a, i) => (
              <div key={i} className="prof-agent-row">
                <div className="prof-agent-top">
                  <input className="prof-input prof-agent-icon" value={a.icon || ''} onChange={e => updateAgent(i, 'icon', e.target.value)} placeholder="🤖" maxLength={4} />
                  <input className="prof-input prof-agent-name" value={a.name || ''} onChange={e => updateAgent(i, 'name', e.target.value)} placeholder="Agent Name" />
                  <input className="prof-input prof-agent-desc" value={a.desc || ''} onChange={e => updateAgent(i, 'desc', e.target.value)} placeholder="Short description" />
                  <button type="button" className="prof-tab-remove" onClick={() => setAgents(prev => prev.filter((_, j) => j !== i))}>×</button>
                </div>
                <div className="prof-agent-bottom">
                  <textarea className="prof-textarea" value={a.prompt || ''} onChange={e => updateAgent(i, 'prompt', e.target.value)} placeholder="What this agent does when launched (the prompt sent to Claude)..." rows={2} />
                  <div className="prof-field" style={{ minWidth: 160, flex: '0 0 auto' }}>
                    <label className="prof-label">Skill File</label>
                    <select className="prof-select" value={a.skill || ''} onChange={e => updateAgent(i, 'skill', e.target.value)}>
                      {skillOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="prof-agent-actions">
            <button type="button" className="prof-tab-add" onClick={() => setAgents(prev => [...prev, { icon: '🤖', name: '', desc: '', prompt: '', skill: '' }])}>+ Add Agent</button>
            <button type="button" className="prof-reset-btn" onClick={() => setAgents(DEFAULT_AGENTS)}>Reset to Defaults</button>
          </div>
        </Section>

        <Section title="Quick Actions">
          <p className="prof-hint">Customize the quick-action buttons at the top of your dashboard.</p>
          <div className="prof-agents-list">
            {quickActions.map((a, i) => (
              <div key={i} className="prof-agent-row">
                <div className="prof-agent-top">
                  <input className="prof-input prof-agent-icon" value={a.icon || ''} onChange={e => updateQA(i, 'icon', e.target.value)} placeholder="📊" maxLength={4} />
                  <input className="prof-input prof-agent-name" value={a.label || ''} onChange={e => updateQA(i, 'label', e.target.value)} placeholder="Button Label" />
                  <button type="button" className="prof-tab-remove" onClick={() => setQuickActions(prev => prev.filter((_, j) => j !== i))}>×</button>
                </div>
                <div className="prof-agent-bottom">
                  <textarea className="prof-textarea" value={a.prompt || ''} onChange={e => updateQA(i, 'prompt', e.target.value)} placeholder="Prompt sent to Claude when clicked..." rows={2} />
                  <div className="prof-field" style={{ minWidth: 160, flex: '0 0 auto' }}>
                    <label className="prof-label">Skill File</label>
                    <select className="prof-select" value={a.skill || ''} onChange={e => updateQA(i, 'skill', e.target.value)}>
                      {skillOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="prof-agent-actions">
            <button type="button" className="prof-tab-add" onClick={() => setQuickActions(prev => [...prev, { icon: '⚡', label: '', prompt: '', skill: '' }])}>+ Add Quick Action</button>
            <button type="button" className="prof-reset-btn" onClick={() => setQuickActions(DEFAULT_QUICK_ACTIONS)}>Reset to Defaults</button>
          </div>
        </Section>

        <Section title="Team RISE App">
          <p className="prof-hint">Enter your team's access code here. Once filled in, the setup banner on the dashboard will disappear.</p>
          <Field label="Access Code" value={accessCode} onChange={setAccessCode} placeholder="e.g. RISE2026" mono />
        </Section>

        <Section title="Appointments">
          <p className="prof-hint">Your Zoom link is pre-filled on every virtual appointment you book.</p>
          <Field label="Zoom Link" value={zoomLink} onChange={setZoomLink} placeholder="https://us02web.zoom.us/j/..." mono />
        </Section>

        <Section title="Pipeline Sheet">
          <p className="prof-hint">The Google Sheet that populates your prospect pipeline. All tabs are merged into one list on the dashboard.</p>
          <Field label="Google Sheet ID" value={sheetId} onChange={setSheetId} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" mono />
          <div className="prof-tabs-label">Sheet Tabs</div>
          <div className="prof-tabs-list">
            {sheetTabs.map((tab, i) => (
              <div key={i} className="prof-tab-row">
                <input className="prof-input mono" value={tab} onChange={e => setSheetTabs(prev => prev.map((t, j) => j === i ? e.target.value : t))} placeholder={`Tab ${i + 1} name`} />
                {sheetTabs.length > 1 && <button type="button" className="prof-tab-remove" onClick={() => setSheetTabs(prev => prev.filter((_, j) => j !== i))}>×</button>}
              </div>
            ))}
          </div>
          <button type="button" className="prof-tab-add" onClick={() => setSheetTabs(prev => [...prev, ''])}>+ Add Tab</button>
        </Section>

        {error  && <div className="prof-error">{error}</div>}
        {saved  && <div className="prof-saved">Profile saved!</div>}

        <button className={'prof-save-btn' + (saving ? ' loading' : '')} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Profile'}
        </button>

      </div>
    </div>
  )
}
