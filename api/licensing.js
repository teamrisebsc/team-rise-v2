const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

// BSCpro Sync Sheet — "Licensing" tab is kept current by scrape_licensing_tracker.js
const SYNC_SHEET_ID = '1F5ntZXHa4eg1dKf0XR_9yClmeoZOpAW8_zm1GeJaEEY'

function parseCSVLine(line) {
  const result = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQ = !inQ }
    else if (line[i] === ',' && !inQ) { result.push(cur); cur = '' }
    else { cur += line[i] }
  }
  result.push(cur)
  return result
}

function clean(v) { return (v || '').replace(/"/g, '').trim() }
function stripHtml(v) { return clean(v).replace(/<[^>]*>/g, '').trim() }

const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  try {
    const url = `https://docs.google.com/spreadsheets/d/${SYNC_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Licensing`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Licensing sheet returned ${res.status}`)
    const csv   = await res.text()
    const lines = csv.split('\n').filter(l => l.trim())
    const header = parseCSVLine(lines[0]).map(h => clean(h).toLowerCase())
    const col = kw => header.findIndex(h => h.includes(kw))

    const IDX = {
      name:     col('name'),
      state:    col('state'),
      phone:    col('phone'),
      leader:   col('team leader'),
      level:    col('level'),
      preLic:   col('pre-license'),
      testFl:   col('test date (fl)'),
      testNy:   col('test date (ny)'),
      notes:    col('notes'),
      category: col('blocker category'),
      days:     col('days in pipeline'),
      synced:   col('last synced'),
    }

    let lastSynced = null
    const people = []
    for (const line of lines.slice(1)) {
      const c    = parseCSVLine(line)
      const name = clean(c[IDX.name])
      if (!name) continue
      if (!lastSynced && IDX.synced >= 0) lastSynced = clean(c[IDX.synced])
      people.push({
        name,
        state:      clean(c[IDX.state]),
        phone:      clean(c[IDX.phone]),
        teamLeader: clean(c[IDX.leader]),
        level:      clean(c[IDX.level]),
        preLicense: clean(c[IDX.preLic]),
        testDate:   clean(c[IDX.testFl]) || clean(c[IDX.testNy]),
        notes:      stripHtml(c[IDX.notes]),
        category:   clean(c[IDX.category]) || 'Uncategorized',
        days:       parseInt(clean(c[IDX.days]), 10) || 0,
      })
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, lastSynced, people }) }
  } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: e.message, people: [] }) }
  }
}

module.exports = require('./_adapt')(handler)
