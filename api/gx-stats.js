const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

// GX window resets monthly — deadline is always the last day of the current month
function gxDeadline() {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return lastDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function findEntry(rows, name) {
  if (!rows?.length) return null
  if (!name) return rows[0]
  const lower = name.toLowerCase()
  const first = lower.split(' ')[0]
  const exact = rows.find(r => r.name?.toLowerCase() === lower)
  if (exact) return exact
  return rows.find(r => r.name?.toLowerCase().includes(first)) || null
}

function fmt(n) { return Math.round(n).toLocaleString('en-US') }

function formatDailyReport(data, updatedAt) {
  const d       = new Date(updatedAt || Date.now())
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const month   = data.month_name || data.month || ''
  const p       = []

  p.push(`<div class="r-header">`)
  p.push(`<div class="r-title">📊 Team RISE Daily Briefing</div>`)
  p.push(`<div class="r-subtitle">${dateStr} &nbsp;·&nbsp; data as of ${timeStr}</div>`)
  p.push(`</div>`)

  p.push(`<div class="r-section">`)
  p.push(`<div class="r-section-head">👥 Recruits — ${month}</div>`)
  if (data.recruits) {
    const r = data.recruits
    p.push(`<div class="r-stat-row">`)
    p.push(`<div class="r-stat"><div class="r-stat-num">${r.rise}</div><div class="r-stat-label">RISE baseshop</div></div>`)
    if (r.ffg    > 0) p.push(`<div class="r-stat"><div class="r-stat-num">${r.ffg}</div><div class="r-stat-label">FFG</div></div>`)
    if (r.ignite > 0) p.push(`<div class="r-stat"><div class="r-stat-num">${r.ignite}</div><div class="r-stat-label">Ignite</div></div>`)
    if (r.praise > 0) p.push(`<div class="r-stat"><div class="r-stat-num">${r.praise}</div><div class="r-stat-label">Praise</div></div>`)
    if (r.freedom > 0) p.push(`<div class="r-stat"><div class="r-stat-num">${r.freedom}</div><div class="r-stat-label">Freedom</div></div>`)
    p.push(`<div class="r-stat r-stat--total"><div class="r-stat-num">${r.total}</div><div class="r-stat-label">Total</div></div>`)
    p.push(`</div>`)
  } else {
    p.push(`<div class="r-unavail">Recruit data unavailable</div>`)
  }
  p.push(`</div>`)

  p.push(`<div class="r-section">`)
  p.push(`<div class="r-section-head">👨‍👩‍👧 Families Helped — ${month} (pts)</div>`)
  if (data.families_helped) {
    const fh = data.families_helped
    p.push(`<div class="r-stat-row">`)
    p.push(`<div class="r-stat"><div class="r-stat-num">$${fmt(fh.gross_base)}</div><div class="r-stat-label">RISE baseshop</div></div>`)
    p.push(`<div class="r-stat"><div class="r-stat-num">$${fmt(fh.super_base_contribution)}</div><div class="r-stat-label">Superbase SMDs</div></div>`)
    p.push(`<div class="r-stat r-stat--total"><div class="r-stat-num">$${fmt(fh.gross_super_base)}</div><div class="r-stat-label">Total hierarchy</div></div>`)
    p.push(`</div>`)
  } else {
    p.push(`<div class="r-unavail">mywfg data unavailable</div>`)
  }
  p.push(`</div>`)

  p.push(`<div class="r-section">`)
  p.push(`<div class="r-section-head">🏆 GX Top 5 — Closest to Qualified</div>`)
  if (data.gx_top5?.length) {
    p.push(`<div class="r-gx-list">`)
    data.gx_top5.forEach((a, i) => {
      const needs = !a.qualified ? (() => {
        const n = []
        if (a.needR > 0) n.push(`${a.needR} rec`)
        if (a.needP > 0) n.push(`$${fmt(a.needP)} pts`)
        return n.length ? `needs ${n.join(' + ')}` : ''
      })() : ''
      p.push(`<div class="r-gx-row${a.qualified ? ' r-gx-qualified' : ''}">`)
      p.push(`<span class="r-gx-rank">${i + 1}</span>`)
      p.push(`<span class="r-gx-name">${a.name}</span>`)
      p.push(`<span class="r-gx-progress">${a.recruits}/3 rec &nbsp;·&nbsp; ${fmt(a.points)} pts</span>`)
      p.push(a.qualified ? `<span class="r-gx-qualified-badge">✅ Qualified!</span>` : `<span class="r-gx-needs">${needs}</span>`)
      p.push(`</div>`)
    })
    p.push(`</div>`)
  } else {
    p.push(`<div class="r-unavail">GX data unavailable</div>`)
  }
  p.push(`</div>`)

  p.push(`<div class="r-section">`)
  if (data.licensing) {
    const lic = data.licensing
    p.push(`<div class="r-section-head">🔓 Licensing — ${lic.total} in pipeline</div>`)
    if (lic.test_scheduled?.length) {
      p.push(`<div class="r-lic-sub-head">Tests scheduled</div>`)
      p.push(`<div class="r-lic-list">`)
      lic.test_scheduled.forEach(t =>
        p.push(`<div class="r-lic-row">${t.name}${t.state ? ` (${t.state})` : ''} — ${t.testDate}</div>`)
      )
      p.push(`</div>`)
    }
    if (lic.needs_retake > 0)
      p.push(`<div class="r-lic-retake">⚠ ${lic.needs_retake} agents need retake</div>`)
    if (!lic.test_scheduled?.length && !lic.needs_retake)
      p.push(`<div class="r-unavail">No tests scheduled or retakes pending</div>`)
  } else {
    p.push(`<div class="r-section-head">🔓 Licensing</div>`)
    p.push(`<div class="r-unavail">Licensing data unavailable</div>`)
  }
  p.push(`</div>`)

  return p.join('\n')
}

async function handleDailyReport() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'Supabase not configured.' }) }
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/report_snapshots?report_key=eq.daily_report&select=data,updated_at&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
    const rows = await res.json()
    if (!rows?.length) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'No snapshot yet — run node push_daily_snapshot.js from bscpro-scraper.' }) }
    }
    const { data, updated_at } = rows[0]
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, html: true, response: formatDailyReport(data, updated_at) }) }
  } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: e.message }) }
  }
}

const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }
  if (event.httpMethod === 'POST') return handleDailyReport()

  const name = event.queryStringParameters?.name || ''

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ error: 'Supabase env vars not set.' }) }
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gx_cache?select=name,data,updated_at`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    if (!res.ok) {
      const text = await res.text()
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ error: `Supabase error ${res.status}: ${text.slice(0, 200)}` }) }
    }
    const rows  = await res.json()
    const entry = findEntry(rows, name)
    if (!entry) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ error: 'No GX data found — run Sync GX from the local app.' }) }
    }
    const d = entry.data || {}
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        partners:  { current: d.recruits || 0, goal: 3 },
        points:    { current: Math.round(d.points || 0), goal: 15000 },
        name:      d.name || entry.name,
        qualified: !!d.qualified,
        deadline:  gxDeadline(),
        synced_at: entry.updated_at,
      }),
    }
  } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ error: e.message }) }
  }
}

module.exports = require('./_adapt')(handler)
