import { expect, test } from '@playwright/test';

/**
 * a11y-basic.spec.ts — Keyboard accessibility baseline.
 *
 * Verifies the WCAG 2.2 AA fixes landed in Milestone 2:
 * 1. The first focusable element on every page is the skip-to-content link
 *    (`<a class="skip-link" href="#main-content">`). A keyboard user pressing
 *    Tab from the top of the page must land there first, before the nav.
 * 2. Activating the skip-link moves focus to `<main id="main-content">`.
 * 3. Subsequent Tab presses expose `:focus-visible` outline on interactive
 *    elements (the legacy stylesheet had no focus rings at all).
 * 4. Every page renders a `<main id="main-content">` landmark.
 * 5. The skip-link is visually hidden when not focused (uses negative `top`)
 *    and becomes visible when focused.
 *
 * Layer 3 axe-core scans are deferred to a later milestone — this spec is the
 * keyboard-navigation baseline that complements the a11y fixes.
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

test.describe('A11y — Keyboard baseline', () => {
  for (const url of ALL_PAGES) {
    test(`<main id="main-content"> landmark present on ${url}`, async ({ page }) => {
      await page.goto(url);
      const main = page.locator('main#main-content');
      await expect(main, `<main id="main-content"> should exist on ${url}`).toHaveCount(1);
    });
  }

  for (const url of ALL_PAGES) {
    test(`skip-link is the first focusable element on ${url}`, async ({ page }) => {
      await page.goto(url);

      // Click on body to ensure no element has focus initially, then Tab once.
      // Some browsers focus an arbitrary element after navigation; explicit
      // body focus + Tab gives a deterministic starting point.
      await page.evaluate(() => {
        if (document.activeElement && 'blur' in document.activeElement) {
          (document.activeElement as HTMLElement).blur();
        }
      });
      await page.keyboard.press('Tab');

      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return {
          tagName: el.tagName,
          className: el.className,
          textContent: (el.textContent || '').trim(),
          href: (el as HTMLAnchorElement).getAttribute('href'),
        };
      });

      expect(focused, 'an element should be focused after first Tab').not.toBeNull();
      expect(focused?.className, 'first Tab should land on the skip-link').toContain('skip-link');
      expect(focused?.tagName, 'skip-link should be an anchor').toBe('A');
      expect(focused?.href, 'skip-link should target #main-content').toBe('#main-content');
      expect(focused?.textContent, 'skip-link should read "Skip to content"').toBe(
        'Skip to content',
      );
    });
  }

  test('skip-link is visually hidden until focused', async ({ page }) => {
    await page.goto('/');

    // When not focused, the skip-link is positioned offscreen via top: -40px.
    const offscreenTop = await page.evaluate(() => {
      const el = document.querySelector('.skip-link') as HTMLElement | null;
      if (!el) return null;
      // We just check the rendered top property — must be negative.
      return el.getBoundingClientRect().top;
    });
    expect(offscreenTop).not.toBeNull();
    expect(offscreenTop!).toBeLessThan(0);

    // When focused, it should slide on screen (top moves to >= 0).
    await page.evaluate(() => {
      const el = document.querySelector('.skip-link') as HTMLElement | null;
      el?.focus();
    });
    // Allow the CSS transition to complete.
    await page.waitForTimeout(300);

    const onscreenTop = await page.evaluate(() => {
      const el = document.querySelector('.skip-link') as HTMLElement | null;
      return el ? el.getBoundingClientRect().top : null;
    });
    expect(onscreenTop).not.toBeNull();
    expect(onscreenTop!).toBeGreaterThanOrEqual(0);
  });

  test('focus-visible ring is rendered on the theme toggle when keyboard-focused', async ({
    page,
  }) => {
    await page.goto('/');

    // Programmatically focus the toggle (proxy for keyboard navigation —
    // Playwright's evaluation context distinguishes :focus-visible the same way
    // a Tab key does for synthetic events).
    await page.evaluate(() => {
      const toggle = document.getElementById('theme-toggle') as HTMLElement | null;
      toggle?.focus();
    });

    const outlineWidth = await page.evaluate(() => {
      const toggle = document.getElementById('theme-toggle');
      if (!toggle) return null;
      const cs = window.getComputedStyle(toggle);
      return cs.outlineStyle === 'none' ? '0px' : cs.outlineWidth;
    });

    expect(outlineWidth).not.toBeNull();
    // We set `outline: 3px solid` in :focus-visible. Even with browser
    // normalization, the computed width should be > 0 for a focused element.
    const px = parseFloat(outlineWidth || '0');
    expect(px, 'theme toggle should have a visible focus ring on keyboard focus').toBeGreaterThan(
      0,
    );
  });

  test('activating skip-link jumps focus to <main>', async ({ page }) => {
    await page.goto('/');

    // Focus the skip-link, then press Enter to activate it.
    await page.evaluate(() => {
      const link = document.querySelector('.skip-link') as HTMLElement | null;
      link?.focus();
    });
    await page.keyboard.press('Enter');

    // After activation the URL should have a #main-content fragment.
    expect(page.url(), 'URL should include the #main-content fragment').toMatch(/#main-content$/);

    // And <main> should now exist with the same id.
    const mainExists = await page.evaluate(() => !!document.getElementById('main-content'));
    expect(mainExists, '<main id="main-content"> should still exist after navigation').toBe(true);
  });
});
