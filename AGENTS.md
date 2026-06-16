# AmorphSentiment — agent notes

Stack: **Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + React Three Fiber (v9) + drei + framer-motion + zustand**.

This project uses standard Next.js 15 App Router conventions:

- App code lives in `app/`. Reusable code in `components/` and `lib/`.
- Tailwind v4 is configured via `app/globals.css` using `@import "tailwindcss"` and `@theme` — there is **no** `tailwind.config.js`.
- Anything that touches the DOM/window, three.js, or uses hooks/state must be a Client Component (`"use client"`).
- The R3F `<Canvas>` is loaded with `next/dynamic` (`ssr: false`) to avoid SSR issues with WebGL.
- Shared state between the DOM tree and the R3F canvas tree goes through the zustand store in `lib/store.ts` (React context does not cross the R3F renderer boundary reliably).
- All data is fake/simulated — see `lib/sentiment.ts` and `lib/presets.ts`. There is no backend.

Run `npm run lint` and `npm run build` before committing.
