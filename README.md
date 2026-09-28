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


## Knot v37 additions
- Separate Discover Profile photo required before entering Discover
- City-aware university selection with Other fallback
- Secret Crush also records Interested for potential mutual connection
- Demo trial chat messages persist in browser storage
- Discover portrait loading state prevents blank cards while photos decode
