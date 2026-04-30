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
    sitemap({
      // The default @astrojs/sitemap behavior strips the `.html` suffix produced by
      // `build.format: 'file'` (a known upstream bug). The contract for this site is
      // that *every* URL ends in `.html` (see `project_wiki/architecture/url-preservation.md`).
      // The serialize() override re-appends `.html` so the sitemap stays in sync with the
      // canonical URLs. Treat this as load-bearing alongside `build.format: 'file'`.
      serialize(item) {
        try {
          const url = new URL(item.url);
          // Bare-domain root → /index.html
          if (url.pathname === '' || url.pathname === '/') {
            url.pathname = '/index.html';
          } else if (!url.pathname.endsWith('.html')) {
            url.pathname = `${url.pathname.replace(/\/$/, '')}.html`;
          }
          item.url = url.toString();
        } catch {
          // If URL parsing fails for any reason, fall back to the raw item — but
          // the contract is still: the entry must end in `.html`.
          if (typeof item.url === 'string' && !item.url.endsWith('.html')) {
            if (item.url.endsWith('/')) {
              item.url = `${item.url}index.html`;
            } else {
              item.url = `${item.url}.html`;
            }
          }
        }
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
