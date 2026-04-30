import { expect, test } from '@playwright/test';

/**
 * mobile-menu.spec.ts — Burger menu at mobile viewport (<=900px).
 *
 * Verifies:
 * 1. At 375px width the .burger button is visible (CSS shows it via @media max-width 900px).
 * 2. Clicking .burger toggles `.active` on #menu.
 * 3. Clicking outside the .nav element closes the menu.
 */

// Narrow viewport that triggers the mobile nav breakpoint (site uses 900px).
const MOBILE_VIEWPORT = { width: 375, height: 812 };

test.describe('Mobile Menu', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test('burger button is visible at mobile width', async ({ page }) => {
    await page.goto('/');

    const burger = page.locator('.burger');
    await expect(burger, 'burger button should be visible at 375px').toBeVisible();
  });

  test('menu is initially hidden at mobile width', async ({ page }) => {
    await page.goto('/');

    const menu = page.locator('#menu');
    // At mobile, #menu has display:none unless .active is present.
    await expect(menu).not.toHaveClass(/active/);
    // Verify via CSS computed style — the menu should not be visible without active.
    const isHidden = await page.evaluate(() => {
      const el = document.getElementById('menu');
      return el ? getComputedStyle(el).display === 'none' : true;
    });
    expect(isHidden, 'menu should be hidden before burger click').toBe(true);
  });

  test('clicking burger opens the menu', async ({ page }) => {
    await page.goto('/');

    await page.click('.burger');

    const menu = page.locator('#menu');
    await expect(menu).toHaveClass(/active/);

    // Also assert it's now display:flex (visible).
    const isVisible = await page.evaluate(() => {
      const el = document.getElementById('menu');
      return el ? getComputedStyle(el).display !== 'none' : false;
    });
    expect(isVisible, 'menu should be visible after burger click').toBe(true);
  });

  test('clicking burger again closes the menu', async ({ page }) => {
    await page.goto('/');

    await page.click('.burger');
    await expect(page.locator('#menu')).toHaveClass(/active/);

    await page.click('.burger');
    await expect(page.locator('#menu')).not.toHaveClass(/active/);
  });

  test('clicking outside nav closes the open menu', async ({ page }) => {
    await page.goto('/');

    // Open the menu.
    await page.click('.burger');
    await expect(page.locator('#menu')).toHaveClass(/active/);

    // Find a coordinate that is provably outside .nav at this viewport. The
    // mobile menu drops down absolutely positioned under the sticky nav, so we
    // pick a point below the menu (and below the hero heading) that no part
    // of .nav covers, and click there with the real Playwright mouse so the
    // hit-testing, listener-capture, and default-action chain matches a real
    // user click.
    const target = await page.evaluate(() => {
      // Compute the bottom edge of the open .nav (header + dropdown menu).
      const nav = document.querySelector('.nav') as HTMLElement | null;
      const menu = document.getElementById('menu') as HTMLElement | null;
      const header = nav?.getBoundingClientRect();
      const menuRect = menu?.getBoundingClientRect();
      const navBottom = Math.max(header?.bottom ?? 0, menuRect?.bottom ?? 0);
      // Pick a point well below .nav's bottom and inside the viewport.
      const x = Math.max(10, Math.floor(window.innerWidth / 2));
      const y = Math.min(window.innerHeight - 10, Math.floor(navBottom) + 40);
      return { x, y };
    });
    await page.mouse.click(target.x, target.y);

    await expect(page.locator('#menu')).not.toHaveClass(/active/);
  });

  test('all six nav links are accessible in the open mobile menu', async ({ page }) => {
    await page.goto('/');

    await page.click('.burger');
    await expect(page.locator('#menu')).toHaveClass(/active/);

    const navLinks = [
      '/index.html',
      '/about.html',
      '/companies-sponsors.html',
      '/members-benefits.html',
      '/events.html',
      '/resources.html',
    ];

    for (const href of navLinks) {
      const link = page.locator(`#menu a[href="${href}"]`);
      await expect(link, `${href} link should be visible in open mobile menu`).toBeVisible();
    }
  });
});
