import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

const tsconfig = fileURLToPath(new URL("./tsconfig.json", import.meta.url));

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  vite: {
    tsconfig,
    environments: {
      client: {
        optimizeDeps: { rolldownOptions: { tsconfig } },
      },
      ssr: {
        optimizeDeps: { rolldownOptions: { tsconfig } },
      },
    },
  },
});
