import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { sheet_id } = await req.json()
  if (!sheet_id) return new Response(JSON.stringify({ error: 'No sheet_id provided' }), { status: 400, headers: corsHeaders })

  // Fetch the sheet as CSV (sheet must be shared with service account or published)
  const url = `https://docs.google.com/spreadsheets/d/${sheet_id}/gviz/tq?tqx=out:csv&sheet=Prospects`
  const res  = await fetch(url)
  const csv  = await res.text()

  const lines = csv.trim().split('\n').slice(1) // skip header row
  const rows  = lines.map(line => {
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim())
    return {
      name: cols[0] || '',
      role: cols[1] || '',
      heat: (cols[2] || 'cool').toLowerCase(),
      last: cols[3] || '',
      note: cols[4] || '',
    }
  }).filter(r => r.name)

  return new Response(JSON.stringify({ rows }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
