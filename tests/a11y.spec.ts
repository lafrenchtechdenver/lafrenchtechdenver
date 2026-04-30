import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * a11y.spec.ts — Automated WCAG 2.x scans on every page.
 *
 * Milestone 4 adds `@axe-core/playwright` (MPL 2.0 — dev-only, file-level
 * copyleft, imposes no obligations on our static site code) and runs an
 * accessibility scan on each of the six public pages.
 *
 * Contract: zero violations of `critical` or `serious` severity in code we
 * own. The Luma calendar iframe on `/events.html` is third-party content
 * (`luma.com/embed/...`) and we cannot fix violations rendered by their
 * React app. We exclude iframe contents from the events scan only — the
 * surrounding page chrome (nav, footer, hero, iframe wrapper) is still
 * scanned.
 *
 * We deliberately do NOT fail on `moderate` or `minor` violations. Many of
 * those are stylistic warnings (color-contrast on hover states, target-size
 * for desktop-only affordances, etc.) and gating CI on every one of them
 * tends to encourage suppressions rather than fixes. The keyboard-baseline
 * spec in `a11y-basic.spec.ts` is the complement: structural a11y (skip
 * link, focus rings, landmarks) is covered there; this spec is the broad
 * automated sweep over rendered DOM.
 *
 * If a future violation is genuinely a false positive, prefer scoping it via
 * `.disableRules([...])` here over editing axe's own rules — that keeps the
 * suppression visible in code review.
 */

interface PageScan {
  url: string;
  /** When set, exclude these CSS selectors from the axe scan (e.g. third-party iframes). */
  exclude?: string[];
}

const ALL_PAGES: PageScan[] = [
  { url: '/' },
  { url: '/about.html' },
  { url: '/companies-sponsors.html' },
  { url: '/members-benefits.html' },
  // Luma's embedded calendar React app paints its own DOM inside the iframe;
  // axe surfaces color-contrast and link-name violations from their code that
  // we have no way to fix. Exclude the iframe contents from the scan — we
  // still validate the surrounding page chrome and the iframe element itself.
  { url: '/events.html', exclude: ['iframe'] },
  { url: '/resources.html' },
];

test.describe('Accessibility (axe-core)', () => {
  for (const scan of ALL_PAGES) {
    test(`no critical or serious axe violations on ${scan.url}`, async ({ page }) => {
      await page.goto(scan.url);

      let builder = new AxeBuilder({ page })
        // WCAG 2.0 A/AA + WCAG 2.1 A/AA + best-practices = the standard set.
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);

      if (scan.exclude) {
        for (const selector of scan.exclude) {
          builder = builder.exclude(selector);
        }
      }

      const accessibilityScanResults = await builder.analyze();

      const blocking = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );

      // Surface a readable diff if anything fails.
      expect.soft(blocking, `axe violations on ${scan.url}`).toEqual([]);
      expect(blocking).toEqual([]);
    });
  }
});
