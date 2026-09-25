# Knot v27.4 changes

- Fixed profile creation for authenticated accounts that existed before the auth-to-profile trigger was installed
- `save_profile()` now creates the parent `profiles` row before inserting `profile_interests`
- Preserved the v27.3 flow: Welcome -> Profile Setup -> Email + password -> confirmation -> Homepage
- Preserved the v27.1 Discover Preview and all existing frontend work

## Supabase action required

Run the new migration:
`supabase/migrations/20260926000300_knot_v27_profile_bootstrap.sql`

No existing user account needs to be deleted.

- Corrected the GRANT/REVOKE signature for the v27 `save_profile()` function so the bootstrap migration executes successfully.
