import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.57.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(supabaseUrl, serviceRoleKey)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

Deno.serve(async (req) => {
  try {
    // This endpoint is intended to be invoked by a Supabase Database Webhook
    // using the project's service-role auth header. Do not expose it as a
    // client-side notification API.
    const authHeader = req.headers.get('Authorization') || ''
    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    const payload = await req.json()
    const notification = payload?.record ?? payload
    const notificationId = String(notification?.id || '')
    const profileId = String(notification?.profile_id || '')
    const title = String(notification?.title || 'Knot')
    const message = String(notification?.body || 'You have a new update')

    if (!notificationId || !profileId) {
      return new Response('notification id and profile id required', { status: 400 })
    }

    const { data: current, error: notificationError } = await admin
      .from('notifications')
      .select('id,push_sent_at')
      .eq('id', notificationId)
      .maybeSingle()
    if (notificationError) throw notificationError
    if (!current || current.push_sent_at) {
      return Response.json({ ok: true, skipped: true })
    }

    const { data: subscriptions, error } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .eq('profile_id', profileId)
    if (error) throw error

    const failures: string[] = []

    await Promise.all((subscriptions ?? []).map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify({
            title,
            body: message,
            url: '/?notification=' + encodeURIComponent(notificationId),
            notificationId,
          }),
        )
      } catch (err: any) {
        const status = err?.statusCode
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', row.id)
        } else {
          failures.push(String(status || err?.message || 'push delivery failed'))
        }
      }
    }))

    await admin
      .from('notifications')
      .update({
        push_sent_at: new Date().toISOString(),
        push_error: failures.length ? failures.join('; ').slice(0, 1000) : null,
      })
      .eq('id', notificationId)

    return Response.json({ ok: true, delivered: (subscriptions ?? []).length, failures: failures.length })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'push failed' },
      { status: 500 },
    )
  }
})
