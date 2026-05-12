/** @type {import('tailwindcss').Config} */
/**
 * Tailwind 4 design-token configuration for La French Tech Denver.
 *
 * Approach (per Milestone 2, Design Decision 1, approach 1):
 *   - The full token surface lives as CSS custom properties in `src/styles/global.css`
 *     (one set under `:root` for light, one under `[data-theme="dark"]` for dark).
 *   - This file references those variables from `theme.extend.colors`, so utilities
 *     like `bg-primary` / `text-accent` automatically pick the right value for the
 *     active theme without touching Tailwind's `dark:` variant on every utility.
 *   - Variables are stored as space-separated R G B triplets so `<alpha-value>` can
 *     be substituted in for opacity utilities (`bg-primary/80`, `ring-primary/20`).
 *
 * `darkMode: ['selector', '[data-theme="dark"]']` keeps the existing
 * `localStorage.theme` → `<html data-theme="...">` mechanism driving Tailwind's
 * `dark:` variants too — no drift between hand-written CSS selectors and Tailwind.
 */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
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
        // Body uses Inter Variable; headings use Bricolage Grotesque Variable.
        // Both are self-hosted via the `@fontsource-variable/*` packages; the
        // system-ui chain is the fallback while fonts load (and a graceful
        // degradation if the font file is blocked).
        sans: [
          '"Inter Variable"',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          'Inter',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          '"Liberation Sans"',
          'sans-serif',
        ],
        display: [
          '"Bricolage Grotesque Variable"',
          '"Inter Variable"',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          'Inter',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: 'var(--shadow)',
      },
      borderRadius: {
        card: '22px',
      },
    },
  },
  plugins: [],
};
