const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

const PARTNER_GOAL = 3
const POINTS_GOAL  = 15000

const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'Supabase not configured.', agents: [] }) }
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/gx_cache?select=name,data,updated_at`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
    const rows = await res.json()

    const agents = rows.map(r => {
      const d = r.data || {}
      const partners = d.recruits || 0
      const points   = Math.round(d.points || 0)
      // Closeness score: fraction of each goal still missing (lower = closer to qualifying)
      const missing  = Math.max(0, PARTNER_GOAL - partners) / PARTNER_GOAL +
                       Math.max(0, POINTS_GOAL - points) / POINTS_GOAL
      return {
        name:      (d.name || r.name || '').replace(/\s*\([A-Z0-9]+\)$/, ''),
        partners,
        points,
        qualified: !!d.qualified || (partners >= PARTNER_GOAL && points >= POINTS_GOAL),
        missing,
        updatedAt: r.updated_at,
      }
    })

    agents.sort((a, b) => (a.qualified === b.qualified) ? a.missing - b.missing : (a.qualified ? -1 : 1))

    const updatedAt = agents.reduce((m, a) => (!m || a.updatedAt > m) ? a.updatedAt : m, null)
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
