import { createClient } from 'npm:@supabase/supabase-js@2.57.0'

const url = Deno.env.get('SUPABASE_URL')!
const anon = Deno.env.get('SUPABASE_ANON_KEY')!
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: userData } = await userClient.auth.getUser()
    if (!userData.user) return new Response('Unauthorized', { status: 401 })

    const { path } = await req.json()
    if (typeof path !== 'string' || !path.startsWith(`${userData.user.id}/`)) {
      const { data: discover } = await userClient.rpc('get_discover_profiles')
      const allowed = (discover ?? []).some((row: any) => row.profile_photo_path === path)
      if (!allowed) return new Response('Not allowed', { status: 403 })
    }

    const admin = createClient(url, service)
    const { data, error } = await admin.storage.from('profile-photos').createSignedUrl(path, 3600)
    if (error) throw error
    return new Response(JSON.stringify({ url: data.signedUrl }), { headers: { 'content-type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'photo failed' }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
})
