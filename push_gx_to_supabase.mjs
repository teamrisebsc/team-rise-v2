import fs from 'fs'
import path from 'path'

const SUPABASE_URL = 'https://sfxxjfnlsotjysphkohq.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHhqZm5sc290anlzcGhrb2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODYzMzAsImV4cCI6MjA5NjA2MjMzMH0.UHOdlECk_t-EpKadryXEfLQgURPkVafgxvD6EuGyq7M'
const DATA_DIR      = 'C:/Users/Mouth/bscpro-scraper/data'

// Filenames follow scrape_gx_<mon><year>_net.js's own convention
// (gx_<mon><year>_net_full_<scope>.json) so this doesn't need hand-editing
// month to month as long as the scraper is rerun first.
const now      = new Date()
const monShort = now.toLocaleDateString('en-US', { month: 'short' }).toLowerCase()
const year     = now.getFullYear()

// 'base' stays unprefixed so it matches the exact rows the old (pre-scope) push
// used — /api/gx-stats's individual "My Goal" lookup depends on that plain name.
// 'superbase' and 'hierarchy' get a scope-prefixed name so they don't collide
// with the base row for agents who show up in more than one scope (Supabase's
// merge-duplicates upsert conflicts on `name`, so distinct scopes need distinct keys).
const SCOPES = [
  { key: 'base',      file: `gx_${monShort}${year}_net_full_base.json`,      prefix: false },
  { key: 'superbase',  file: `gx_${monShort}${year}_net_full_superbase.json`, prefix: true },
  { key: 'hierarchy',  file: `gx_${monShort}${year}_net_full_hierarchy.json`, prefix: true },
]

let rows = []
for (const s of SCOPES) {
  const fp = path.join(DATA_DIR, s.file)
  if (!fs.existsSync(fp)) {
    console.warn(`Skipping ${s.key}: ${fp} not found — run scrape_gx_${monShort}${year}_net.js first.`)
    continue
  }
  const entries = JSON.parse(fs.readFileSync(fp, 'utf-8'))
  const scopeRows = entries.map(e => ({
    name: s.prefix ? `${s.key}::${e.name}` : e.name,
    data: { ...e, scope: s.key },
    updated_at: new Date().toISOString(),
  }))
  rows = rows.concat(scopeRows)
  console.log(`${s.key}: ${scopeRows.length} rows`)
}

if (!rows.length) {
  console.error('Nothing to push — no scope files found.')
  process.exit(1)
}

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
