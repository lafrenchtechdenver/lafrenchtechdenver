/** @type {import('tailwindcss').Config} */
/**
 * Tailwind 4 design-token configuration for La French Tech Denver.
 *
 * Tokens live as space-separated R G B triplets on CSS custom properties in
 * `src/styles/global.css` (see `:root` and `[data-theme="dark"]`). The bindings
 * below re-export them as Tailwind colors via the `<alpha-value>` placeholder so
 * opacity utilities (`bg-primary/80`, `ring-primary/20`) work without a
 * duplicate palette per theme.
 *
 * `darkMode: ['selector', '[data-theme="dark"]']` keeps Tailwind's `dark:`
 * variant aligned with the existing `localStorage.theme` attribute switch — no
 * drift between hand-written CSS that targets `[data-theme="dark"]` and
 * Tailwind utilities that target `dark:`.
 */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-contrast': 'rgb(var(--primary-contrast) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'badge-bg': 'rgb(var(--badge-bg) / <alpha-value>)',
      },
      fontFamily: {
        // Body font — Inter Variable, falling back to the legacy `system-ui` chain
        // so the page stays readable while the variable woff2 loads (and degrades
        // gracefully if a network policy blocks the font).
        sans: [
          '"Inter Variable"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Inter',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          '"Liberation Sans"',
          'sans-serif',
        ],
        // Display font — Bricolage Grotesque Variable for headings, with
        // Inter Variable + the system-ui chain as fallback.
        display: [
          '"Bricolage Grotesque Variable"',
          '"Inter Variable"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
