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

// One named ticket per purchaser group (the purchaser's own seat) — pull those
// names for the roster list the dashboard shows under the thermometer.
const namedList = roster
  .flatMap(group => group.tickets.filter(t => t.assigned && t.name).map(t => t.name))
  .sort((a, b) => a.localeCompare(b))

const res = await fetch(`${SUPABASE_URL}/rest/v1/report_snapshots?report_key=eq.convention&select=data`, {
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
})
if (!res.ok) { console.error('Fetch failed:', res.status, await res.text()); process.exit(1) }
const rows = await res.json()
const current = rows[0]?.data || {}

const data = {
  ...current,
  tickets_total: summary.total_tickets,
  tickets_named: summary.named_tickets,
  tickets_by_scope: summary.by_scope || null,
  tickets_leaderboard_reference: summary.leaderboard_reference || null,
  tickets_named_list: namedList,
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

if (push.ok) console.log(`Pushed: ${summary.named_tickets}/${summary.total_tickets} tickets named`)
else console.error('Push failed:', push.status, await push.text())
