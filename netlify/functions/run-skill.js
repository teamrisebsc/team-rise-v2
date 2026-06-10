const skillsData = require('./skills-data.json')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: '{"error":"Method not allowed"}' }

  try {
    const { prompt, skillFile, apiKey } = JSON.parse(event.body || '{}')
    const key = apiKey || process.env.ANTHROPIC_API_KEY

    if (!key) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: 'No API key configured. Add your Anthropic API key in Profile Settings, or ask your admin to set the team key.' }),
      }
    }

    let systemPrompt =
      'You are a helpful AI assistant for Team RISE at WFG (World Financial Group). ' +
      'Respond with clear, well-structured reports. Use headers, bullet points, and bold text to organize information. ' +
      'Be concise but thorough. Format numbers clearly.'

    if (skillFile && skillsData[skillFile]) {
      systemPrompt = skillsData[skillFile].content + '\n\n---\n\n' + systemPrompt
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         key,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 4096,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: `API error ${res.status}: ${errText.slice(0, 300)}` }),
      }
    }

    const data = await res.json()
    const response = data.content?.[0]?.text || 'No response.'
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, response }) }

  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: e.message }) }
  }
}
