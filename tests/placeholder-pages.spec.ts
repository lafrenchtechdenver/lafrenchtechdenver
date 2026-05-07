import { expect, test } from '@playwright/test';

/**
 * placeholder-pages.spec.ts — Page-shell smoke tests for the secondary pages.
 *
 * Originally Milestone 1 shipped placeholder pages for the four secondary
 * URLs while their real content was deferred. Milestone 4 promotes all of
 * them to fully content-driven pages — the "Coming soon" assertion that
 * lived here is no longer applicable, and richer assertions about each
 * page's content live in the content-specific specs:
 *
 *   - /events.html             → tests/external-content.spec.ts (Luma iframe)
 *   - /members-benefits.html   → tests/external-content.spec.ts (Google Form CTA)
 *   - /companies-sponsors.html → tests/content.spec.ts (sponsor PartnerCards)
 *   - /resources.html          → covered by tests/nav.spec.ts (smoke + nav)
 *
 * What stays here is the structural smoke test that survives every milestone:
 * each secondary URL must return 200, render its expected `<h1>`, and ship
 * its nav + footer chrome via BaseLayout. If any of those break we want a
 * fast, page-by-page failure rather than diagnosing it from a deeper spec.
 */

const SECONDARY_PAGES: Array<{ url: string; h1: string }> = [
  { url: '/companies-sponsors.html', h1: 'Companies & Sponsors' },
  { url: '/events.html', h1: 'Events' },
  { url: '/members-benefits.html', h1: 'Members Benefits' },
  { url: '/resources.html', h1: 'Resources' },
];

test.describe('Secondary page shells', () => {
  for (const { url, h1 } of SECONDARY_PAGES) {
    test(`${url} returns 200`, async ({ page }) => {
      // /events.html keeps the `load` event open ~30 s due to the Luma iframe;
      // domcontentloaded is sufficient for HTTP status and structural assertions.
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `GET ${url} should return 200`).toBeLessThan(400);
    });

    test(`${url} renders <h1>${h1}</h1>`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const heading = page.getByRole('heading', { name: h1, level: 1 });
      await expect(heading, `<h1>${h1}</h1> should be visible on ${url}`).toBeVisible();
    });

    test(`${url} renders via BaseLayout (has nav + footer)`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // Nav is always present — check for the menu element rendered by Nav.astro.
      await expect(page.locator('#menu')).toBeVisible();

      // Footer is always present.
      await expect(page.locator('footer')).toBeVisible();
    });
  }
});
