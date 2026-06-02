import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { prompt } = await req.json()
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are an AI assistant for Team Rise, a WFG financial team led by Olivia and Tracy Sula-Wang. Be concise and actionable. Format responses clearly with bullet points where appropriate.',
    }),
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || 'No response received.'

  return new Response(JSON.stringify({ response: text }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
