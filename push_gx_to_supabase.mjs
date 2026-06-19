import fs from 'fs'

const SUPABASE_URL = 'https://sfxxjfnlsotjysphkohq.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHhqZm5sc290anlzcGhrb2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODYzMzAsImV4cCI6MjA5NjA2MjMzMH0.UHOdlECk_t-EpKadryXEfLQgURPkVafgxvD6EuGyq7M'
const GX_FILE     = 'C:/Users/Mouth/bscpro-scraper/data/gx_final_jun2026.json'

const entries = JSON.parse(fs.readFileSync(GX_FILE, 'utf-8'))
const rows    = entries.map(e => ({ name: e.name, data: e, updated_at: new Date().toISOString() }))

console.log(`Pushing ${rows.length} GX entries to Supabase...`)

const res = await fetch(`${SUPABASE_URL}/rest/v1/gx_cache`, {
  method: 'POST',
  headers: {
    apikey:         SUPABASE_KEY,
    Authorization:  `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer:         'resolution=merge-duplicates,return=minimal',
  },
  body: JSON.stringify(rows),
})

if (res.ok) {
  console.log(`Done! ${rows.length} entries synced.`)
} else {
  const text = await res.text()
  console.error(`Error ${res.status}:`, text)
}
