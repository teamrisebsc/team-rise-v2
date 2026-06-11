const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

function extractSheetId(input) {
  if (!input) return null
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : input.trim()
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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  try {
    const params = event.queryStringParameters || {}
    const sheetId = extractSheetId(params.sheet_id)
    const tab = params.tab || 'Sheet1'

    if (!sheetId) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing sheet_id' }) }
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`
    const csvRes = await fetch(csvUrl)
    if (!csvRes.ok) throw new Error(`Sheet returned ${csvRes.status}`)
    const csv = await csvRes.text()

    const lines = csv.split('\n').filter(l => l.trim())
    let dataStart = 0
    let headerCols = []
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toUpperCase().includes('FIRST NAME')) {
        headerCols = parseCSVLine(lines[i]).map(h => h.replace(/"/g, '').trim().toLowerCase())
        dataStart = i + 1
        break
      }
    }

    function colIdx(keywords) {
      for (const kw of keywords) {
        const i = headerCols.findIndex(h => h.includes(kw))
        if (i !== -1) return i
      }
      return -1
    }
    const phoneIdx = colIdx(['phone', 'cell', 'mobile', 'number'])
    const emailIdx = colIdx(['email', 'e-mail'])

    const prospects = []
    for (let i = dataStart; i < lines.length && prospects.length < 30; i++) {
      const cols      = parseCSVLine(lines[i])
      const firstName = cols[0]?.replace(/"/g, '').trim()
      if (!firstName) continue
      const lastName  = cols[1]?.replace(/"/g, '').trim() || ''
      const name      = [firstName, lastName].filter(Boolean).join(' ')
      const last      = cols[4]?.replace(/"/g, '').trim() || 'N/A'
      const result    = cols[5]?.replace(/"/g, '').trim() || ''
      const notes     = cols[14]?.replace(/"/g, '').trim() || ''
      const phone     = phoneIdx >= 0 ? (cols[phoneIdx]?.replace(/"/g, '').trim() || '') : ''
      const email     = emailIdx >= 0 ? (cols[emailIdx]?.replace(/"/g, '').trim() || '') : ''
      const combined  = (result + ' ' + notes).toLowerCase()

      let heat = 'warm'
      if (combined.includes('interested') || combined.includes('considering') || combined.includes('wants to') || combined.includes('in person')) heat = 'hot'
      else if (combined.includes('is a recruit') || combined.includes('recruited') || combined.includes('converted') || combined.includes('iul')) heat = 'cool'

      prospects.push({ name, role: 'Prospect', heat, last: last.split(' ')[0] || last, note: result || notes, phone, email })
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ prospects }) }
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) }
  }
}
