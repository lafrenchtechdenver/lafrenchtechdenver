/** @type {import('tailwindcss').Config} */
// Milestone 1 keeps Tailwind wired up but minimally used — only utility touch-ups.
// Milestone 2 will replace this stub with full design-token mapping against the
// French Tech palette (`--primary`, `--accent`, etc.), enable
// `darkMode: ['selector', '[data-theme="dark"]']`, and compose component patterns
// (`.card`, `.cta`, `.hero`, `.kpi`, `.partner`) via `@apply` inside global.css.
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {},
  },
  plugins: [],
};
