# Mindful Breath Timer

Free, single‑page, accessible breathing timer with a visual mountain path animation. Supports Box Breathing, 4‑7‑8, and fully custom cycles. Built with Tailwind CSS v4 (local build, no CDN) and ready for Cloudflare Pages.

## Features
- Visual animation tracking inhale / hold / exhale on a mountain arc
- Preset patterns: Box (4-4-4-4), 4-7-8 Relaxing Breath
- Custom pattern inputs (inhale, first hold, exhale, second hold)
- Session timer + auto summary after completion
- Share button (Web Share API) where supported
- Mobile-first responsive layout
- SEO optimized (meta, Open Graph, Twitter, sitemap, robots, structured data)
- PWA basics: manifest, icons, theme color

## Tech Stack
- Tailwind CSS v4 (local build via CLI)
- Zero runtime frameworks (vanilla JS)

## Project Structure
```
index.html                # Main SPA
scripts/app.js            # Core logic
src/input.css             # Tailwind source (scan + layers)
tailwind.config.js        # Tailwind config
package.json              # Build scripts / dev deps
dist/style.css            # Generated (build output)
public/manifest.webmanifest
public/icon.svg           # Fallback / vector icon
public/robots.txt
public/sitemap.xml
favicon.png               # (Place this in project root for browser tab icon)
```

## Development
Install dependencies and run the Tailwind watcher:

```bash
npm install
npm run dev
```
Open `index.html` in a local server (e.g. using VS Code Live Server or a simple Python/Node static server).

## Production Build
```bash
npm run build
```
Outputs `dist/style.css` (minified) for deployment.

## Cloudflare Pages Deployment (Complete Guide)

### A. One‑Click (Recommended)
1. Commit everything (including `package.json`, `tailwind.config.js`, `src/`, and `dist/` optional).
2. Push to GitHub / GitLab.
3. In Cloudflare Dashboard: Pages → Create Project → Connect to your repo.
4. Configure build:
   - Framework preset: None
   - Build command: `npm run build`
   - Build output directory: `.`
   - Root directory: (leave empty)
5. Add Environment Variable (optional): `NODE_VERSION` = your current Node (e.g. `18.20.3`).
6. Deploy. Cloudflare runs the build, generates `dist/style.css`, serves `index.html`.
7. Add custom domain (Pages → Custom domains). Ensure it propagates + HTTPS active.

### B. Pre-Built (No build on Cloudflare)
If you want to avoid a build step:
```bash
npm install
npm run build
git add dist/style.css
git commit -m "Add built CSS"
git push
```
Then in Pages set:
 - Build command: (leave empty)
 - Output directory: `.`
Cloudflare will just serve existing files.

### C. Drag & Drop (Fast test)
1. Run `npm run build` locally.
2. Ensure `dist/style.css` exists.
3. Zip project or select folder → Pages → Upload.

### D. Local Preview (Optional)
Add Wrangler later:
```bash
npm i -D wrangler
npx wrangler pages dev .
```

### Domain & Caching Tips
- Replace all `https://your-domain.example/` placeholders in `index.html`, `robots.txt`, `sitemap.xml` with your real domain before final deploy.
- After deploy, purge cache (Pages → Purge) if CSS changes aren’t visible.
- Set correct canonical URL to avoid duplicate SEO signals.

## Files NOT strictly required for Cloudflare Pages runtime
You can delete these if you prefer minimal footprint (only if you understand the trade-offs):
- `public/sitemap.xml` (but recommended for SEO)
- `public/robots.txt` (Pages will still be crawled; keep if you want explicit control)
- `public/icon.svg` (if you only use `favicon.png`)
- `public/manifest.webmanifest` (remove if you don’t care about PWA installability)
- `LICENSE` (keep if open sourcing under MIT; add one if absent)
- `dist/style.css` (if you rely on Cloudflare build step to regenerate it) 

Keep these ALWAYS:
- `index.html`, `scripts/app.js`, `src/input.css`, `tailwind.config.js`, `package.json`

## Favicon
Place your `favicon.png` in the project root. Already referenced in `<head>` of `index.html` as:
```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
```
Update sizes or add additional favicon sizes if needed.

## Optional: Wrangler Preview (if you add it later)
You can add `wrangler` for local preview:
```bash
npm install -D wrangler
npx wrangler pages dev .
```
_Not installed by default to keep dependencies minimal._

## Accessibility
- High contrast dark theme
- Motion reduced when user sets `prefers-reduced-motion`
- Semantic headings and labels

## SEO Checklist Included
- Canonical link
- Meta description + keywords
- Open Graph + Twitter card
- Structured data (WebApplication)
- Sitemap + robots.txt

## Customization
Edit `tailwind.config.js` to extend theme or add utilities. Put additional component styles in `@layer components` inside `src/input.css`.

## License
MIT (you can add a `LICENSE` file; if absent, clarify usage policy.)

---
Made to encourage calm, focus, and mindful breaks. Free to use.
