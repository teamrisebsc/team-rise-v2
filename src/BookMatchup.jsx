import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const STEPS = ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5', 'AMA', 'Application']

export default function BookMatchup({ prospect, onClose, onBooked }) {
  const [step, setStep]     = useState('Step 2')
  const [date, setDate]     = useState('')
  const [time, setTime]     = useState('')
  const [notes, setNotes]   = useState(prospect?.note || '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setNotes(prospect?.note || '')
    setStep('Step 2')
    setDate('')
    setTime('')
    setSuccess(false)
  }, [prospect])

  async function handleBook(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.functions.invoke('book-matchup', {
      body: { prospect, step, date, time, notes }
    })
    setLoading(false)
    if (!error) {
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onBooked && onBooked() }, 2000)
    }
  }

  if (!prospect) {
    return (
      <div className="matchup-empty">
        <div className="matchup-empty-icon">📅</div>
        <div className="matchup-empty-text">Click Matchup on a prospect to book an appointment</div>
      </div>
    )
  }

  return (
    <form className="matchup-form" onSubmit={handleBook}>
      <div className="matchup-prospect-card">
        <div className="matchup-prospect-name">{prospect.name}</div>
        <div className="matchup-prospect-meta">
          <span className="prospect-role">{prospect.role}</span>
          <span className="matchup-last">Last: {prospect.last}</span>
        </div>
        {prospect.note && <div className="matchup-note">{prospect.note}</div>}
        <button type="button" className="matchup-clear" onClick={onClose}>x Clear</button>
      </div>

      <div className="matchup-field">
        <label className="matchup-label">Step</label>
        <select className="matchup-select" value={step} onChange={e => setStep(e.target.value)}>
          {STEPS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="matchup-row">
        <div className="matchup-field">
          <label className="matchup-label">Date</label>
          <input className="matchup-input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="matchup-field">
          <label className="matchup-label">Time</label>
          <input className="matchup-input" type="time" value={time} onChange={e => setTime(e.target.value)} required />
        </div>
      </div>

      <div className="matchup-field">
        <label className="matchup-label">Notes (optional)</label>
        <input className="matchup-input" type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Auto-filled from last note" />
      </div>

      <button className={'matchup-book-btn' + (success ? ' success' : '')} type="submit" disabled={loading || success}>
        {success ? 'Booked!' : loading ? 'Booking...' : 'Book in BSCpro'}
      </button>
    </form>
  )
}
