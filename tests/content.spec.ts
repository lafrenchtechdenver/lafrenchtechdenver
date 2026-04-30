import { expect, test } from '@playwright/test';

/**
 * content.spec.ts — Content-collection-driven UI verification.
 *
 * Milestone 3 moved board members, partners, and KPIs out of inline HTML and
 * into Astro Content Collections. This spec is the safety net for that
 * migration: if a board `.md` is accidentally deleted, if `featuredOn` is
 * mis-set on a partner, or if a kpi entry's `value` drifts away from the
 * canonical "13 / 262 / 5 / 33%", these assertions catch it before deploy.
 *
 * Selectors use `data-testid` rather than CSS classes because the CSS classes
 * (`.partner`, `.kpi`, `.board .person`) are styling contracts, not test
 * contracts — a future restyle could legitimately replace them while leaving
 * the structural assertion intact.
 */

const EXPECTED_HOME_PARTNERS = [
  'Superteam',
  'Modelcode.ai',
  'Mad Science of Colorado',
  'Ridiculous Engineering',
  'Einride',
  'Extern',
];

const EXPECTED_BOARD_MEMBERS = [
  'Ben Bouteille',
  'Baptiste Le Poittevin',
  'Patrizia Marzialli',
  'Sandrine Vohra',
  'Arthur Rio',
  'Clémence Viot',
  'Elina Hakobyan Roetynck',
];

const EXPECTED_KPI_VALUES = ['13', '262', '5', '33%'];

const EXPECTED_SPONSOR_PARTNERS = ['Techstars', 'Finmark'];

test.describe('Content collections render correctly', () => {
  test('home page shows the four KPI cards', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('[data-testid="kpi-card"]');
    await expect(cards).toHaveCount(EXPECTED_KPI_VALUES.length);

    for (const value of EXPECTED_KPI_VALUES) {
      await expect(
        page.locator('[data-testid="kpi-card"]', { hasText: value }),
      ).toHaveCount(1);
    }
  });

  test('home page shows the six home-featured partners', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('[data-testid="partner-card"]');
    await expect(cards).toHaveCount(EXPECTED_HOME_PARTNERS.length);

    for (const name of EXPECTED_HOME_PARTNERS) {
      await expect(
        page.locator('[data-testid="partner-card"]', { hasText: name }),
      ).toHaveCount(1);
    }
  });

  test('home page does NOT include sponsor-only partners', async ({ page }) => {
    // Sanity-check the `featuredOn` filter: Techstars and Finmark are tagged
    // `['sponsors']` only — they must not bleed onto the home page.
    await page.goto('/');
    for (const name of EXPECTED_SPONSOR_PARTNERS) {
      await expect(
        page.locator('[data-testid="partner-card"]', { hasText: name }),
      ).toHaveCount(0);
    }
  });

  test('about page shows all seven board members in defined order', async ({
    page,
  }) => {
    await page.goto('/about.html');
    const cards = page.locator('[data-testid="board-card"]');
    await expect(cards).toHaveCount(EXPECTED_BOARD_MEMBERS.length);

    for (let i = 0; i < EXPECTED_BOARD_MEMBERS.length; i += 1) {
      await expect(cards.nth(i)).toContainText(EXPECTED_BOARD_MEMBERS[i]);
    }
  });

  test('about page board photos render with alt text', async ({ page }) => {
    await page.goto('/about.html');
    const images = page.locator('[data-testid="board-card"] img');
    await expect(images).toHaveCount(EXPECTED_BOARD_MEMBERS.length);

    for (let i = 0; i < EXPECTED_BOARD_MEMBERS.length; i += 1) {
      await expect(images.nth(i)).toHaveAttribute(
        'alt',
        EXPECTED_BOARD_MEMBERS[i],
      );
    }
  });

  // Sponsor partners (Techstars, Finmark) move from a placeholder page to a
  // real page in Milestone 4 (`/companies-sponsors.html`). Skip-with-TODO so
  // the assertion lives next to its siblings and is easy to flip on.
  test.skip('companies-sponsors page shows the two sponsor partners (Milestone 4)', async ({
    page,
  }) => {
    await page.goto('/companies-sponsors.html');
    const cards = page.locator('[data-testid="partner-card"]');
    await expect(cards).toHaveCount(EXPECTED_SPONSOR_PARTNERS.length);

    for (const name of EXPECTED_SPONSOR_PARTNERS) {
      await expect(
        page.locator('[data-testid="partner-card"]', { hasText: name }),
      ).toHaveCount(1);
    }
  });
});
