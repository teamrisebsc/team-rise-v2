import { useState } from 'react'

const STEPS = [
  { num: 3, label: 'Goals & Reachouts', color: 'blue' },
  { num: 4, label: 'FNA Collection',    color: 'amber' },
  { num: 5, label: 'FNA Report',        color: 'green' },
]

function RecruitRow({ recruit }) {
  const overdue = recruit.days !== null && recruit.days >= 7
  return (
    <div className="rp-row">
      <div className="rp-row-main">
        <span className="rp-name">{recruit.name}</span>
        {recruit.days !== null && (
          <span className={`rp-days${overdue ? ' overdue' : ''}`}>{recruit.days}d</span>
        )}
      </div>
      {recruit.contact && <div className="rp-contact">{recruit.contact}</div>}
    </div>
  )
}

export default function RecruitPipeline({ steps, loading }) {
  const [active, setActive] = useState(3)
  const { step3 = [], step4 = [], step5 = [] } = steps || {}
  const lists = { 3: step3, 4: step4, 5: step5 }

  return (
    <div className="rp-panel">
      <div className="panel-label">Recruit Pipeline</div>

      <div className="rp-tabs">
        {STEPS.map(s => (
          <button
            key={s.num}
            className={`rp-tab rp-tab--${s.color}${active === s.num ? ' active' : ''}`}
            onClick={() => setActive(s.num)}
          >
            <span className="rp-tab-step">Step {s.num}</span>
            <span className="rp-tab-count">{lists[s.num].length}</span>
            <span className="rp-tab-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="rp-list">
        {loading ? (
          <div className="rp-empty">Loading...</div>
        ) : lists[active].length === 0 ? (
          <div className="rp-empty">No recruits at Step {active}</div>
        ) : (
          lists[active].map((r, i) => <RecruitRow key={i} recruit={r} />)
        )}
      </div>
    </div>
  )
}
