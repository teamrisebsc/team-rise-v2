import { useState } from 'react'

function renderMarkdown(text) {
  if (!text) return ''
  if (text.trimStart().startsWith('<')) return text
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm,  '<h3>$1</h3>')
    .replace(/^# (.+)$/gm,   '<h2>$1</h2>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Horizontal rule
    .replace(/^---+$/gm, '<hr/>')
    // Bullet lists — group consecutive lines
    .replace(/((?:^[-*] .+\n?)+)/gm, match => {
      const items = match.trim().split('\n').map(l => `<li>${l.replace(/^[-*] /, '')}</li>`).join('')
      return `<ul>${items}</ul>`
    })
    // Numbered lists
    .replace(/((?:^\d+\. .+\n?)+)/gm, match => {
      const items = match.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('')
      return `<ol>${items}</ol>`
    })
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Paragraphs — double newlines
    .replace(/\n\n+/g, '</p><p>')

  return `<p>${html}</p>`
}

function ReportCard({ item, index, reportConfig = {} }) {
  const {
    showTimestamp   = true,
    showPdf         = true,
    expandByDefault = true,
    density         = 'normal',
  } = reportConfig

  const [expanded, setExpanded] = useState(expandByDefault)
  const isError = !item.ok && item.ok !== undefined

  function handlePrint() {
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>${item.skill} — Team RISE</title>
      <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #111; }
        h1 { font-size: 22px; border-bottom: 2px solid #008B8B; padding-bottom: 8px; }
        .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
        h2,h3,h4 { color: #005f5f; }
        ul,ol { padding-left: 20px; }
        li { margin: 4px 0; }
        hr { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
        code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 13px; }
        strong { color: #111; }
        @media print { body { margin: 20px; } }
      </style></head>
      <body>
        <h1>${item.skill}</h1>
        <div class="meta">Team RISE AI Report &nbsp;·&nbsp; ${item.time}</div>
        ${renderMarkdown(item.response)}
      </body></html>
    `)
    w.document.close()
    w.print()
  }

  return (
    <div className={`report-card${isError ? ' report-error' : ''}${density === 'compact' ? ' compact' : ''}`} style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="report-header">
        <div className="report-header-left">
          <span className="report-skill">{item.skill}</span>
          {isError && <span className="report-badge error">Error</span>}
          {!expandByDefault && (
            <button className="report-expand-btn" onClick={() => setExpanded(e => !e)}>
              {expanded ? '▲ Collapse' : '▼ Expand'}
            </button>
          )}
        </div>
        <div className="report-header-right">
          {showTimestamp && <span className="report-time">{item.time}</span>}
          {showPdf && !isError && (
            <button className="report-print-btn" onClick={handlePrint} title="Print / Save as PDF">
              ⬇ PDF
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div
          className="report-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(item.response) }}
        />
      )}
    </div>
  )
}

export default function ActivityFeed({ items, loading, activeSkill, reportConfig = {} }) {
  if (loading) {
    return (
      <div className="feed-panel">
        <div className="feed-loading">
          <div className="feed-spinner" />
          <span>Running <strong>{activeSkill}</strong>…</span>
        </div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="feed-panel feed-empty">
        <div className="feed-empty-icon">🤖</div>
        <div className="feed-empty-text">No activity yet. Launch an agent or quick action to see results here.</div>
      </div>
    )
  }

  return (
    <div className="feed-panel">
      {items.map((item, i) => (
        <ReportCard key={i} item={item} index={i} reportConfig={reportConfig} />
      ))}
    </div>
  )
}
