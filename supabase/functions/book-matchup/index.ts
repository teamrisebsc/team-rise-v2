import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// This function triggers the BSCpro Playwright scraper to log the appointment.
// BSCpro automatically syncs the appointment to the user's calendar.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { prospect, step, date, time, notes } = await req.json()

  // TODO: Wire to BSCpro Playwright scraper endpoint
  // The scraper URL will be the hosted endpoint for the existing bscpro-scraper
  const scraperUrl = Deno.env.get('BSCPRO_SCRAPER_URL')

  if (!scraperUrl) {
    // Return success stub until scraper is wired up
    console.log('Matchup booked (stub):', { prospect: prospect?.name, step, date, time, notes })
    return new Response(JSON.stringify({ success: true, message: 'Matchup logged (pending BSCpro connection)' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch(scraperUrl + '/book-appointment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prospect, step, date, time, notes }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
