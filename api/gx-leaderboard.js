const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

const PARTNER_GOAL = 3
const POINTS_GOAL  = 15000

// scope_filter checkbox state -> which precomputed BSCpro scope dataset to read.
// 'base'+'superbase' together resolves to 'hierarchy' — matches BSCpro's own
// combined/deduped scope_filter view, not a client-side sum of the two (points
// for an overlapping record differ per scope under WFG's flanking/split rules,
// so summing base+superbase independently would double count). 'superteam'
// verified empty for this account (2026-07-13) and is not a resolvable scope.
function resolveScopeKey(param) {
  const sel = (param || 'base').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const hasBase = sel.includes('base')
  const hasSuper = sel.includes('superbase')
  if (hasBase && hasSuper) return 'hierarchy'
  if (hasSuper) return 'superbase'
  return 'base'
}

const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'Supabase not configured.', agents: [] }) }
  }

  const scopeKey = resolveScopeKey(event.queryStringParameters?.scope)

  try {
    const res = await fetch(
      `${url}/rest/v1/gx_cache?select=name,data,updated_at`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
    const rows = await res.json()

    // Only the latest sync batch FOR THIS SCOPE — the cache keeps rows from old pushes
    // forever, and scopes refresh independently (e.g. 'base' gets re-pushed on every
    // dev-server start), so a global maxTs would stale-out scopes that weren't just
    // re-synced. Freshness must be evaluated within the scope's own rows.
    const scoped = rows.filter(r => ((r.data || {}).scope || 'base') === scopeKey)
    const maxTs = scoped.reduce((m, r) => (!m || r.updated_at > m) ? r.updated_at : m, null)
    const fresh = scoped.filter(r => maxTs && (new Date(maxTs) - new Date(r.updated_at)) < 10 * 60 * 1000)

    // Merge duplicate name variants ("Janae Quick" vs "Janae Quick (E2E3H)") taking the best of each stat
    const byName = {}
    for (const r of fresh) {
      const d = r.data || {}
      const name = (d.name || r.name || '').replace(/^\w+::/, '').replace(/\s*\([A-Z0-9]+\)$/, '').trim()
      if (!name) continue
      const cur = byName[name] || { partners: 0, points: 0, qualified: false, updatedAt: r.updated_at }
      byName[name] = {
        partners:  Math.max(cur.partners, d.recruits || 0),
        points:    Math.max(cur.points, Math.round(d.points || 0)),
        qualified: cur.qualified || !!d.qualified,
        updatedAt: r.updated_at > cur.updatedAt ? r.updated_at : cur.updatedAt,
      }
    }

    const agents = Object.entries(byName).map(([name, a]) => {
      const qualified = a.qualified || (a.partners >= PARTNER_GOAL && a.points >= POINTS_GOAL)
      // Closeness score: fraction of each goal still missing (lower = closer to qualifying)
      const missing = Math.max(0, PARTNER_GOAL - a.partners) / PARTNER_GOAL +
                      Math.max(0, POINTS_GOAL - a.points) / POINTS_GOAL
      return { name, partners: a.partners, points: a.points, qualified, missing, updatedAt: a.updatedAt }
    })

    agents.sort((a, b) => (a.qualified === b.qualified) ? a.missing - b.missing : (a.qualified ? -1 : 1))

    const updatedAt = maxTs
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: true, partnerGoal: PARTNER_GOAL, pointsGoal: POINTS_GOAL, updatedAt, agents }),
    }
  } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: e.message, agents: [] }) }
  }
}

module.exports = require('./_adapt')(handler)
