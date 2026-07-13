/**
 * push_champions_summit_tickets.mjs
 * Merges Champions Summit ticket-assignment counts (from
 * bscpro-scraper/scrape_champions_summit_tickets.js) into the existing
 * report_snapshots row (report_key='convention') that the dashboard's Big
 * Event widget reads — adds tickets_total/tickets_named without touching
 * event/location/dates/registration_link/goal, which are separately editable
 * from the widget itself.
 */
import fs from 'fs'

const SUPABASE_URL = 'https://sfxxjfnlsotjysphkohq.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHhqZm5sc290anlzcGhrb2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODYzMzAsImV4cCI6MjA5NjA2MjMzMH0.UHOdlECk_t-EpKadryXEfLQgURPkVafgxvD6EuGyq7M'
const SUMMARY_FILE  = 'C:/Users/Mouth/bscpro-scraper/data/champions_summit_summary.json'
const ROSTER_FILE   = 'C:/Users/Mouth/bscpro-scraper/data/champions_summit_roster.json'

const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf-8'))
const roster  = JSON.parse(fs.readFileSync(ROSTER_FILE, 'utf-8'))

const capPart = (w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w
const titleCase = (s) => s.split(' ').map(w => w.split('-').map(capPart).join('-')).join(' ')

// One named ticket per purchaser group (the purchaser's own seat) — pull those
// names for the roster list the dashboard shows under the thermometer. A few
// people buy more than one ticket group (e.g. a personal seat + a team seat),
// so tally case-insensitively and show one chip per person with a ×N count
// rather than a separate chip per purchase.
const counts = new Map()
for (const group of roster) {
  for (const t of group.tickets) {
    if (!t.assigned || !t.name) continue
    const name = titleCase(t.name.trim())
    const key  = name.toLowerCase()
    const entry = counts.get(key)
    if (entry) entry.count += 1
    else counts.set(key, { name, count: 1 })
  }
}

// Manual attribution — known out-of-band, not reflected in BSCpro's own name
// field. Confirmed by Brilynn 2026-07-13: Edgar Palencia's 10-ticket purchase
// (base scope, smd=Olivia Sula-Wang) includes 5 seats bought on behalf of
// Rhonda Leonard-Horwith's team, still showing unnamed in BSCpro. Remove this
// once those seats get individually named in BSCpro itself.
const MANUAL_ASSIGNMENTS = [
  { name: 'Rhonda Leonard-Horwith', count: 5, scope: 'base', note: "Bought by Edgar Palencia on Rhonda's behalf" },
]
for (const m of MANUAL_ASSIGNMENTS) {
  const key = m.name.toLowerCase()
  const entry = counts.get(key)
  if (entry) entry.count += m.count
  else counts.set(key, { name: m.name, count: m.count })
}

const namedList = [...counts.values()].sort((a, b) => a.name.localeCompare(b.name))
const manualNamedTotal = MANUAL_ASSIGNMENTS.reduce((s, m) => s + m.count, 0)
const adjustedByScope = summary.by_scope ? structuredClone(summary.by_scope) : null
for (const m of MANUAL_ASSIGNMENTS) {
  if (adjustedByScope?.[m.scope]) adjustedByScope[m.scope].named += m.count
}

const res = await fetch(`${SUPABASE_URL}/rest/v1/report_snapshots?report_key=eq.convention&select=data`, {
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
})
if (!res.ok) { console.error('Fetch failed:', res.status, await res.text()); process.exit(1) }
const rows = await res.json()
const current = rows[0]?.data || {}

const data = {
  ...current,
  tickets_total: summary.total_tickets,
  tickets_named: summary.named_tickets + manualNamedTotal,
  tickets_by_scope: adjustedByScope,
  tickets_leaderboard_reference: summary.leaderboard_reference || null,
  tickets_named_list: namedList,
  tickets_manual_assignments: MANUAL_ASSIGNMENTS,
  tickets_updated_at: summary.generated_at,
}

const push = await fetch(`${SUPABASE_URL}/rest/v1/report_snapshots`, {
  method: 'POST',
  headers: {
    apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  },
  body: JSON.stringify([{ report_key: 'convention', data, updated_at: new Date().toISOString() }]),
})

if (push.ok) console.log(`Pushed: ${data.tickets_named}/${summary.total_tickets} tickets named`)
else console.error('Push failed:', push.status, await push.text())
