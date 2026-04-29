// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

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
    // `@astrojs/sitemap` writes `sitemap-index.xml` + `sitemap-0.xml` into `dist/`
    // for every `src/pages/*.astro` page, using `site` above as the absolute base.
    // `public/robots.txt` references the sitemap so search engines find it.
    //
    // `serialize` patches the per-page URL to keep the `.html` suffix that
    // `build.format: 'file'` emits — without it, the integration drops the
    // extension and produces `/about` URLs, breaking the URL-preservation
    // contract documented in the project wiki.
    sitemap({
      serialize(item) {
        const base = SITE_URL.replace(/\/$/, '');
        if (item.url === `${base}/` || item.url === base) {
          item.url = `${base}/index.html`;
          return item;
        }
        if (!/\.html$/.test(item.url)) {
          item.url = item.url.replace(/\/?$/, '.html');
        }
        return item;
      },
    }),
  ],
  vite: {
    // Tailwind 4 ships as a Vite plugin (no more `@astrojs/tailwind` v5 wrapper).
    // CSS-side configuration lives in `src/styles/global.css` (`@import "tailwindcss"` +
    // `@config "../../tailwind.config.mjs"` to pull design tokens from the JS config).
    plugins: [tailwindcss()],
  },
});
