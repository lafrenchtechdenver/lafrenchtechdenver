import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * external-content.spec.ts — Embedded third-party URLs and social links.
 *
 * Validates that the URLs the site routes to via the `site` data collection
 * (`src/content/site/social.json`) are wired up everywhere they should be:
 *
 *   - `/events.html`              — Luma calendar iframe `src` matches
 *                                   `lumaCalendarUrl`
 *   - `/`, `/members-benefits.html`
 *                                 — Google Form CTA `href` matches
 *                                   `membershipFormUrl`
 *   - every page                  — LinkedIn, Facebook, mailto links match
 *                                   `linkedinUrl`, `facebookUrl`,
 *                                   `mailto:contactEmail`
 *
 * The expected URL values are read at test-load time from the same JSON file
 * the production code reads, so an edit to `social.json` propagates without a
 * test refactor — see the
 * `route_global_constants_through_site_collection.md` instruction.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOCIAL_JSON = resolve(__dirname, '..', 'src', 'content', 'site', 'social.json');

interface SocialJson {
  linkedinUrl: string;
  facebookUrl: string;
  contactEmail: string;
  membershipFormUrl: string;
  lumaCalendarUrl: string;
}

const site: SocialJson = JSON.parse(readFileSync(SOCIAL_JSON, 'utf-8'));

const ALL_PAGES = [
  '/',
  '/about.html',
  '/companies-sponsors.html',
  '/members-benefits.html',
  '/events.html',
  '/resources.html',
];

test.describe('External content — site collection wiring', () => {
  test('events page iframe src matches site.json lumaCalendarUrl', async ({ page }) => {
    await page.goto('/events.html');

    const iframe = page.locator('.events-frame iframe');
    await expect(iframe).toHaveAttribute('src', site.lumaCalendarUrl);
  });

  test('home page Become-a-Member CTA href matches site.json membershipFormUrl', async ({
    page,
  }) => {
    await page.goto('/');

    const cta = page.locator(`a.cta[href="${site.membershipFormUrl}"]`);
    await expect(cta).toBeVisible();
    await expect(cta).toContainText('Become a Member');
  });

  test('members-benefits page CTA href matches site.json membershipFormUrl', async ({ page }) => {
    await page.goto('/members-benefits.html');

    const cta = page.locator(`a.cta[href="${site.membershipFormUrl}"]`);
    await expect(cta).toBeVisible();
    await expect(cta).toContainText('Become a Member');
  });

  for (const url of ALL_PAGES) {
    test(`social links on ${url} match site.json`, async ({ page }) => {
      await page.goto(url);

      const linkedin = page.locator(`a[href="${site.linkedinUrl}"]`);
      await expect(linkedin, `LinkedIn link on ${url}`).toBeVisible();

      const facebook = page.locator(`a[href="${site.facebookUrl}"]`);
      await expect(facebook, `Facebook link on ${url}`).toBeVisible();

      const mailto = page.locator(`a[href="mailto:${site.contactEmail}"]`);
      await expect(mailto, `Mailto link on ${url}`).toBeVisible();
    });
  }
});
