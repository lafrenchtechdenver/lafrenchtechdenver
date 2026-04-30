import { expect, test } from '@playwright/test';

/**
 * placeholder-pages.spec.ts — Placeholder page verification.
 *
 * Originally Milestone 1 shipped six placeholder pages. Milestone 3 promotes
 * `/about.html` from placeholder to a real, content-driven page (mission,
 * values, and the full board grid sourced from the `board` content
 * collection); its assertions live in `tests/content.spec.ts` now.
 *
 * The pages still in this list remain placeholders until later milestones
 * bring them online. Each one must render via BaseLayout, expose its own
 * <h1>, and carry a "Coming soon" note so the nav link does not 404.
 */

const PLACEHOLDER_PAGES: Array<{ url: string; h1: string }> = [
  { url: '/companies-sponsors.html', h1: 'Companies & Sponsors' },
  { url: '/events.html', h1: 'Events' },
  { url: '/members-benefits.html', h1: 'Members Benefits' },
  { url: '/resources.html', h1: 'Resources' },
];

test.describe('Placeholder Pages', () => {
  for (const { url, h1 } of PLACEHOLDER_PAGES) {
    test(`${url} returns 200`, async ({ page }) => {
      const response = await page.goto(url);
      expect(response?.status(), `GET ${url} should return 200`).toBeLessThan(400);
    });

    test(`${url} renders <h1>${h1}</h1>`, async ({ page }) => {
      await page.goto(url);
      const heading = page.getByRole('heading', { name: h1, level: 1 });
      await expect(heading, `<h1>${h1}</h1> should be visible on ${url}`).toBeVisible();
    });

    test(`${url} renders via BaseLayout (has nav + footer)`, async ({ page }) => {
      await page.goto(url);

      // Nav is always present — check for at least one nav link.
      await expect(page.locator('#menu')).toBeVisible();

      // Footer is always present.
      await expect(page.locator('footer')).toBeVisible();
    });

    test(`${url} has a "Coming soon" note`, async ({ page }) => {
      await page.goto(url);
      // All placeholder pages include some variant of "Coming soon".
      await expect(page.locator('body')).toContainText('Coming soon');
    });
  }
});
