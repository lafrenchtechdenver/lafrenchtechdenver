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

    // Use real input (page.mouse.click) to click outside the nav. Synthetic
    // dispatchEvent calls bypass hit-testing and listener capture, producing
    // false positives — see use_real_input_for_outside-click_tests.md.
    // Click at the bottom-center of the viewport, which is always outside the
    // sticky nav bar at a 375×812 mobile viewport.
    await page.mouse.click(187, 700);

    await expect(page.locator('#menu')).not.toHaveClass(/active/);
  });

  test('burger button has aria-controls="menu"', async ({ page }) => {
    await page.goto('/');

    const burger = page.locator('#burger-button');
    await expect(burger).toHaveAttribute('aria-controls', 'menu');
  });

  test('aria-expanded is false initially on burger button', async ({ page }) => {
    await page.goto('/');

    const burger = page.locator('#burger-button');
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
  });

  test('aria-expanded is true after burger click opens menu', async ({ page }) => {
    await page.goto('/');

    await page.click('#burger-button');

    const burger = page.locator('#burger-button');
    await expect(burger).toHaveAttribute('aria-expanded', 'true');
  });

  test('aria-expanded returns to false after second burger click', async ({ page }) => {
    await page.goto('/');

    await page.click('#burger-button');
    await expect(page.locator('#burger-button')).toHaveAttribute('aria-expanded', 'true');

    await page.click('#burger-button');
    await expect(page.locator('#burger-button')).toHaveAttribute('aria-expanded', 'false');
  });

  test('aria-expanded returns to false after outside click', async ({ page }) => {
    await page.goto('/');

    await page.click('#burger-button');
    await expect(page.locator('#burger-button')).toHaveAttribute('aria-expanded', 'true');

    // Real mouse click outside the nav (see use_real_input_for_outside-click_tests.md).
    await page.mouse.click(187, 700);

    await expect(page.locator('#burger-button')).toHaveAttribute('aria-expanded', 'false');
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
