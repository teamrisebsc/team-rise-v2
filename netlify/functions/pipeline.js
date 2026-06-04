export default async (req, context) => {
  const url = new URL(req.url)
  const sheetId = url.searchParams.get('sheet_id')
  const tab     = url.searchParams.get('tab') || 'Sheet1'

  if (!sheetId) {
    return new Response(JSON.stringify({ error: 'Missing sheet_id' }), { status: 400 })
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`

  try {
    const res = await fetch(csvUrl)
    if (!res.ok) throw new Error(`Sheet returned ${res.status}`)
    const csv = await res.text()

    const lines = csv.split('\n').filter(l => l.trim())

    // Find header row containing FIRST NAME
    let dataStart = 0
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toUpperCase().includes('FIRST NAME')) {
        dataStart = i + 1
        break
      }
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

    const prospects = []
    for (let i = dataStart; i < lines.length && prospects.length < 30; i++) {
      const cols = parseCSVLine(lines[i])
      const firstName = cols[0]?.replace(/"/g, '').trim()
      if (!firstName) continue
      const lastName = cols[1]?.replace(/"/g, '').trim() || ''
      const name     = [firstName, lastName].filter(Boolean).join(' ')
      const last     = cols[4]?.replace(/"/g, '').trim() || 'N/A'
      const result   = cols[5]?.replace(/"/g, '').trim() || ''
      const notes    = cols[14]?.replace(/"/g, '').trim() || ''
      const combined = (result + ' ' + notes).toLowerCase()

      let heat = 'warm'
      if (combined.includes('interested') || combined.includes('considering') || combined.includes('wants to') || combined.includes('in person')) heat = 'hot'
      else if (combined.includes('is a recruit') || combined.includes('recruited') || combined.includes('converted') || combined.includes('iul')) heat = 'cool'

      prospects.push({
        name,
        role: 'Prospect',
        heat,
        last: last.split(' ')[0] || last,
        note: result || notes
      })
    }

    return new Response(JSON.stringify({ prospects }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}

export const config = { path: '/api/pipeline' }
