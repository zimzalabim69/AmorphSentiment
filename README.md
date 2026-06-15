# AmorphSentiment

A single-page, **amorphous** sentiment-analysis demo. Instead of a dashboard, you get a living, bioluminescent organism: a gooey 3D blob that **blooms** for positive sentiment, **spikes and darkens** for negative, and **drifts in calm waves** when neutral. Feed it any text, topic, or URL and watch the mood take shape.

> All analysis is **simulated** — there is no backend and no network calls. The fake engine is deterministic per-input, so the same text always grows the same organism.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/zimzalabim69/AmorphSentiment)

## Features

- **Living organism** — a high-detail icosphere displaced by GLSL simplex noise in a custom shader. Shape, color, energy, and "breathing" are driven by the current sentiment.
- **Bioluminescent theme** — dark background, soft glowing gradients (framer-motion), a drifting particle field, and selective bloom / vignette post-processing.
- **Glowing input orb** — type a topic or paste text/URL. `⌘/Ctrl + Enter` to submit. The orb pulses while "sensing".
- **Organic results** — sentiment scores morph in as liquid bars, emotions orbit the organism as floating nodes, and key phrases float as tendril-like pills.
- **Preset topics** — 3–4 ready-made topics (positive, negative, neutral, surprise) to click and explore.
- **Interactions** — drag the organism to rotate it, hover elements for ripples, and the whole scene gently breathes and warps.
- **Classic mode** — a clean, accessible, no-WebGL dashboard fallback (also great for reduced-motion users).
- **Sound cues** — optional synthesized whooshes/chimes via the Web Audio API (off by default, toggle in the top bar). No audio assets shipped.
- **Responsive & touch-friendly.**

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [React Three Fiber](https://r3f.docs.pmnd.rs/) + [drei](https://github.com/pmndrs/drei) + custom GLSL shaders (the gooey blob)
- [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing) (bloom / vignette / grain)
- [Framer Motion](https://www.framer.com/motion/) for 2D morphs
- [Zustand](https://github.com/pmndrs/zustand) for state shared across the DOM ↔ R3F boundary

## Getting started

```bash
npm install
npm run dev
# open http://localhost:3000
```

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## One-click deploy (Vercel)

1. Click the **Deploy with Vercel** button above, or import the repo at
   [vercel.com/new](https://vercel.com/new).
2. Framework preset is auto-detected as **Next.js** — no environment variables
   are required (the demo has no backend).
3. Deploy. That's it.

## Project structure

```
app/
  layout.tsx          # fonts, metadata, theme
  globals.css         # Tailwind v4 + bioluminescent base styles
  page.tsx            # renders <Experience />
components/
  Experience.tsx      # top-level layout; lazy-loads the 3D canvas (ssr: false)
  scene/
    OrganismCanvas.tsx # R3F <Canvas>, lights, post-processing
    Blob.tsx           # the organism mesh + shader uniforms
    blobShader.ts      # GLSL vertex/fragment (simplex displacement + fresnel)
    Particles.tsx      # drifting bioluminescent particle field
    ResultNodes.tsx    # emotion nodes orbiting the organism
  ui/
    Background.tsx     # breathing 2D gradient field
    TopBar.tsx         # title + sound + classic-mode toggles
    InputOrb.tsx       # glowing prompt field + Analyze button
    PresetTopics.tsx   # clickable preset topic pills
    ResultsPanel.tsx   # organic results (scores, emotions, phrases)
    ClassicMode.tsx    # plain dashboard fallback
lib/
  sentiment.ts        # the fake, deterministic sentiment engine + palette
  presets.ts          # sample preset topics
  store.ts            # zustand store (phase, query, result, toggles)
  sound.ts            # Web Audio synthesized cues
  types.ts            # shared types
```

## How the "analysis" works

`lib/sentiment.ts` mixes a tiny positive/negative lexicon with a seeded PRNG
(`mulberry32` seeded from a hash of the input). It produces normalized
positive/neutral/negative scores, a dominant sentiment, an emotional spectrum,
extracted key phrases, an intensity value, and a short narrative summary. Those
values feed both the 2D UI and the shader uniforms that sculpt the blob.

## License

MIT
