const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY
const DEADLINE     = 'June 30, 2026'

function findEntry(rows, name) {
  if (!rows?.length) return null
  if (!name) return rows[0]
  const lower = name.toLowerCase()
  const first = lower.split(' ')[0]
  const exact = rows.find(r => r.name?.toLowerCase() === lower)
  if (exact) return exact
  return rows.find(r => r.name?.toLowerCase().includes(first)) || null
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  const name = event.queryStringParameters?.name || ''

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ error: 'Supabase env vars not set on Netlify.' }),
    }
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gx_cache?select=name,data,updated_at`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ error: `Supabase error ${res.status}: ${text.slice(0, 200)}` }),
      }
    }

    const rows = await res.json()
    const entry = findEntry(rows, name)

    if (!entry) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ error: 'No GX data found — run Sync GX from the local app to push data.' }),
      }
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
        deadline:  DEADLINE,
        synced_at: entry.updated_at,
      }),
    }
  } catch (e) {
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ error: e.message }),
    }
  }
}
