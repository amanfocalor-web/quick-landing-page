# Knot + Supabase setup

1. Create a Supabase project
2. In the Supabase SQL editor, run `supabase/migrations/20260920000100_knot_core.sql` and then `supabase/migrations/20260925000200_knot_v27_gender_and_crush_limit.sql`
3. Add the project URL and browser publishable key as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the frontend also accepts the legacy `VITE_SUPABASE_ANON_KEY` name)
4. Deploy the Edge Functions under `supabase/functions` (including `send-push` and `signed-profile-photo`)
5. Add `SUPABASE_SERVICE_ROLE_KEY` only as an Edge Function secret, never to the frontend
6. For web push, generate VAPID keys and set `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` as Edge Function secrets
7. Add the VAPID public key to the frontend as `VITE_WEB_PUSH_PUBLIC_KEY`
8. Keep email/password authentication enabled for the prototype

## Founder account

Use `FOUNDER_AND_PUSH_SETUP.md` to add the founder Auth UUID to the private `public.founder_access` allowlist. Cupid access is server-authorized and is not granted to other admin roles

## Important security properties

- The browser cannot mark an account eligible or verified
- The browser cannot insert chat messages directly; it uses a controlled RPC
- The browser cannot insert Secret Crush records directly; it uses a controlled RPC
- Creator/admin policies do not grant access to `messages` or `secret_crushes`
- Discover data is returned by a server-side function and does not expose city on the card payload
- Banned users lose access to protected app operations through server-side checks


## Current status

The Knot frontend and database layer are wired for Supabase Auth, Postgres, Storage, RPCs, and the existing privacy model. The remaining deployment step is project-specific: connect the Supabase project, add its public URL and browser publishable key to the app environment, and apply both migrations in order.

Do not put a Supabase service-role key in the frontend.

The v27 migration is required because it adds the explicit gender field and the server-side Secret Crush limit. Applying only the original core migration leaves the frontend/backend contract incomplete. The `auth.users` trigger creates the corresponding Knot profile automatically, while `save_profile` stores the profile fields and interests without allowing the client to self-mark as verified.
