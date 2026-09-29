import { createClient } from 'npm:@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const userClient = createClient(supabaseUrl, anonKey)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const auth = req.headers.get('Authorization') || ''
    if (!auth.startsWith('Bearer ')) throw new Error('Authentication required')
    const { data: { user }, error: authError } = await userClient.auth.getUser(auth.slice(7))
    if (authError || !user) throw new Error('Authentication required')

    const backendUrl = Deno.env.get('CHERUB_BACKEND_URL')?.replace(/\/$/, '')
    const backendToken = Deno.env.get('CHERUB_BACKEND_TOKEN')
    if (!backendUrl) throw new Error('Cherub backend is not configured yet')
    if (!backendToken) throw new Error('Cherub backend token is not configured yet')

    const body = await req.json()
    const response = await fetch(`${backendUrl}/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${backendToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: Array.isArray(body?.messages) ? body.messages : [],
        mode: typeof body?.mode === 'string' ? body.mode : 'general',
        userId: user.id,
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Cherub backend returned an error')
    const reply = typeof data?.reply === 'string' ? data.reply.trim() : ''
    if (!reply) throw new Error('Cherub received an empty response')

    return new Response(JSON.stringify({
      reply,
      liveInfoUsed: Boolean(data?.liveInfoUsed),
      path: typeof data?.path === 'string' ? data.path : 'general',
      tool: data?.tool ?? null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cherub could not respond right now'
    return new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
