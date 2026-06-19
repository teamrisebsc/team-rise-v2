import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'

const STEPS = ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5', 'Phone Zone', 'BPM/VGO', 'Other']

const MARRIED_OPTS   = ['Yes, married', 'In a relationship', 'Single', 'Not sure']
const KIDS_OPTS      = ['Yes, they have kids', 'Expecting', 'No kids', 'Not sure']
const STAR_OPTS      = ['S — Structured', 'T — Theory/Technical', 'A — Action', 'R — Relational']
const US_STATES      = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming']

function compileNotes({ type, work, married, kids, goals, dissatisfaction, star, trainerRequest, howKnown, howLong }) {
  const parts = [
    work            && `Work: ${work}`,
    married         && `Married: ${married}`,
    kids            && `Kids: ${kids}`,
    goals           && `Goals: ${goals}`,
    dissatisfaction && `Dissatisfaction: ${dissatisfaction}`,
    star            && `STAR: ${star.split(' — ')[0]}`,
    type === 'matchup' && trainerRequest && `Trainer request: ${trainerRequest}`,
    (howKnown || howLong) && `How known: ${[howKnown, howLong].filter(Boolean).join(', ')}`,
  ].filter(Boolean)
  return parts.join(' | ')
}

export default function BookAppointment({ prospect, onClose, onBooked }) {
  const { profile } = useAuth()
  const [type,            setType]           = useState('personal')
  const [step,            setStep]           = useState('Step 1')
  const [date,            setDate]           = useState('')
  const [time,            setTime]           = useState('')
  const [contact,         setContact]        = useState('')
  const [phone,           setPhone]          = useState('')
  const [email,           setEmail]          = useState('')
  const [state,           setState]          = useState('California')
  // Doubles as follow-up result fields: howKnown=happened, howLong=fna, work=secondAppt,
  // married=referrals, kids=bpm, dissatisfaction=edified, star=sale, trainerRequest=ama
  const [howKnown,        setHowKnown]       = useState('yes') // happened default: yes
  const [howLong,         setHowLong]        = useState('no')  // fna default: no
  const [work,            setWork]           = useState('no')  // secondAppt default: no
  const [married,         setMarried]        = useState('no')  // referrals default: no
  const [kids,            setKids]           = useState('no')  // bpm default: no
  const [goals,           setGoals]          = useState('')
  const [dissatisfaction, setDissatisfaction]= useState('yes') // edified default: yes
  const [star,            setStar]           = useState('not-yet') // sale default: not-yet
  const [trainerRequest,  setTrainerRequest] = useState('no') // ama default: no
  const [showQ,           setShowQ]          = useState(false)
  const [loading,         setLoading]        = useState(false)
  const [result,          setResult]         = useState(null)
  const [error,           setError]          = useState('')
  const [jobId,           setJobId]          = useState(null)
  // Follow-up sub-modal: Create follow-up appointment (when secondAppt=yes)
  const [followupDate,    setFollowupDate]   = useState('')
  const [followupTime,    setFollowupTime]   = useState('')
  const [followupStep,    setFollowupStep]   = useState('Step 2')
  // Follow-up sub-modal: Add Production (when sale=yes)
  const [prodProvider,    setProdProvider]   = useState('')
  const [prodProduct,     setProdProduct]    = useState('')
  const [prodPolicy,      setProdPolicy]     = useState('')
  const [prodPoints,      setProdPoints]     = useState('')
  const [prodNotes,       setProdNotes]      = useState('')
  const [prodReferrals,   setProdReferrals]  = useState('0')
  // Follow-up sub-modal: Add New Guest / BPM invite (when bpm=yes)
  const [bpmDate,         setBpmDate]        = useState('')
  const [bpmNote,         setBpmNote]        = useState('')

  function resetForm() {
    setType('personal'); setStep('Step 1'); setDate(''); setTime('')
    setContact(''); setPhone(''); setEmail(''); setState('California')
    setHowKnown('yes'); setHowLong('no'); setWork('no'); setMarried('no')
    setKids('no'); setGoals(''); setDissatisfaction('yes'); setStar('not-yet')
    setTrainerRequest('no'); setShowQ(false); setResult(null); setError('')
    setJobId(null)
    setFollowupDate(''); setFollowupTime(''); setFollowupStep('Step 2')
    setProdProvider(''); setProdProduct(''); setProdPolicy('')
    setProdPoints(''); setProdNotes(''); setProdReferrals('0')
    setBpmDate(''); setBpmNote('')
  }

  // Poll Supabase for queued job status (Netlify path)
  useEffect(() => {
    if (!jobId) return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('appointment_queue')
        .select('status, result, error_msg')
        .eq('id', jobId)
        .single()
      if (data?.status === 'complete') {
        clearInterval(interval)
        setResult(data.result || { ok: true })
        setLoading(false)
        setJobId(null)
        setTimeout(() => { onBooked?.(); resetForm() }, 4000)
      } else if (data?.status === 'error') {
        clearInterval(interval)
        setError(data.error_msg || 'Booking failed on the worker.')
        setLoading(false)
        setJobId(null)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [jobId])

  useEffect(() => {
    if (prospect) {
      setContact(prospect.name || '')
      setPhone(prospect.phone || '')
      setEmail(prospect.email || '')
    }
    setResult(null)
    setError('')
    setShowQ(false)
  }, [prospect])

  const notes = type === 'followup' ? goals : compileNotes({ type, work, married, kids, goals, dissatisfaction, star, trainerRequest, howKnown, howLong })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!contact || !date || !time) { setError('Name, date, and time are required.'); return }
    setError('')
    setLoading(true)
    setResult(null)

    const dateStr = new Date(date + 'T00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    const [h, m]  = time.split(':')
    const hr      = parseInt(h)
    const ampm    = hr >= 12 ? 'PM' : 'AM'
    const hr12    = ((hr % 12) || 12).toString().padStart(2, '0')
    const timeStr = `${hr12}:${m} ${ampm}`

    try {
      const res = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        type, step, date: dateStr, time: timeStr, contact, phone, email, state, notes,
        bscproEmail:    profile?.bscpro_email    || '',
        bscproPassword: profile?.bscpro_password || '',
        zoomLink:       profile?.zoom_link       || '',
        happened:     howKnown       || 'yes',
        fna:          howLong        || 'no',
        secondAppt:   work           || 'no',
        referrals:    married        || 'no',
        bpm:          kids           || 'no',
        edified:      dissatisfaction || undefined,
        sale:         star           || 'not-yet',
        ama:          trainerRequest || 'no',
        followupDate: work === 'yes' ? followupDate : undefined,
        followupTime: work === 'yes' ? followupTime : undefined,
        followupStep: work === 'yes' ? followupStep : undefined,
        bpmDate:      kids === 'yes' ? bpmDate      : undefined,
        bpmNote:      kids === 'yes' ? bpmNote      : undefined,
        prodProvider: star === 'yes' ? prodProvider : undefined,
        prodProduct:  star === 'yes' ? prodProduct  : undefined,
        prodPolicy:   star === 'yes' ? prodPolicy   : undefined,
        prodPoints:   star === 'yes' ? prodPoints   : undefined,
        prodNotes:    star === 'yes' ? prodNotes    : undefined,
        prodReferrals:star === 'yes' ? prodReferrals: undefined,
      }),
      })
      const data = await res.json()
      if (data.queued && data.job_id) {
        // Netlify path — job queued, poll Supabase for result
        setJobId(data.job_id)
        // keep loading = true while polling
      } else if (data.ok || data.status === 'success') {
        // Local path — synchronous result
        setResult(data)
        setLoading(false)
        setTimeout(() => { onBooked?.(); resetForm() }, 4000)
      } else {
        setError(data.error || 'Submission failed. Check the terminal for details.')
        setLoading(false)
      }
    } catch (err) {
      setError('Could not reach the appointment server.')
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="appt-result">
        <div className="appt-result-icon">✅</div>
        <div className="appt-result-title">Booked in BSCpro!</div>
        <div className="appt-result-detail">{result.calendarTitle || contact}</div>
        <div className="appt-result-time">{result.date}</div>
      </div>
    )
  }

  return (
    <form className="appt-form" onSubmit={handleSubmit}>

      {/* Type toggle */}
      <div className="appt-type-toggle">
        <button type="button" className={'appt-type-btn' + (type === 'personal' ? ' active' : '')} onClick={() => setType('personal')}>
          Personal Appt
        </button>
        <button type="button" className={'appt-type-btn' + (type === 'matchup' ? ' active' : '')} onClick={() => setType('matchup')}>
          Matchup
        </button>
        <button type="button" className={'appt-type-btn' + (type === 'followup' ? ' active' : '')} onClick={() => setType('followup')}>
          Follow-Up
        </button>
      </div>

      {/* Prospect card if pre-filled */}
      {prospect && (
        <div className="appt-prospect-card">
          <span className="appt-prospect-name">{prospect.name}</span>
          {prospect.role && <span className="appt-prospect-role">{prospect.role}</span>}
          <button type="button" className="appt-clear" onClick={onClose}>✕</button>
        </div>
      )}

      {/* Core fields */}
      <div className="appt-field">
        <label className="appt-label">Prospect Name</label>
        <input className="appt-input" value={contact} onChange={e => setContact(e.target.value)} placeholder="Full name" required />
      </div>

      {type !== 'followup' && (
        <div className="appt-row">
          <div className="appt-field">
            <label className="appt-label">Phone</label>
            <input className="appt-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Digits only" />
          </div>
          <div className="appt-field">
            <label className="appt-label">Email</label>
            <input className="appt-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@..." />
          </div>
        </div>
      )}

      {type !== 'followup' && (
        <div className="appt-row">
          <div className="appt-field">
            <label className="appt-label">Step</label>
            <select className="appt-select" value={step} onChange={e => setStep(e.target.value)}>
              {STEPS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="appt-field">
            <label className="appt-label">State</label>
            <select className="appt-select" value={state} onChange={e => setState(e.target.value)}>
              {US_STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="appt-row">
        <div className="appt-field">
          <label className="appt-label">Date</label>
          <input className="appt-input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="appt-field">
          <label className="appt-label">Time</label>
          <input className="appt-input" type="time" value={time} onChange={e => setTime(e.target.value)} required />
        </div>
      </div>

      {/* Follow-Up Results form */}
      {type === 'followup' && (
        <div className="appt-results">
          <div className="appt-results-label">Results</div>

          <div className="appt-result-row">
            <span className="appt-result-q">Did the appointment happen?</span>
            <div className="appt-result-opts">
              <label><input type="radio" name="happened" value="yes" checked={howKnown === 'yes' || howKnown === ''} onChange={() => setHowKnown('yes')} /> Yes</label>
              <label><input type="radio" name="happened" value="no"  checked={howKnown === 'no'}  onChange={() => setHowKnown('no')}  /> No</label>
            </div>
          </div>

          <div className="appt-result-row">
            <span className="appt-result-q">FNA Taken?</span>
            <div className="appt-result-opts">
              <label><input type="radio" name="fna" value="yes" checked={howLong === 'yes'} onChange={() => setHowLong('yes')} /> Yes</label>
              <label><input type="radio" name="fna" value="no"  checked={howLong !== 'yes'} onChange={() => setHowLong('no')}  /> No</label>
            </div>
          </div>
          {howLong === 'yes' && (
            <div className="appt-fna-reminder">
              📄 Don't forget to drop the FNA sheet in the <strong>Run FNA</strong> section above.
            </div>
          )}

          <div className="appt-result-row">
            <span className="appt-result-q">2nd Appointment Scheduled?</span>
            <div className="appt-result-opts">
              <label><input type="radio" name="secondAppt" value="yes" checked={work === 'yes'} onChange={() => setWork('yes')} /> Yes</label>
              <label><input type="radio" name="secondAppt" value="no"  checked={work !== 'yes'} onChange={() => setWork('no')}  /> No</label>
            </div>
          </div>
          {work === 'yes' && (
            <div className="appt-submodal">
              <div className="appt-submodal-label">Create Follow-Up Appointment</div>
              <div className="appt-row">
                <div className="appt-field">
                  <label className="appt-label">Date</label>
                  <input className="appt-input" type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)} required />
                </div>
                <div className="appt-field">
                  <label className="appt-label">Time</label>
                  <input className="appt-input" type="time" value={followupTime} onChange={e => setFollowupTime(e.target.value)} required />
                </div>
              </div>
              <div className="appt-field">
                <label className="appt-label">Appointment Type</label>
                <select className="appt-select" value={followupStep} onChange={e => setFollowupStep(e.target.value)}>
                  {STEPS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="appt-result-row">
            <span className="appt-result-q">Referrals?</span>
            <div className="appt-result-opts">
              <label><input type="radio" name="referrals" value="yes" checked={married === 'yes'} onChange={() => setMarried('yes')} /> Yes</label>
              <label><input type="radio" name="referrals" value="no"  checked={married !== 'yes'} onChange={() => setMarried('no')}  /> No</label>
            </div>
          </div>

          <div className="appt-result-row">
            <span className="appt-result-q">Invited to BPM?</span>
            <div className="appt-result-opts">
              <label><input type="radio" name="bpm" value="yes" checked={kids === 'yes'} onChange={() => setKids('yes')} /> Yes</label>
              <label><input type="radio" name="bpm" value="no"  checked={kids !== 'yes'} onChange={() => setKids('no')}  /> No</label>
            </div>
          </div>
          {kids === 'yes' && (
            <div className="appt-submodal">
              <div className="appt-submodal-label">Add New BPM Guest</div>
              <div className="appt-field">
                <label className="appt-label">BPM Date</label>
                <input className="appt-input" type="date" value={bpmDate} onChange={e => setBpmDate(e.target.value)} required />
              </div>
              <div className="appt-field">
                <label className="appt-label">Note (optional)</label>
                <input className="appt-input" value={bpmNote} onChange={e => setBpmNote(e.target.value)} placeholder="e.g. Invited after Step 1…" />
              </div>
            </div>
          )}

          <div className="appt-result-row">
            <span className="appt-result-q">Did trainee edify trainer?</span>
            <div className="appt-result-opts">
              <label><input type="radio" name="edified" value="yes"   checked={dissatisfaction === 'yes'}   onChange={() => setDissatisfaction('yes')}   /> Yes</label>
              <label><input type="radio" name="edified" value="no"    checked={dissatisfaction === 'no'}    onChange={() => setDissatisfaction('no')}    /> No</label>
              <label><input type="radio" name="edified" value="kinda" checked={dissatisfaction === 'kinda'} onChange={() => setDissatisfaction('kinda')} /> Kinda</label>
            </div>
          </div>

          <div className="appt-result-row">
            <span className="appt-result-q">Did you make a sale?</span>
            <div className="appt-result-opts">
              <label><input type="radio" name="sale" value="yes"     checked={star === 'yes'}     onChange={() => setStar('yes')}     /> Yes</label>
              <label><input type="radio" name="sale" value="not-yet" checked={star !== 'yes'}     onChange={() => setStar('not-yet')} /> Not Yet</label>
            </div>
          </div>
          {star === 'yes' && (
            <div className="appt-submodal">
              <div className="appt-submodal-label">Add Production</div>
              <div className="appt-row">
                <div className="appt-field">
                  <label className="appt-label">Provider</label>
                  <input className="appt-input" value={prodProvider} onChange={e => setProdProvider(e.target.value)} placeholder="e.g. Transamerica" />
                </div>
                <div className="appt-field">
                  <label className="appt-label">Product</label>
                  <input className="appt-input" value={prodProduct} onChange={e => setProdProduct(e.target.value)} placeholder="e.g. IUL, Term Life" />
                </div>
              </div>
              <div className="appt-row">
                <div className="appt-field">
                  <label className="appt-label">Policy #</label>
                  <input className="appt-input" value={prodPolicy} onChange={e => setProdPolicy(e.target.value)} placeholder="Policy number" />
                </div>
                <div className="appt-field">
                  <label className="appt-label">Total Points</label>
                  <input className="appt-input" type="number" value={prodPoints} onChange={e => setProdPoints(e.target.value)} placeholder="Points" />
                </div>
              </div>
              <div className="appt-row">
                <div className="appt-field">
                  <label className="appt-label">Referrals</label>
                  <select className="appt-select" value={prodReferrals} onChange={e => setProdReferrals(e.target.value)}>
                    {['0','1','2','3','4','5','6','7','8','9','10'].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div className="appt-field">
                  <label className="appt-label">Notes</label>
                  <input className="appt-input" value={prodNotes} onChange={e => setProdNotes(e.target.value)} placeholder="e.g. Meds scheduled..." />
                </div>
              </div>
            </div>
          )}

          <div className="appt-result-row">
            <span className="appt-result-q">Did you complete an AMA?</span>
            <div className="appt-result-opts">
              <label><input type="radio" name="ama" value="yes" checked={trainerRequest === 'yes'} onChange={() => setTrainerRequest('yes')} /> Yes</label>
              <label><input type="radio" name="ama" value="no"  checked={trainerRequest !== 'yes'} onChange={() => setTrainerRequest('no')}  /> No</label>
            </div>
          </div>
        </div>
      )}

      {/* Questionnaire toggle — not shown for follow-ups */}
      {type !== 'followup' && <>
      <button type="button" className="appt-q-toggle" onClick={() => setShowQ(q => !q)}>
        {showQ ? '▲ Hide' : '▼ Add'} Prospect Context
        {notes && !showQ && <span className="appt-q-preview"> · {notes.slice(0, 40)}…</span>}
      </button>

      {showQ && (
        <div className="appt-questionnaire">
          <div className="appt-row">
            <div className="appt-field">
              <label className="appt-label">How do you know them?</label>
              <input className="appt-input" value={howKnown} onChange={e => setHowKnown(e.target.value)} placeholder="e.g. Instagram, referral" />
            </div>
            <div className="appt-field">
              <label className="appt-label">How long?</label>
              <input className="appt-input" value={howLong} onChange={e => setHowLong(e.target.value)} placeholder="e.g. 2 weeks" />
            </div>
          </div>

          <div className="appt-field">
            <label className="appt-label">What do they do for work?</label>
            <input className="appt-input" value={work} onChange={e => setWork(e.target.value)} placeholder="Occupation or industry" />
          </div>

          <div className="appt-row">
            <div className="appt-field">
              <label className="appt-label">Married?</label>
              <select className="appt-select" value={married} onChange={e => setMarried(e.target.value)}>
                <option value="">Select…</option>
                {MARRIED_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="appt-field">
              <label className="appt-label">Kids?</label>
              <select className="appt-select" value={kids} onChange={e => setKids(e.target.value)}>
                <option value="">Select…</option>
                {KIDS_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="appt-field">
            <label className="appt-label">Goals / What's important to them?</label>
            <input className="appt-input" value={goals} onChange={e => setGoals(e.target.value)} placeholder="Freedom, family, income, legacy…" />
          </div>

          <div className="appt-field">
            <label className="appt-label">Any dissatisfaction?</label>
            <input className="appt-input" value={dissatisfaction} onChange={e => setDissatisfaction(e.target.value)} placeholder="Current job, finances, time…" />
          </div>

          <div className="appt-field">
            <label className="appt-label">STAR Profile</label>
            <select className="appt-select" value={star} onChange={e => setStar(e.target.value)}>
              <option value="">Select…</option>
              {STAR_OPTS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {type === 'matchup' && (
            <div className="appt-field">
              <label className="appt-label">Trainer request</label>
              <input className="appt-input" value={trainerRequest} onChange={e => setTrainerRequest(e.target.value)} placeholder="e.g. Someone with a sales background" />
            </div>
          )}

          {notes && (
            <div className="appt-notes-preview">
              <div className="appt-notes-label">BSCpro Notes Preview</div>
              <div className="appt-notes-text">{notes}</div>
            </div>
          )}
        </div>
      )}
      </>}

      {error && <div className="appt-error">{error}</div>}

      <button className={'appt-submit-btn' + (loading ? ' loading' : '')} type="submit" disabled={loading}>
        {loading ? (jobId ? 'Booking in BSCpro… (~30 sec)' : 'Submitting…') : type === 'followup' ? 'Book Follow-Up in BSCpro' : `Book ${type === 'matchup' ? 'Matchup' : 'Appointment'} in BSCpro`}
      </button>
    </form>
  )
}
