import { useState, useEffect, useCallback } from 'react'

const STEPS = [
  { key: 'step3', label: 'Goals & Reachouts', field: 'step3Done', color: 'blue',  toggle: true  },
  { key: 'step4', label: 'FNA Collection',    field: 'step4Done', color: 'amber', toggle: false },
  { key: 'step5', label: 'FNA Report',        field: 'step5Done', color: 'green', toggle: false },
]

function StepCheck({ done, toggleable, loading, onClick }) {
  return (
    <button
      className={`fs-check${done ? ' done' : ''}${toggleable ? ' toggleable' : ''}${loading ? ' busy' : ''}`}
      onClick={toggleable ? onClick : undefined}
      disabled={!toggleable || loading}
      title={toggleable ? (done ? 'Mark incomplete' : 'Mark complete') : 'Set in BSCpro'}
    >
      {done ? '✓' : '○'}
    </button>
  )
}

function RecruitRow({ recruit, sortStep, onToggleStep3 }) {
  const [busy, setBusy] = useState(false)

  async function handleStep3Click() {
    if (busy) return
    setBusy(true)
    try {
      await onToggleStep3(recruit.code, !recruit.step3Done)
    } finally {
      setBusy(false)
    }
  }

  const highlighted = sortStep && !recruit[sortStep.field]

  return (
    <div className={`fs-row${highlighted ? ' fs-row--highlight' : ''}`}>
      <div className="fs-row-name">{recruit.name}</div>
      <div className="fs-row-checks">
        {STEPS.map(s => (
          <StepCheck
            key={s.key}
            done={recruit[s.field]}
            toggleable={s.toggle}
            loading={s.toggle && busy}
            onClick={s.toggle ? handleStep3Click : undefined}
          />
        ))}
      </div>
    </div>
  )
}

export default function RecruitPipeline({ recruits: initialRecruits, loading, onRefresh }) {
  const [recruits, setRecruits]   = useState(initialRecruits || [])
  const [sortStep, setSortStep]   = useState(null)

  useEffect(() => {
    setRecruits(initialRecruits || [])
  }, [initialRecruits])

  const counts = STEPS.reduce((acc, s) => {
    acc[s.key] = recruits.filter(r => !r[s.field]).length
    return acc
  }, {})

  function handleSortClick(step) {
    setSortStep(prev => prev?.key === step.key ? null : step)
  }

  const sorted = sortStep
    ? [...recruits].sort((a, b) => {
        const aNeed = !a[sortStep.field] ? 0 : 1
        const bNeed = !b[sortStep.field] ? 0 : 1
        return aNeed - bNeed
      })
    : recruits

  async function handleToggleStep3(code, done) {
    // Optimistic update
    setRecruits(prev => prev.map(r => r.code === code ? { ...r, step3Done: done } : r))
    try {
      const res = await fetch('/api/recruit-step3', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, done }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed')
    } catch {
      // Revert on failure
      setRecruits(prev => prev.map(r => r.code === code ? { ...r, step3Done: !done } : r))
    }
  }

  return (
    <div className="rp-panel">
      <div className="panel-label">Fast Start Pipeline</div>

      <div className="fs-sort-bar">
        {STEPS.map(s => (
          <button
            key={s.key}
            className={`fs-sort-btn fs-sort-btn--${s.color}${sortStep?.key === s.key ? ' active' : ''}`}
            onClick={() => handleSortClick(s)}
          >
            <span className="fs-sort-label">{s.label}</span>
            <span className="fs-sort-count">{counts[s.key]} need</span>
          </button>
        ))}
      </div>

      <div className="fs-legend">
        <span>Goals</span><span>FNA</span><span>Report</span>
      </div>

      <div className="rp-list">
        {loading ? (
          <div className="rp-empty">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="rp-empty">No active recruits found</div>
        ) : (
          sorted.map((r, i) => (
            <RecruitRow
              key={r.code || i}
              recruit={r}
              sortStep={sortStep}
              onToggleStep3={handleToggleStep3}
            />
          ))
        )}
      </div>

      {onRefresh && (
        <button className="fs-refresh" onClick={onRefresh} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      )}
    </div>
  )
}
