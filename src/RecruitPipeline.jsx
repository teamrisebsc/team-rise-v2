import { useState, useEffect } from 'react'

const STEPS = [
  { key: 'step3', label: 'Goals & Reachouts', field: 'step3Done', color: 'blue'  },
  { key: 'step4', label: 'FNA Collection',    field: 'step4Done', color: 'amber' },
  { key: 'step5', label: 'FNA Report',        field: 'step5Done', color: 'green' },
]

function StepCheck({ done, onClick }) {
  return (
    <button
      className={`fs-check toggleable${done ? ' done' : ''}`}
      onClick={onClick}
      title={done ? 'Mark incomplete' : 'Mark complete'}
    >
      {done ? '✓' : '○'}
    </button>
  )
}

function RecruitRow({ recruit, sortStep, localOverrides, onToggle }) {
  function effective(field) {
    return recruit[field] || !!localOverrides[`${recruit.code}-${field}`]
  }

  const highlighted = sortStep && !effective(sortStep.field)

  return (
    <div className={`fs-row${highlighted ? ' fs-row--highlight' : ''}`}>
      <div className="fs-row-name">{recruit.name}</div>
      <div className="fs-row-checks">
        {STEPS.map(s => (
          <StepCheck
            key={s.key}
            done={effective(s.field)}
            onClick={() => onToggle(recruit.code, s.field)}
          />
        ))}
      </div>
    </div>
  )
}

export default function RecruitPipeline({ recruits: initialRecruits, loading, onRefresh }) {
  const [recruits, setRecruits] = useState(initialRecruits || [])
  const [sortStep, setSortStep] = useState(null)
  const [localOverrides, setLocalOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fs_step_overrides') || '{}') }
    catch { return {} }
  })

  useEffect(() => { setRecruits(initialRecruits || []) }, [initialRecruits])

  function effective(recruit, field) {
    return recruit[field] || !!localOverrides[`${recruit.code}-${field}`]
  }

  const counts = STEPS.reduce((acc, s) => {
    acc[s.key] = recruits.filter(r => !effective(r, s.field)).length
    return acc
  }, {})

  function handleSortClick(step) {
    setSortStep(prev => prev?.key === step.key ? null : step)
  }

  const sorted = sortStep
    ? [...recruits].sort((a, b) => {
        const aNeed = !effective(a, sortStep.field) ? 0 : 1
        const bNeed = !effective(b, sortStep.field) ? 0 : 1
        return aNeed - bNeed
      })
    : recruits

  function handleToggle(code, field) {
    const key = `${code}-${field}`
    setLocalOverrides(prev => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = true
      localStorage.setItem('fs_step_overrides', JSON.stringify(next))
      return next
    })
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
              localOverrides={localOverrides}
              onToggle={handleToggle}
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
