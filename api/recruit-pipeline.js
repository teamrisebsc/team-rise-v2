const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

const SYNC_SHEET_ID = '1F5ntZXHa4eg1dKf0XR_9yClmeoZOpAW8_zm1GeJaEEY'
const IDX = { name: 2, code: 3, phone: 5, trainer: 10, appt1: 19, appt2: 20, active: 28 }

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

async function readTab(sheetId, tab) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sheet tab "${tab}" returned ${res.status}`)
  const csv = await res.text()
  return csv.split('\n').filter(l => l.trim()).map(parseCSVLine)
}

const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  try {
    const trainerFilter = (event.queryStringParameters?.name || '').toLowerCase()

    const [rtRows, fsRows] = await Promise.all([
      readTab(SYNC_SHEET_ID, 'Recruit Tracker'),
      readTab(SYNC_SHEET_ID, 'Fast Start').catch(() => []),
    ])

    const fsMap = {}
    for (const row of fsRows.slice(1)) {
      const code = clean(row[0])
      if (!code) continue
      fsMap[code] = {
        step3Done: clean(row[2]).toUpperCase() === 'YES',
        step5Done: clean(row[4]).toUpperCase() === 'YES',
      }
    }

    const recruits = []
    for (const row of rtRows.slice(1)) {
      const active = clean(row[IDX.active])
      if (active !== '1') continue
      const trainer = clean(row[IDX.trainer])
      if (trainerFilter && !trainer.toLowerCase().includes(trainerFilter)) continue
      const code  = clean(row[IDX.code])
      const name  = clean(row[IDX.name])
      const phone = clean(row[IDX.phone])
      const appt1 = clean(row[IDX.appt1])
      const appt2 = clean(row[IDX.appt2])
      const fs    = fsMap[code] || {}
      recruits.push({
        name, code, phone, trainer,
        step3Done: !!fs.step3Done,
        step4Done: !!appt1,
        step5Done: !!appt2 || !!fs.step5Done,
      })
    }

    recruits.sort((a, b) => {
      const doneA = [a.step3Done, a.step4Done, a.step5Done].filter(Boolean).length
      const doneB = [b.step3Done, b.step4Done, b.step5Done].filter(Boolean).length
      return doneA - doneB
    })

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ recruits }) }
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ recruits: [], error: e.message }) }
  }
}

module.exports = require('./_adapt')(handler)
