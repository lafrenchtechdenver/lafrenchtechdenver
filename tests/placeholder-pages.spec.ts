import { expect, test } from '@playwright/test';

/**
 * placeholder-pages.spec.ts — Placeholder page verification.
 *
 * For Milestone 1, five pages are placeholders with:
 * - A BaseLayout (shared header and footer).
 * - An <h1> with the page name.
 * - A "Coming soon" note.
 *
 * These tests confirm nav links don't 404 and the pages are minimally correct.
 * They will be updated in later milestones when real content arrives.
 */

const PLACEHOLDER_PAGES: Array<{ url: string; h1: string }> = [
  { url: '/about.html', h1: 'About us' },
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
