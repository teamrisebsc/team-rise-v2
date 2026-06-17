const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

const SYNC_SHEET_ID = '1F5ntZXHa4eg1dKf0XR_9yClmeoZOpAW8_zm1GeJaEEY'
const TAB = 'Recruit Tracker'

// Column indices from scrape.js output order (row 0 is a misaligned header — skip it)
const COL = {
  NAME:       2,
  EMAIL:      4,
  CONTACT:    5,
  START_DATE: 8,
  FIELD_APPT_1: 19,
  FIELD_APPT_2: 20,
  FIELD_APPT_3: 21,
  IS_ACTIVE:  28,
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes }
    else if (line[i] === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += line[i] }
  }
  result.push(current)
  return result
}

function clean(v) { return (v || '').replace(/"/g, '').trim() }

function daysSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today - d) / (1000 * 60 * 60 * 24)))
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SYNC_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TAB)}`
    const res = await fetch(csvUrl)
    if (!res.ok) throw new Error(`Sheet returned ${res.status}`)
    const csv = await res.text()
    const lines = csv.split('\n').filter(l => l.trim())

    const step3 = [], step4 = [], step5 = []

    // Row 0 is header (misaligned from data cols) — start at 1
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])

      const name = clean(cols[COL.NAME])
      if (!name) continue

      const isActive = clean(cols[COL.IS_ACTIVE])
      if (isActive !== '1' && isActive.toLowerCase() !== 'true') continue

      const contact   = clean(cols[COL.CONTACT])
      const email     = clean(cols[COL.EMAIL])
      const startDate = clean(cols[COL.START_DATE])
      const appt1     = clean(cols[COL.FIELD_APPT_1])
      const appt2     = clean(cols[COL.FIELD_APPT_2])
      const appt3     = clean(cols[COL.FIELD_APPT_3])

      if (appt3) continue  // all three steps complete

      const recruit = { name, contact, email, startDate, appt1, appt2, appt3 }

      if (!appt1) {
        recruit.days = daysSince(startDate)
        step3.push(recruit)
      } else if (!appt2) {
        recruit.days = daysSince(appt1)
        step4.push(recruit)
      } else {
        recruit.days = daysSince(appt2)
        step5.push(recruit)
      }
    }

    // Most overdue first for all steps
    const byDays = (a, b) => (b.days || 0) - (a.days || 0)
    step3.sort(byDays)
    step4.sort(byDays)
    step5.sort(byDays)

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ step3: step3.slice(0, 50), step4: step4.slice(0, 50), step5: step5.slice(0, 50) }),
    }
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) }
  }
}
