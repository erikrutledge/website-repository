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

The tracker supports daily completion toggles, showing/hiding habit names, history, and adding, renaming, reordering, and archiving habits. A first-visit tutorial walks through Settings, Today, Past at a Glance, and Insights; the header Help button reopens it anytime. The tutorial is remembered on this browser, and instructional copy lives there to keep screens concise. Icon credits appear only at the bottom of Settings. The add-habit form is hidden once eight active habits are present. The phone-width interface includes a horizontal daily scorecard, optional habit-name subtext, animated tab navigation and reordering, and all-time statistics (completion rate, perfect days, longest per-habit streak, most forgotten habit, and per-habit progress). New habits are limited to eight active entries; existing lists over eight remain intact until the visitor archives extras. Missed-day statistics exclude the current day. Motion respects the visitor's reduced-motion preference.

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

## Screenshot examples

Open `/habits?demo=1` to preview 56 days of example history using your current active habits (or sample habits on a fresh browser). Completion rates vary per habit and repeat consistently between reloads. Demo edits stay in memory and never replace your saved history. The tutorial does not open automatically in this mode; Help still works. Remove `?demo=1` to return to your real data.

## Brand assets

`src/components/Logo.astro` renders the shared header/footer lockup and hero symbol using `vector-logo-black.svg` and `vector-logo-white.svg`. Theme changes crossfade the SVG variants and update the favicon. Only the homepage header loads `rutledge-digital-elastic.webp`; it plays once, then settles into the matching static lockup. `src/scripts/logo.js` uses the source animation duration (8,099 ms). Update that duration and the `.logo-intro` alignment if replacing the animation. Reduced-motion visitors and browsers without JavaScript receive the static logo.

## iPhone Home Screen

After deployment, visit `https://erikrutledge.com/habits` in Safari, tap Share, then Add to Home Screen (enable Open as Web App if offered). The tracker uses the vector brand mark rendered into padded PNG icons for iOS and a manifest scoped to `/habits`. Its start URL excludes screenshot demo parameters. If an existing shortcut keeps an old icon, remove that shortcut and add it again.

Swipe left/right across noninteractive screen content to move between Today, Past at a Glance, Insights, and Settings. Vertical scrolling, form controls, browser edge gestures, and overflowing horizontal history grids keep their normal behavior. Tab buttons remain available. Home Screen installation does not add offline loading; no service worker is registered.
