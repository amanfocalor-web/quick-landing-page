# Knot frontend repair

This build is a repair of the existing Knot React/TanStack frontend. It does not replace the product with a mockup.

## Repaired

- Restored the missing global layout layer for the actual Knot screens.
- Restored full-screen welcome positioning, star field, central star, typography, contrast and responsive behavior.
- Added the missing presentation layer for authentication, profile setup, Discover, cards, matches, chats, notifications, profile and Creator Command Center.
- Added mobile/tablet responsive rules and accessible focus states.
- Added loading and empty-state presentation.
- Fixed the Creator Command Center's missing `selectedA` / `selectedB` state variables.
- Added Creator loading/error handling so a backend problem does not crash the entire Creator screen.
- Fixed the `saveProfile` TypeScript contract so callers no longer have to provide the server-managed `profileComplete` field.
- Replaced the `React.FormEvent` / `React.ReactNode` namespace references with explicit React type imports.

## Deliberately preserved

- Existing Supabase integration and backend functions.
- Server-authoritative eligibility logic.
- Verification integration point.
- Existing Discover interaction model.
- Existing Creator privacy boundary.
- Existing push-notification foundation.
- Existing routes and project structure.

The frontend should be previewed with the project's normal dependency installation and `npm run dev` / Lovable preview. This archive does not contain production Supabase credentials or VAPID private keys.
