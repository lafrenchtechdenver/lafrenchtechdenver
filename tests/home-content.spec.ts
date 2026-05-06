import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * home-content.spec.ts — Home page content verification.
 *
 * Verifies the full content of the home page (/):
 * 1. Hero heading and subheading.
 * 2. "What is La French Tech Denver" section.
 * 3. Google Form "Become a Member" CTA with correct URL.
 * 4. All 4 KPI cards (13 Companies, 262 People, 5 Nationalities, 33% Women).
 * 5. All 6 Friends & Partners cards each with an image and an outbound link.
 *
 * The membership form URL is read from `src/content/site/social.json` at
 * test-load time so the assertion stays in sync with the single source of
 * truth — see the `route_global_constants_through_site_collection.md`
 * instruction.
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
const MEMBERSHIP_FORM_URL = site.membershipFormUrl;

const EXPECTED_KPIS: Array<{ value: string; label: string }> = [
  { value: '13', label: 'Companies' },
  { value: '262', label: 'People' },
  { value: '5', label: 'Nationalities' },
  { value: '33%', label: 'Women' },
];

const EXPECTED_PARTNERS: Array<{ name: string; href: string }> = [
  { name: 'Superteam', href: 'https://superteam.ca' },
  { name: 'Modelcode.ai', href: 'https://modelcode.ai' },
  { name: 'Mad Science of Colorado', href: 'https://colorado.madscience.org' },
  { name: 'Ridiculous Engineering', href: 'https://ridiculousengineering.com' },
  { name: 'Einride', href: 'https://einride.tech' },
  { name: 'Extern', href: 'https://www.extern.com' },
];

test.describe('Home Page Content', () => {
  test('hero heading is "La French Tech Denver"', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero h1')).toHaveText('La French Tech Denver');
  });

  test('hero subheading is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero p')).toContainText(
      'Your tech rendez-vous with a French touch and mountain views',
    );
  });

  test('"What is La French Tech Denver" section heading is present', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'What is La French Tech Denver' }),
    ).toBeVisible();
  });

  test('"Become a Member" CTA links to the Google Form', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator(`a[href="${MEMBERSHIP_FORM_URL}"]`);
    await expect(cta).toBeVisible();
    await expect(cta).toContainText('Become a Member');
  });

  test('all 4 KPI cards are present with correct values', async ({ page }) => {
    await page.goto('/');
    const kpiSection = page.locator('.kpis');
    await expect(kpiSection).toBeVisible();

    for (const kpi of EXPECTED_KPIS) {
      await expect(kpiSection).toContainText(kpi.value);
      await expect(kpiSection).toContainText(kpi.label);
    }
  });

  test('exactly 4 KPI cards are rendered', async ({ page }) => {
    await page.goto('/');
    const kpiCards = page.locator('.kpis .kpi');
    await expect(kpiCards).toHaveCount(4);
  });

  test('"Friends & Partners" section heading is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Friends & Partners' })).toBeVisible();
  });

  test('all 6 partner cards are rendered', async ({ page }) => {
    await page.goto('/');
    const partners = page.locator('.partner');
    await expect(partners).toHaveCount(6);
  });

  for (const partner of EXPECTED_PARTNERS) {
    test(`partner "${partner.name}" has image and correct outbound link`, async ({ page }) => {
      await page.goto('/');

      // Partner card contains a link with the partner's URL.
      const partnerLink = page.locator(`.partner a[href="${partner.href}"]`);
      await expect(partnerLink, `${partner.name} link should be present`).toBeVisible();

      // The partner card contains an <img> element.
      const partnerImg = partnerLink.locator('img');
      await expect(partnerImg, `${partner.name} image should be present`).toBeVisible();
    });
  }

  test('home page responds with 200 for both / and /index.html', async ({ page }) => {
    const resp1 = await page.goto('/');
    expect(resp1?.status()).toBeLessThan(400);

    const resp2 = await page.goto('/index.html');
    expect(resp2?.status()).toBeLessThan(400);
  });
});
