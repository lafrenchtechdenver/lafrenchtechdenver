import { expect, test } from '@playwright/test';

/**
 * theme.spec.ts — Light/dark theme toggle and persistence.
 *
 * Verifies:
 * 1. Default theme on fresh load is "light".
 * 2. Clicking #theme-toggle flips document.documentElement.dataset.theme from
 *    "light" to "dark" and back.
 * 3. The chosen theme is persisted in localStorage under the key "theme".
 * 4. Reloading the page restores the stored theme (no FOUC workaround needed —
 *    the inline script in <head> does it, so we just check the attribute after load).
 */

test.describe('Theme Toggle', () => {
  test('default theme is light on first load', async ({ page }) => {
    // Clear any stored theme from previous tests.
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');
  });

  test('clicking #theme-toggle switches to dark mode', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    await page.click('#theme-toggle');

    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });

  test('clicking #theme-toggle twice returns to light mode', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    await page.click('#theme-toggle');
    await page.click('#theme-toggle');

    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');
  });

  test('theme is stored in localStorage after toggle', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    await page.click('#theme-toggle');

    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    expect(stored).toBe('dark');
  });

  test('dark theme persists after page reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    // Set to dark.
    await page.click('#theme-toggle');

    // Reload — the inline <head> script should restore "dark" before body renders.
    await page.reload();

    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });

  test('light theme persists after page reload', async ({ page }) => {
    await page.goto('/');
    // Set to dark then back to light.
    await page.evaluate(() => localStorage.setItem('theme', 'light'));
    await page.reload();

    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');
  });

  test('theme toggle is present on every page', async ({ page }) => {
    const pages = [
      '/',
      '/about.html',
      '/companies-sponsors.html',
      '/members-benefits.html',
      '/events.html',
      '/resources.html',
    ];

    for (const url of pages) {
      // `/events.html` embeds the Luma calendar iframe, whose React app keeps
      // the page's `load` event open for ~30 s on every visit. The default
      // `page.goto(...)` waits for `load`, which times out the test even
      // though our chrome (nav + hero + iframe wrapper) has long since
      // rendered. `domcontentloaded` is sufficient for verifying the theme
      // toggle is present.
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const toggle = page.locator('#theme-toggle');
      await expect(toggle, `#theme-toggle should be visible on ${url}`).toBeVisible();
    }
  });
});
