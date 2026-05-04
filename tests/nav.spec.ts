import { expect, test } from '@playwright/test';

/**
 * nav.spec.ts — Navigation and social links on every page.
 *
 * Verifies:
 * 1. All six nav links are present on every page.
 * 2. Each nav link is reachable (200 response).
 * 3. Social links (LinkedIn, Facebook, mailto) are correct on every page.
 * 4. Footer copyright line is present on every page.
 */

const ALL_PAGES = [
  '/',
  '/index.html',
  '/about.html',
  '/companies-sponsors.html',
  '/members-benefits.html',
  '/events.html',
  '/resources.html',
];

const NAV_LINKS: Array<{ label: string; href: string }> = [
  { label: 'Home', href: '/index.html' },
  { label: 'About us', href: '/about.html' },
  { label: 'Companies & Sponsors', href: '/companies-sponsors.html' },
  { label: 'Members Benefits', href: '/members-benefits.html' },
  { label: 'Events', href: '/events.html' },
  { label: 'Resources', href: '/resources.html' },
];

const SOCIAL_LINKS = {
  linkedin: 'https://www.linkedin.com/company/denver-french-tech',
  facebook: 'https://www.facebook.com/groups/lafrenchtechdenver/',
  email: 'mailto:contact@lafrenchtechdenver.com',
};

test.describe('Navigation', () => {
  for (const url of ALL_PAGES) {
    test(`all six nav links present on ${url}`, async ({ page }) => {
      const resp = await page.goto(url);
      expect(resp?.status(), `GET ${url} should return 200`).toBeLessThan(400);

      for (const link of NAV_LINKS) {
        const locator = page.locator(`#menu a[href="${link.href}"]`);
        await expect(locator, `nav should contain "${link.label}" link`).toBeVisible();
      }
    });
  }

  test('nav links navigate to valid pages', async ({ page }) => {
    await page.goto('/');

    for (const link of NAV_LINKS) {
      const response = await page.goto(link.href);
      expect(response?.status(), `GET ${link.href} should return 200`).toBeLessThan(400);
    }
  });

  test('active link is highlighted on home page', async ({ page }) => {
    await page.goto('/index.html');
    const homeLink = page.locator('#menu a[href="/index.html"]');
    await expect(homeLink).toHaveClass(/active/);
  });

  test('active link is highlighted on about page', async ({ page }) => {
    await page.goto('/about.html');
    const aboutLink = page.locator('#menu a[href="/about.html"]');
    await expect(aboutLink).toHaveClass(/active/);
  });

  for (const url of ALL_PAGES) {
    test(`social links correct on ${url}`, async ({ page }) => {
      await page.goto(url);

      const linkedin = page.locator(`a[href="${SOCIAL_LINKS.linkedin}"]`);
      await expect(linkedin, 'LinkedIn link should be present').toBeVisible();

      const facebook = page.locator(`a[href="${SOCIAL_LINKS.facebook}"]`);
      await expect(facebook, 'Facebook link should be present').toBeVisible();

      const email = page.locator(`a[href="${SOCIAL_LINKS.email}"]`);
      await expect(email, 'Mailto link should be present').toBeVisible();
    });
  }

  for (const url of ALL_PAGES) {
    test(`footer copyright present on ${url}`, async ({ page }) => {
      await page.goto(url);
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      // Year is dynamic — match the pattern rather than a hard-coded year.
      await expect(footer).toContainText('La French Tech Denver');
      await expect(footer).toContainText('Community-run in Denver, CO');
    });
  }
});
