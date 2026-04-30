# Deploy

Operational notes for shipping La French Tech Denver to production.

## Hosting

- **Host:** GitHub Pages
- **Custom domain:** `lafrenchtechdenver.com` (driven by `public/CNAME` → `dist/CNAME` after build)
- **Source:** GitHub Actions (workflow `.github/workflows/deploy.yml`, action `actions/deploy-pages@v4`)
- **Trigger:** push to `main` (PRs run lint/test/build but do not deploy)

## One-time switch from "Deploy from a branch" to "GitHub Actions"

Prior to Milestone 4 the repo used GitHub Pages' default "Deploy from a branch" mode — flat `.html` files at the repo root were served directly. Milestone 4 introduces an `actions/deploy-pages@v4` workflow that serves the Astro-built `dist/`. To cut over with **zero downtime**, follow this order (Design Decision 3 in `MILESTONE.md`):

1. Merge the workflow to `main`. The first run produces an artifact but cannot publish — the repo setting still points at the legacy branch source. The site stays up.
2. Verify the build job succeeded and the `dist/` artifact was uploaded (Actions tab → latest workflow run → "Build & Lighthouse" job → "Upload Pages artifact" step).
3. Confirm the artifact contains a top-level `CNAME` file with the custom domain. The build job already runs `if [ ! -f dist/CNAME ]` and fails loudly if it's missing — this is a defense-in-depth check.
4. In **Repository Settings → Pages**, change "Build and deployment → Source" from `Deploy from a branch` to `GitHub Actions`. Save.
5. Re-run the latest `Deploy` workflow on `main` (Actions → Deploy → Run workflow). The `deploy` job now publishes the artifact to the `github-pages` environment.
6. Smoke test:
   ```
   curl -I https://lafrenchtechdenver.com/
   curl -I https://lafrenchtechdenver.com/index.html
   curl -I https://lafrenchtechdenver.com/about.html
   ```
   Each must return `HTTP/2 200`. Open the site and verify the modernized hero renders.

If anything looks wrong, you can revert to "Deploy from a branch" in Settings while you debug — that restores the legacy flat HTML serve from the previous branch tip.

## Required repository permissions for `deploy-pages@v4`

The workflow declares per-job permissions:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
environment:
  name: github-pages
```

These permissions must **also** be enabled at the repository level under **Settings → Actions → General → Workflow permissions**. The default for new repositories is "Read repository contents permission" only — that is not enough. Switch to "Read and write permissions" or grant `pages: write` and `id-token: write` explicitly.

## Lighthouse CI

The `build` job runs `@lhci/cli autorun` against `dist/` with the budget in `.lighthouserc.json`:

- `categories:performance` — error if < 0.95
- `categories:accessibility` — warn if < 0.90
- `total-byte-weight` — warn if a single page > 1.5 MB

Pages scanned:

- `/index.html`
- `/about.html`
- `/companies-sponsors.html`
- `/members-benefits.html`
- `/resources.html`

`/events.html` is **deliberately excluded.** The page is dominated by the third-party Luma calendar iframe — its React bundle, fonts, analytics, and image weight all count against Lighthouse's perf score even though we have no way to influence them. Including it would tank the budget on every PR and produce no actionable signal. If a future redesign replaces the iframe with a self-hosted calendar component, add `/events.html` back to the URL list.

If a real PR fails the budget, the failure is loud (the run fails) but the upload step still publishes the report to `temporary-public-storage` so the URL is in the run logs.

## Image-size budget

The original site shipped a 2.4 MB hero JPEG and a 3.9 MB board photo on every page load. Milestone 4 routes both through Astro's `<Image>` / Sharp pipeline:

- `src/assets/hero.jpg` — single-page hero, emits responsive AVIF/WebP at 640/960/1280/1600/1920 px. Largest desktop variant ≈ 220 KB.
- `src/assets/board/*` — 120 × 120 portraits, 1× and 2× variants, ~3-8 KB each in WebP.
- `src/assets/logos/*` — 120 × 120 logos, 1× and 2× variants, ~1-7 KB each.

Budget effectively enforced by the Sharp pipeline: every emitted variant is well under 300 KB. Lighthouse's `total-byte-weight` warns if anything regresses above 1.5 MB per page.

## Accessibility automation — `@axe-core/playwright` license note

`@axe-core/playwright` is **MPL 2.0** (Mozilla Public License) — the only non-permissive license in the dependency graph. MPL 2.0 is a weak, file-level copyleft: it applies only to modifications of axe-core's own source files. Using axe as a dev-only Playwright dependency to assert WCAG conformance in CI imposes **no obligations on the French Tech Denver site code itself**.

If a downstream policy tightens to "permissive licenses only," swap to one of:

- **`pa11y-ci`** (LGPL-3.0, also dev-only) — pre-qualified fallback, the swap is a ~30-line change in `tests/a11y.spec.ts` plus one job-definition tweak in `deploy.yml`.
- **Lighthouse a11y category alone** — already running in the `build` job. Drop `tests/a11y.spec.ts` and rely on Lighthouse's `accessibility` budget.

The keyboard-baseline spec (`tests/a11y-basic.spec.ts`) does not depend on axe and continues to run regardless of which license path is taken.

## CNAME

`public/CNAME` contains the literal string `lafrenchtechdenver.com`. Astro copies the file verbatim from `public/` into `dist/`. GitHub Pages reads it and continues to serve the custom domain. Do **not** edit the value unless the production domain changes — DNS A/AAAA records also need updating in that case (see GitHub's "Managing a custom domain for your GitHub Pages site" documentation).

## Local development

```
nvm use            # uses Node 22 from .nvmrc
corepack enable    # enables pnpm 9 from package.json packageManager field
pnpm install --frozen-lockfile
pnpm dev           # http://localhost:4321
```

Other useful scripts:

```
pnpm build          # static build to dist/
pnpm preview        # serve dist/ at http://127.0.0.1:4321
pnpm check          # astro check (typecheck .astro templates)
pnpm lint           # ESLint
pnpm format:check   # Prettier dry-run
pnpm format         # Prettier write
pnpm test:e2e       # Playwright suite
pnpm test:a11y      # axe + keyboard a11y baseline only
```

## Rollback

If a deploy ships a regression:

1. Open the failed PR or the merged commit on `main`.
2. Click **Revert** in GitHub or run `git revert <sha>` locally and push.
3. The next `main` push triggers a fresh deploy with the reverted state, ~3 minutes from push to live.

If GitHub Pages itself is degraded, the workflow's `deploy` job will fail loudly. The site stays on the previous successful deploy until the next green run.
