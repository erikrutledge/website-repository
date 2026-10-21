# Rutledge Digital — Astro starter

A responsive multi-page starter for a small web-development business. It uses Astro for page templates, one shared layout, reusable header/footer components, a global stylesheet, and a small JavaScript file for the mobile navigation.

## Files to edit most often

- `src/pages/index.astro` — homepage sections and copy
- `src/pages/services.astro` — service descriptions
- `src/pages/portfolio.astro` — replace clearly marked sample concepts with real work
- `src/pages/contact.astro` — contact copy and form setup
- `src/styles/global.css` — colors, typography, spacing, responsive styling
- `src/scripts/main.js` — browser-side interactivity
- `src/components/Header.astro` and `Footer.astro` — shared site chrome
- `src/layouts/BaseLayout.astro` — shared HTML `<head>`, page title/description, and global imports
- `public/` — static files such as favicon, images, downloadable assets

## Run locally

Install Node.js LTS, clone/download this project, open a terminal in this folder, and run:

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal (normally `http://localhost:4321`). Astro's dev server refreshes the page as you edit.

Before committing, run:

```bash
npm run check
npm run build
```

The production site is generated in `dist/`.

## Deploy to Cloudflare Pages through GitHub

1. Create a new GitHub repository for this starter, or carefully copy these files into your existing repository after backing up the current version.
2. Push/commit the project files to the branch Cloudflare Pages watches (often `main`). Keep `package.json`, `astro.config.mjs`, and `src/` at the repository root—not inside an extra nested project folder.
3. In Cloudflare Pages, use **Framework preset: Astro**, **Build command: `npm run build`**, and **Build output directory: `dist`**. The root directory should be blank/default if the project is at repository root.
4. Save and deploy. Every push to the production branch should trigger a new build. Check the deployment build log if it fails.
5. Keep the existing custom domain/DNS settings if this is replacing a live site; verify the deployment preview first so you don't accidentally take down the current site.

Astro static output does not need a Cloudflare server adapter for this starter. If you later add server-rendered pages, functions, a database, or server-side secrets, revisit the deployment architecture.

## Important before launch

- In `src/pages/contact.astro`, replace `hello@example.com` with the actual business email. The `mailto:` form is only a simple starter: it opens the visitor's email app and is not a reliable hosted form backend. Test it or replace it with a reputable form provider/server endpoint before launch.
- Replace portfolio placeholders with genuine work and get client permission before publishing client materials or metrics.
- Add your actual domain to `site` in `astro.config.mjs` if you want to generate canonical URLs reliably. Example: `site: 'https://www.example.com'`.
- Check all links, keyboard navigation, mobile layout, metadata, favicon, privacy disclosures, and contact details before launch.
- Don't commit API keys, passwords, `.env` files, client credentials, or private customer data.

## Git workflow best practices

- Make a branch for substantial changes (for example, `feature/contact-page`) and open a pull request when ready.
- Make small commits with clear messages (`Add service page`, `Fix mobile navigation`).
- Preview locally and run `npm run check` and `npm run build` before merging.
- Let Cloudflare deploy from GitHub. Avoid manually editing generated output or build artifacts.
- Keep the project source in GitHub as the source of truth. Cloudflare's deployment/editor experience is not a substitute for a normal source-code workflow.
