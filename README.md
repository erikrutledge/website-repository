# Rutledge Digital

Business website and a browser-local daily habit tracker, built with Astro and deployed to Cloudflare Workers. The contact endpoint verifies Cloudflare Turnstile and sends inquiries through Resend.

## Development

Use Node.js 22 LTS or a compatible supported version.

```sh
npm ci
npm run dev
```

```sh
npm run check
npm test
npm run build
```

`npm run preview` previews the production build. Dependencies, generated output, local secrets, and editor logs are ignored by Git.

## Source map

- `src/pages/`: business pages, `/habits`, and the `/api/contact` endpoint.
- `src/layouts/BaseLayout.astro`: business site's document, metadata, and shared header/footer.
- `src/components/`: reusable site components.
- `src/data/projects.js`: portfolio content.
- `src/styles/global.css`: business site styles; `habits.css`: isolated tracker styles.
- `src/scripts/main.js`: mobile navigation and animated theme switch.
- `src/scripts/habits/app.js`: tracker screens and interaction handlers.
- `src/scripts/habits/model.js`: date handling, active habit ordering, and daily snapshots.
- `src/scripts/habits/storage.js`: IndexedDB persistence with localStorage fallback.
- `public/`: assets served unchanged. Browser scripts belong in `src/` so Astro can bundle imports.
- `tests/`: habit data regression tests, using Node's built-in test runner.

The habit tracker has its own document and styles so it stays independent of the business site's navigation and themes. Keep new tracker logic in its existing modules; add components or modules when there is a clear responsibility to separate.

## Habit tracker behavior and data

The tracker supports daily completion toggles, showing/hiding habit names, history, and adding, renaming, reordering, and archiving habits. Statistics currently displays “coming soon”; it has no implemented statistics interface.

Data stays on the visitor's current browser and origin. There is no account or cloud synchronization. Preserve the IndexedDB database `daily-scorecard`, version `1`, store `app`, and key `state` when changing persistence. The localStorage fallback uses `daily-scorecard` as well.

The saved state contains `habits` (including archived entries) and a `days` map keyed by local `YYYY-MM-DD` dates. Each day stores a snapshot of habit IDs/names and completed IDs. Setup edits update today's snapshot; past records remain intact. Missed days are backfilled with the last recorded habit list. Refocusing the page prepares a new day after midnight. Do not replace this format without a migration.

## Deployment and contact configuration

`astro.config.mjs` uses server output and the Cloudflare adapter because `/api/contact` runs on the server. `wrangler.jsonc` defines the Worker entry point and static assets in `dist/`. Retain the existing Cloudflare deployment and domain configuration; deploy the generated Worker and assets together, rather than treating this as a static-only site.

Configure these Cloudflare runtime values:

- `RESEND-API-KEY`: secret for email delivery.
- `TURNSTILE-SECRET-KEY`: secret matching the public widget site key in `src/pages/contact.astro`.
- `CONTACT-FROM-EMAIL`: verified sender address (configured in `wrangler.jsonc`).
- `CONTACT-TO-EMAIL`: inquiry recipient (configured in `wrangler.jsonc`).

For local Worker development, put secrets in an ignored `.dev.vars` file. Never commit credentials. The theme animation and tracker icons are used assets; keep their files and existing attribution.
