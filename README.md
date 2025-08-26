# Mindful Breath Timer

A tiny, accessible single‑page breathing timer with a visual mountain animation. Presets (Box, 4‑7‑8) plus custom cycles, mobile‑first and PWA‑ready. Built with plain JavaScript and local Tailwind CSS.

## Quick start

1. Install dependencies and run the Tailwind watcher:

   npm install
   npm run dev

2. Build for production:

   npm run build

Open `index.html` with a static server (VS Code Live Server, `python -m http.server`, etc.).

## Key features

- Visual inhale/hold/exhale animation
- Preset and custom breathing cycles
- Session timer + summary
- Web Share API support where available
- Mobile-first, accessible (prefers-reduced-motion, semantic markup)

## Tech

- Vanilla JavaScript
- Tailwind CSS (local build)
- Minimal PWA meta + manifest

## Important files

- `index.html` — main SPA
- `scripts/app.js` — app logic
- `src/input.css` & `tailwind.config.js` — Tailwind source/config
- `dist/style.css` — generated (build output)
- `public/manifest.webmanifest`, icons — PWA

## Deploy

Works on static hosts. For Cloudflare Pages: add the repo, set build command `npm run build` (or pre-build and commit `dist/style.css`) and publish.

Made to help short, calm breathing breaks. Contributions welcome.
