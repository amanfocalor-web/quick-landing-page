# Knot build status

This project is the current Knot social/dating product, not the legacy Flagships or digital-legacy concept

## Included

- React/TanStack frontend compatible with Lovable
- Supabase Auth foundation
- PostgreSQL schema and Row Level Security
- Server-authoritative 18–21 eligibility gate
- Profile onboarding with device photo upload and camera capture
- Verification integration point for DigiLocker/live-camera flow
- Free city changes for now
- Incognito mode
- Discover with real server-side city and age-preference filtering
- Card flip interaction
- Pass / Interested / Secret Crush
- Double-blind Secret Crush storage
- Mutual matching and text-only Trial Chat
- Trial → mutual Go Exclusive → Coupled Mode foundation
- 24-hour breakup cooling-off foundation
- In-app notifications
- Web push subscription foundation and push Edge Function
- Private profile-photo storage with controlled signed URLs
- Creator Command Center foundation
- Creator user search, ban/restore, metrics, audit log, and Cupid Spark
- Creator privacy boundary: no raw chat bodies and no Secret Crush recipient-side exposure

## Intentionally not implemented as fake functionality

- DigiLocker verification
- Live identity/liveness verification provider integration
- Production VAPID keys
- Production push delivery trigger wiring
- Production founder account assignment
- Full double-date/couple QR flow UI
- Final moderation/appeal workflow UI

Those are explicit integration/next-layer items rather than browser-side placeholders pretending to be secure
