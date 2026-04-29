// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// The canonical production URL. Used by Astro for absolute-URL generation
// (OpenGraph, sitemap, canonical links). Must match the value in `public/CNAME`.
const SITE_URL = 'https://lafrenchtechdenver.com';

export default defineConfig({
  site: SITE_URL,
  // `build.format: 'file'` emits `dist/about.html` instead of `dist/about/index.html`,
  // preserving the legacy .html URLs that inbound links and search engines already know.
  build: {
    format: 'file',
  },
  integrations: [
    tailwind({
      // We import our own base stylesheet (`src/styles/global.css`) from BaseLayout
      // so it also carries the French Tech design tokens + @layer base port of the
      // legacy inline CSS. Disabling the integration's automatic base injection keeps
      // a single entry point for all global styles.
      applyBaseStyles: false,
    }),
  ],
});
