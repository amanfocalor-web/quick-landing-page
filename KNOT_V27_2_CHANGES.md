# Knot v27.2

## Backend/deployment hardening
- Kept v27.1 as the source base; no Discover Preview behavior was removed.
- Fixed a duplicate `const client` declaration in `src/lib/knot.ts` that could prevent TypeScript compilation.
- Updated Supabase setup instructions to apply both the core and v27 migrations in order.
- Aligned environment-variable documentation with the current `VITE_SUPABASE_PUBLISHABLE_KEY` frontend support.
- Added `supabase/VERIFY_DEPLOYMENT.sql`, a read-only diagnostic script for confirming that the schema, RPCs, storage bucket, and v27 gender column are actually present in the connected Supabase project.

## Important
The ZIP contains the backend schema and Edge Function source, but it cannot modify the user's hosted Supabase project by itself. The SQL migrations must be executed in that project.

Identity verification remains an explicit integration point and is not faked by this version. The production authorization model still requires verified users for protected matching/chat actions.
