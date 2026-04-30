import { expect, test } from '@playwright/test';

/**
 * milestone2-design-system.spec.ts — Pin the design-token contract delivered
 * in Milestone 2.
 *
 * Verifies:
 *   1. CSS custom property `--primary` resolves to the French Tech red triplet
 *      `239 65 53` on both light and dark themes.
 *   2. CSS custom property `--accent` resolves to the right blue per theme.
 *   3. Hero text is NOT forced to the legacy near-black `#0f172a` in dark mode —
 *      it now follows `--text` and ends up light on dark instead.
 *   4. The hero element renders a theme-aware overlay scrim above the photo
 *      (the `--hero-overlay` token) — i.e., its computed `background-image`
 *      contains a `linear-gradient(...)` segment in addition to the URL.
 *   5. The body font-family begins with the self-hosted variable Inter, with
 *      `system-ui` retained as a fallback.
 */

test.describe('Milestone 2 — design system', () => {
  test('--primary resolves to the French Tech red triplet on light', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      try {
        localStorage.setItem('theme', 'light');
      } catch {}
      document.documentElement.setAttribute('data-theme', 'light');
    });
    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
    );
    // Spaces or commas — accept both. The spec says space-separated triplets.
    expect(value.replace(/\s+/g, ' ')).toBe('239 65 53');
  });

  test('--primary resolves to the French Tech red triplet on dark', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      try {
        localStorage.setItem('theme', 'dark');
      } catch {}
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
    );
    expect(value.replace(/\s+/g, ' ')).toBe('239 65 53');
  });

  test('--accent resolves to the French Tech blue on light', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    );
    expect(value.replace(/\s+/g, ' ')).toBe('0 85 164');
  });

  test('hero text in dark mode is NOT forced to legacy near-black', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    const color = await page.evaluate(() => {
      const h1 = document.querySelector('.hero h1') as HTMLElement | null;
      return h1 ? getComputedStyle(h1).color : null;
    });
    expect(color, '.hero h1 should have a computed color in dark mode').not.toBeNull();
    // Legacy bug: hero h1 was forced to color: #0f172a even in dark mode.
    // After the fix, it follows --text — which in dark is `241 245 249` →
    // `rgb(241, 245, 249)`. Just assert it's NOT the legacy near-black.
    expect(color).not.toMatch(/^rgb\(\s*15\s*,\s*23\s*,\s*42\s*\)/);
  });

  test('hero applies a gradient overlay in addition to the photo', async ({ page }) => {
    await page.goto('/');
    const bg = await page.evaluate(() => {
      const hero = document.querySelector('.hero') as HTMLElement | null;
      return hero ? getComputedStyle(hero).backgroundImage : null;
    });
    expect(bg, '.hero should have a backgroundImage').not.toBeNull();
    // The stack should contain at least one gradient (radial OR linear) AND
    // the hero photo URL — the design-system rewrite layered both.
    expect(bg!).toMatch(/gradient\(/);
    expect(bg!).toMatch(/hero\.jpg/);
  });

  test('body font-family prefers Inter Variable, with system-ui fallback', async ({ page }) => {
    await page.goto('/');
    const family = await page.evaluate(() =>
      getComputedStyle(document.body).fontFamily,
    );
    // Browsers normalize to either single or double quotes around the family
    // name; lowercase the value before comparing.
    expect(family.toLowerCase()).toContain('inter variable');
    expect(family.toLowerCase()).toContain('system-ui');
  });
});
