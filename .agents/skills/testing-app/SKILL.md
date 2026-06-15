---
name: testing-amorphsentiment
description: How to run and end-to-end test the AmorphSentiment demo locally. Use when verifying UI/sentiment behavior or before deploying.
---

# Testing AmorphSentiment

Single-page Next.js 15 (App Router) + R3F + zustand demo. All data is simulated; no backend, no credentials needed.

## Run locally
- Install: `npm install`
- Dev: `npm run dev` then open http://localhost:3000
- Production (what Vercel serves): `npm run build` then `npm run start` (port 3000)
- Lint / typecheck: `npm run lint` and `npm run build` (build also runs `tsc`)

## Gotcha: never build while dev is running
`npm run dev` and `npm run build` share the `.next` directory. Running `npm run build` while `next dev` is live corrupts the dev server's output and the page renders **unstyled** (no Tailwind, no canvas). Fix: stop dev, `rm -rf .next`, rebuild. For clean UI testing prefer testing the production build (`npm run build && npm run start`).

## Primary end-to-end flows to verify
1. Click preset **City Light Festival** -> blob blooms green/cyan; results panel header "Positive", positive score top (~88%).
2. Click preset **App v3 Update** -> blob turns red/orange + spiky; header "Negative", negative top (~94%). Must look clearly different from the positive state.
3. Type custom text in the input orb and click **Analyze** (or Ctrl/Cmd+Enter) -> sentiment + key phrases reflect the typed words (proves the engine reads input, not a preset).
4. **Classic** toggle (top-right) -> 3D canvas replaced by a plain "Sentiment dashboard" with the same numbers; label flips to "Organic".
5. **Reset** (in results panel) -> panel clears, input empties, blob relaxes to neutral blue idle.

The sentiment engine is deterministic (seeded PRNG hashed from input in `lib/sentiment.ts`), so the same text always produces the same result.
