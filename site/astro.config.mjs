import { defineConfig } from "astro/config";

// The site is published at https://dizzyyoce.github.io/787codex/
// SITE_BASE can override the base path for previews (e.g. SITE_BASE=/).
export default defineConfig({
  site: "https://dizzyyoce.github.io",
  base: process.env.SITE_BASE ?? "/787codex/",
  trailingSlash: "always",
  build: { format: "directory" },
});
