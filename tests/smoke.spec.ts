import { expect, test } from '@playwright/test';

/**
 * Foundation-milestone smoke test.
 *
 * Asserts the lifecycle is wired up end-to-end: `pnpm build && pnpm preview`
 * serves a home page with the expected hero and the full six-link nav.
 * Later milestones will drop their own specs alongside this one.
 */

const EXPECTED_NAV_LINKS: Array<{ label: string; href: string }> = [
  { label: 'Home', href: '/index.html' },
  { label: 'About us', href: '/about.html' },
  { label: 'Companies & Sponsors', href: '/companies-sponsors.html' },
  { label: 'Members Benefits', href: '/members-benefits.html' },
  { label: 'Events', href: '/events.html' },
  { label: 'Resources', href: '/resources.html' },
];

test('home page renders hero + full nav', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status(), 'GET / should 200').toBeLessThan(400);

  // Hero heading is the single most important element.
  await expect(page.locator('.hero h1')).toHaveText('La French Tech Denver');

  // All six nav links are present and point at legacy .html URLs.
  for (const link of EXPECTED_NAV_LINKS) {
    const locator = page.locator(`#menu a[href="${link.href}"]`);
    await expect(locator, `nav should contain ${link.label}`).toBeVisible();
  }
});

test('every legacy URL resolves 200', async ({ page }) => {
  for (const link of EXPECTED_NAV_LINKS) {
    // Use domcontentloaded to avoid waiting for the Luma iframe's React app on
    // /events.html, which holds the page's load event open for ~30 s.
    const response = await page.goto(link.href, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `GET ${link.href} should 200`).toBeLessThan(400);
  }
});
