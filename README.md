# Warm Welcome

hi

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5e2aa5c9-b4f8-4a53-839e-3c260b1f73dc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Knot current flow
Welcome → Login → Homepage for an existing account.

New here? Create an account → email/password → profile setup → Discover/Homepage.

The homepage currently uses local demo Discover profiles and demo Activity notifications as the working frontend experience. These demo actions do not write to Supabase.


## Knot v38 additions
- Separate Discover Profile photo required before entering Discover
- City-aware university selection with Other fallback
- Secret Crush also records Interested for potential mutual connection
- Demo trial chat messages persist in browser storage
- Discover portrait loading state prevents blank cards while photos decode


## v38 interaction notes
- Discover photos use local 1280px-wide display assets and are preloaded
- Pass, Interested, and Secret Crush have distinct action animations
- Secret Crush is also recorded as Interested and reciprocal Interested/Secret Crush choices can create a mutual trial connection
- Demo Discover profiles are not repeated until the full local suggestion set has been exhausted


### v42 Cherub
- Cherub is an in-app assistant with persistent per-account chat history and Conversation, Profile, Guide and Safety modes
- Cherub now uses a separate self-hosted backend architecture rather than a vendor AI API
- The browser talks to Supabase; the Supabase Cherub function forwards permitted requests to the self-hosted Cherub backend
- Cherub backend files live in `cherub-server/` and own the assistant orchestration and inference boundary

### v40 image loading
Demo Discover photos are stored as local 640px WebP assets and preloaded from the document head, with high-priority browser decoding. Duplicate portrait copies and unused source/reference images are removed to keep the bundle small without changing the Discover photos.
