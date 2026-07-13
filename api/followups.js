const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

// Shape the raw appointments snapshot into the Follow-Up Hub's three lists
function buildFollowups(data) {
  const all = [
    ...(data.yesterday_all || []),
    ...(data.last_saturday_all || []),
    ...(data.today_olivia || []),
  ]

  // Dedupe by prospect+date+time (today_olivia may overlap)
  const seen = new Set()
  const appts = all.filter(a => {
    const k = `${a.prospect}|${a.date}|${a.time}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const isBpm = a => /bpm|vgo/i.test(`${a.step || ''} ${a.kind || ''}`)

  return {
    scrapedAt: data.scraped_at,
    dates:     data.dates,
    // BPM guests: showed → Captain follow-up call; no-show → rebook to next BPM
    bpm: {
      showed:  appts.filter(a => isBpm(a) && a.showed === true),
      noShows: appts.filter(a => isBpm(a) && a.showed === false),
    },
    // Non-BPM appointments that happened but produced no next booking
    apptFollowUp: {
      noNextBooked: appts.filter(a => !isBpm(a) && a.showed === true  && !a.follow_up_scheduled),
      noShows:      appts.filter(a => !isBpm(a) && a.showed === false),
    },
  }
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
      `${url}/rest/v1/report_snapshots?report_key=eq.appointments&select=data,updated_at&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
    const rows = await res.json()
    if (!rows?.length) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'No appointments snapshot yet. Run `node push_appointments_snapshot.js` from bscpro-scraper.' }) }
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, ...buildFollowups(rows[0].data), updated_at: rows[0].updated_at }) }
  } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: e.message }) }
  }
}

module.exports = require('./_adapt')(handler)
module.exports.buildFollowups = buildFollowups
