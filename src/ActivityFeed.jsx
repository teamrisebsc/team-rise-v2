export default function ActivityFeed({ items, loading, activeSkill }) {
  if (loading) {
    return (
      <div className="feed-panel">
        <div className="feed-loading">
          <div className="feed-spinner" />
          <span>Running {activeSkill}...</span>
        </div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="feed-panel feed-empty">
        <div className="feed-empty-icon">🤖</div>
        <div className="feed-empty-text">No activity yet. Run a skill to populate the feed.</div>
      </div>
    )
  }

  return (
    <div className="feed-panel">
      {items.map((item, i) => (
        <div key={i} className="feed-item">
          <div className="feed-item-header">
            <span className="feed-skill-name">{item.skill}</span>
            <span className="feed-timestamp">{item.time}</span>
          </div>
          <div className="feed-item-body">{item.response}</div>
        </div>
      ))}
    </div>
  )
}
