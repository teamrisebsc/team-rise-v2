import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ROLES = ['TA', 'A', 'SA', 'MD', 'SMD']

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

  const [fullName,    setFullName]    = useState('')
  const [role,        setRole]        = useState('SMD')
  const [avatarInit,  setAvatarInit]  = useState('')
  const [phone,       setPhone]       = useState('')
  const [bscEmail,    setBscEmail]    = useState('')
  const [bscPass,     setBscPass]     = useState('')
  const [mywfgHasOwn,   setMywfgHasOwn]   = useState(false)
  const [mywfgCode,     setMywfgCode]     = useState('')
  const [mywfgPass,     setMywfgPass]     = useState('')
  const [showMywfgPass, setShowMywfgPass] = useState(false)
  const [mywfgAccounts, setMywfgAccounts] = useState([])  // [{label, code, password}]
  const [accessCode,  setAccessCode]  = useState('')
  const [zoomLink,    setZoomLink]    = useState('')
  const [sheetId,     setSheetId]     = useState('')
  const [sheetTabs,   setSheetTabs]   = useState([''])

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name    || '')
    setRole(profile.role             || 'SMD')
    setAvatarInit(profile.avatar_initials || '')
    setPhone(profile.phone           || '')
    setBscEmail(profile.bscpro_email || '')
    setBscPass(profile.bscpro_password || '')
    setMywfgHasOwn(profile.mywfg_has_own_account || false)
    setMywfgCode(profile.mywfg_agent_code || '')
    setMywfgPass(profile.mywfg_password   || '')
    setMywfgAccounts(profile.mywfg_accounts || [])
    setAccessCode(profile.lovable_access_code || '')
    setZoomLink(profile.zoom_link    || '')
    setSheetId(profile.google_sheet_id || '')
    // Load from new tabs array, fall back to old single/double tab fields for migration
    const tabs = profile.google_sheet_tabs?.length
      ? profile.google_sheet_tabs
      : [profile.google_sheet_tab, profile.google_sheet_tab_2].filter(Boolean)
    setSheetTabs(tabs.length ? tabs : [''])
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
      mywfg_has_own_account: mywfgHasOwn,
      mywfg_agent_code:      mywfgCode,
      mywfg_password:        mywfgPass,
      mywfg_accounts:        mywfgAccounts.filter(a => a.code?.trim()),
      lovable_access_code: accessCode,
      zoom_link:        zoomLink,
      google_sheet_id:   sheetId,
      google_sheet_tabs: sheetTabs.filter(t => t.trim()),
    })
    setSaving(false)
    if (err) setError(err.message || 'Save failed.')
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

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
                <input
                  className="prof-input mono"
                  type={showPass ? 'text' : 'password'}
                  value={bscPass}
                  onChange={e => setBscPass(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" className="prof-pass-toggle" onClick={() => setShowPass(s => !s)}>
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
        </Section>

        <Section title="MyWFG Credentials">
          <p className="prof-hint">Used to pull issued production, contest standings, and PCM contest data from mywfg.com.</p>

          {/* Own account toggle */}
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
                  <input
                    className="prof-input mono"
                    type={showMywfgPass ? 'text' : 'password'}
                    value={mywfgPass}
                    onChange={e => setMywfgPass(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button type="button" className="prof-pass-toggle" onClick={() => setShowMywfgPass(s => !s)}>
                    {showMywfgPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Managed accounts (assistant access) */}
          <div className="prof-tabs-label" style={{ marginTop: 4 }}>Accounts I Assist</div>
          {mywfgAccounts.length === 0 && (
            <div className="prof-hint" style={{ marginTop: -4 }}>None added yet. Click "+ Add Account" to manage someone's MyWFG.</div>
          )}
          <div className="prof-tabs-list">
            {mywfgAccounts.map((acct, i) => {
              const update = (key, val) => setMywfgAccounts(prev => prev.map((a, j) => j === i ? { ...a, [key]: val } : a))
              return (
                <div key={i} className="prof-acct-row">
                  <input className="prof-input" value={acct.label || ''} onChange={e => update('label', e.target.value)} placeholder="Name (e.g. Olivia)" />
                  <input className="prof-input mono" value={acct.code || ''} onChange={e => update('code', e.target.value)} placeholder="Agent Code" />
                  <div className="prof-pass-wrap" style={{ flex: 1 }}>
                    <input
                      className="prof-input mono"
                      type={acct.showPass ? 'text' : 'password'}
                      value={acct.password || ''}
                      onChange={e => update('password', e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button type="button" className="prof-pass-toggle" onClick={() => update('showPass', !acct.showPass)}>
                      {acct.showPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <button type="button" className="prof-tab-remove" onClick={() => setMywfgAccounts(prev => prev.filter((_, j) => j !== i))}>×</button>
                </div>
              )
            })}
          </div>
          <button type="button" className="prof-tab-add" onClick={() => setMywfgAccounts(prev => [...prev, { label: '', code: '', password: '', showPass: false }])}>
            + Add Account
          </button>
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
                <input
                  className="prof-input mono"
                  value={tab}
                  onChange={e => setSheetTabs(prev => prev.map((t, j) => j === i ? e.target.value : t))}
                  placeholder={`Tab ${i + 1} name`}
                />
                {sheetTabs.length > 1 && (
                  <button type="button" className="prof-tab-remove" onClick={() => setSheetTabs(prev => prev.filter((_, j) => j !== i))}>×</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="prof-tab-add" onClick={() => setSheetTabs(prev => [...prev, ''])}>
            + Add Tab
          </button>
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
