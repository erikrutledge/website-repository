import { defineConfig } from 'astro/config';

// A static Astro site is a great fit for Cloudflare Pages.
// No server adapter is needed unless you later add server-rendered routes.
export default defineConfig({
  output: 'static',
});
