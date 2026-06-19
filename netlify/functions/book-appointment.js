const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: '{"error":"Method not allowed"}' }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ error: 'Supabase env vars not configured on Netlify.' }) }
  }

  try {
    const requestData = JSON.parse(event.body || '{}')

    const res = await fetch(`${SUPABASE_URL}/rest/v1/appointment_queue`, {
      method: 'POST',
      headers: {
        apikey:         SUPABASE_KEY,
        Authorization:  `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer:         'return=representation',
      },
      body: JSON.stringify({ request_data: requestData, status: 'pending' }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ error: `Queue error: ${text.slice(0, 200)}` }) }
    }

    const rows = await res.json()
    const job  = rows[0]

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ queued: true, job_id: job.id }),
    }
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) }
  }
}
