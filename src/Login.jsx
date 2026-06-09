import { useState } from 'react'
import { useAuth } from './AuthContext'

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode]         = useState('login') // 'login' | 'signup' | 'reset'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [resetSent, setResetSent]   = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  function switchMode(m) { setMode(m); setError(''); setResetSent(false); setSignupDone(false) }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await signIn(email, password)
    if (err) setError(err.message === 'Invalid login credentials' ? 'Incorrect email or password.' : err.message)
    setLoading(false)
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const err = await signUp(email, password, fullName)
    if (err) setError(err.message)
    else setSignupDone(true)
    setLoading(false)
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await resetPassword(email)
    if (err) setError(err.message)
    else setResetSent(true)
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-name">Team Rise</div>
          <div className="login-brand-sub">AI Command Center</div>
        </div>

        {mode === 'login' && (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label className="login-label">Email</label>
              <input className="login-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </div>
            <div className="login-field">
              <label className="login-label">Password</label>
              <input className="login-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
        )}

        {mode === 'signup' && (
          <form className="login-form" onSubmit={handleSignup}>
            {signupDone ? (
              <div className="login-reset-success">
                Account created! Check your email for a confirmation link, then sign in.
              </div>
            ) : (
              <>
                <div className="login-field">
                  <label className="login-label">Full Name</label>
                  <input className="login-input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Olivia Sula-Wang" autoComplete="name" required />
                </div>
                <div className="login-field">
                  <label className="login-label">Email</label>
                  <input className="login-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
                </div>
                <div className="login-field">
                  <label className="login-label">Password</label>
                  <input className="login-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password" required />
                </div>
                <div className="login-field">
                  <label className="login-label">Confirm Password</label>
                  <input className="login-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
                </div>
                {error && <div className="login-error">{error}</div>}
                <button className="login-btn" type="submit" disabled={loading}>{loading ? 'Creating Account...' : 'Create Account'}</button>
              </>
            )}
          </form>
        )}

        {mode === 'reset' && (
          <form className="login-form" onSubmit={handleReset}>
            {resetSent ? (
              <div className="login-reset-success">
                Check your email for a password reset link.
              </div>
            ) : (
              <>
                <p className="login-reset-hint">Enter your email and we'll send you a reset link.</p>
                <div className="login-field">
                  <label className="login-label">Email</label>
                  <input className="login-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
                </div>
                {error && <div className="login-error">{error}</div>}
                <button className="login-btn" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
              </>
            )}
          </form>
        )}

        <div className="login-footer">
          {mode === 'login' && (
            <>
              <button className="login-link-btn" onClick={() => switchMode('signup')}>Create Account</button>
              {' · '}
              <button className="login-link-btn" onClick={() => switchMode('reset')}>Forgot Password</button>
            </>
          )}
          {mode === 'signup' && (
            <button className="login-link-btn" onClick={() => switchMode('login')}>Already have an account? Sign In</button>
          )}
          {mode === 'reset' && (
            <button className="login-link-btn" onClick={() => switchMode('login')}>Back to Sign In</button>
          )}
        </div>
      </div>
    </div>
  )
}
