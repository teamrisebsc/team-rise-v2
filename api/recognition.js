const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'Supabase not configured.' }) }
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/report_snapshots?report_key=eq.recognition&select=data,updated_at&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
    const rows = await res.json()
    if (!rows?.length) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'No recognition snapshot yet. Run `node push_recognition_snapshot.js` from bscpro-scraper.' }) }
    }
    const { data, updated_at } = rows[0]
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, data, updated_at }) }
  } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: e.message }) }
  }
}

module.exports = require('./_adapt')(handler)
