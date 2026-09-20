# Knot founder + push setup

## Founder / Cupid access

Knot does not grant Cupid access based on a browser flag, email text, or hidden frontend route

The database has a private `public.founder_access` allowlist and the `is_founder()` security function checks it server-side

After the founder account exists in Supabase Auth, run this once in the Supabase SQL Editor, replacing the UUID with the founder account's Auth user ID

```sql
insert into public.founder_access(profile_id)
values ('YOUR_FOUNDER_AUTH_USER_UUID')
on conflict (profile_id) do update set active = true

-- Optional: also give the same account the existing admin role for future role separation
insert into public.admin_roles(profile_id, role)
values ('YOUR_FOUNDER_AUTH_USER_UUID', 'founder')
on conflict (profile_id) do update set role = 'founder'
```

Do not put the UUID into frontend code

Until this row exists, nobody sees the Cupid option and the Command Center RPCs reject access

## Push notifications

The web app already contains the service worker, subscription UI, subscription storage, and VAPID public-key integration

Supabase needs these Edge Function secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_SUBJECT`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

The browser only receives `VITE_WEB_PUSH_PUBLIC_KEY`

The service-role key and VAPID private key must never be placed in the frontend

### Database webhook

Create one Supabase Database Webhook:

- Table: `public.notifications`
- Event: `INSERT`
- Destination: Edge Function `send-push`
- Method: `POST`
- Timeout: 1000 ms
- Authentication: add the project's service-role auth header
- Content-Type: `application/json`

This means a server-side Knot event first creates a notification row, and Supabase then calls `send-push` to deliver it to the recipient's registered browser subscriptions

The push function never accepts a browser-supplied recipient ID as an instruction to send a notification

Expired subscriptions are removed automatically

Push delivery status is recorded on the notification row with `push_sent_at` and `push_error`
