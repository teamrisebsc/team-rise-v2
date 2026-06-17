const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

const SYNC_SHEET_ID = '1F5ntZXHa4eg1dKf0XR_9yClmeoZOpAW8_zm1GeJaEEY'
const TAB = 'Recruit Tracker'

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

    const headerLine = parseCSVLine(lines[0]).map(h => clean(h).toLowerCase())

    function col(...keywords) {
      for (const kw of keywords) {
        const i = headerLine.findIndex(h => h.includes(kw))
        if (i !== -1) return i
      }
      return -1
    }

    // Detect columns; fall back to known scrape.js output order
    const NAME_IDX    = col('name')          >= 0 ? col('name')          : 2
    const EMAIL_IDX   = col('email')         >= 0 ? col('email')         : 4
    const CONTACT_IDX = col('contact', 'phone', 'cell') >= 0 ? col('contact', 'phone', 'cell') : 5
    const START_IDX   = col('start_date', 'start date') >= 0 ? col('start_date', 'start date') : 8
    const APPT1_IDX   = col('field_appt_1', 'appt_1', 'appt1') >= 0 ? col('field_appt_1', 'appt_1', 'appt1') : 19
    const APPT2_IDX   = col('field_appt_2', 'appt_2', 'appt2') >= 0 ? col('field_appt_2', 'appt_2', 'appt2') : 20
    const APPT3_IDX   = col('field_appt_3', 'appt_3', 'appt3') >= 0 ? col('field_appt_3', 'appt_3', 'appt3') : 21
    const ACTIVE_IDX  = col('is_active', 'active') >= 0 ? col('is_active', 'active') : 28

    const hasHeader = headerLine[NAME_IDX]?.includes('name')
    const dataStart = hasHeader ? 1 : 0

    const step3 = [], step4 = [], step5 = []

    for (let i = dataStart; i < lines.length; i++) {
      const cols    = parseCSVLine(lines[i])
      const name    = clean(cols[NAME_IDX])
      if (!name) continue

      const isActive = clean(cols[ACTIVE_IDX])
      if (isActive === '0' || isActive.toLowerCase() === 'false') continue

      const email   = clean(cols[EMAIL_IDX])
      const contact = clean(cols[CONTACT_IDX])
      const startDate = clean(cols[START_IDX])
      const appt1   = clean(cols[APPT1_IDX])
      const appt2   = clean(cols[APPT2_IDX])
      const appt3   = clean(cols[APPT3_IDX])

      if (appt3) continue  // completed all 3 steps

      const recruit = { name, email, contact, startDate, appt1, appt2, appt3 }

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

    // Step 3: newest first (just joined); Steps 4 & 5: most overdue first
    step3.sort((a, b) => (b.days || 0) - (a.days || 0))
    step4.sort((a, b) => (b.days || 0) - (a.days || 0))
    step5.sort((a, b) => (b.days || 0) - (a.days || 0))

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ step3: step3.slice(0, 50), step4: step4.slice(0, 50), step5: step5.slice(0, 50) }),
    }
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) }
  }
}
