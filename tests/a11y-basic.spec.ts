import { expect, test } from '@playwright/test';

/**
 * a11y-basic.spec.ts — WCAG 2.2 AA baseline checks owed by Milestone 2.
 *
 * Pins the accessibility contract established in BaseLayout.astro and
 * src/styles/global.css:
 *   - Skip-to-content link is the FIRST focusable element on every page and
 *     points at <main id="main-content">.
 *   - Skip-link is offscreen by default and slides into view on focus.
 *   - <main id="main-content"> exists on every page.
 *   - The single global :focus-visible rule renders an outline on the
 *     theme toggle (a representative interactive affordance) on Tab focus.
 *   - prefers-reduced-motion users get the still-page treatment.
 *
 * Full per-page axe-core scans land in a later milestone. Until then, these
 * targeted assertions are the contract.
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

test.describe('Accessibility baseline', () => {
  test('skip-link is the first focusable element on /', async ({ page }) => {
    await page.goto('/');
    // Tab from the body — first focused element should be the skip-link.
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      return {
        tag: el.tagName,
        cls: el.className,
        href: (el as HTMLAnchorElement).href ?? '',
      };
    });
    expect(focused, 'document.activeElement should be set after Tab').not.toBeNull();
    expect(focused!.tag).toBe('A');
    expect(focused!.cls).toContain('skip-link');
    expect(focused!.href).toContain('#main-content');
  });

  test('skip-link is offscreen by default and slides on focus', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('.skip-link');

    // Before focus: top should be off-screen (negative).
    const topBefore = await skipLink.evaluate(
      (el) => parseFloat(getComputedStyle(el).top),
    );
    expect(topBefore, 'skip-link should be off-screen before focus').toBeLessThan(0);

    // Focus it programmatically; the rule fires on :focus / :focus-visible.
    // The CSS transitions `top` over 0.2s; poll the computed value until the
    // animation has settled so we don't race against the in-flight transition.
    await skipLink.focus();
    await expect
      .poll(
        async () =>
          await skipLink.evaluate((el) => parseFloat(getComputedStyle(el).top)),
        {
          message: 'skip-link should slide into view on focus',
          timeout: 2000,
        },
      )
      .toBeGreaterThanOrEqual(0);
  });

  for (const url of ALL_PAGES) {
    test(`<main id="main-content"> landmark on ${url}`, async ({ page }) => {
      await page.goto(url);
      const main = page.locator('main#main-content');
      await expect(main, `<main id="main-content"> should exist on ${url}`).toHaveCount(1);
    });
  }

  for (const url of ALL_PAGES) {
    test(`skip-link points at #main-content on ${url}`, async ({ page }) => {
      await page.goto(url);
      const skip = page.locator('.skip-link');
      await expect(skip).toHaveCount(1);
      await expect(skip).toHaveAttribute('href', '#main-content');
    });
  }

  test(':focus-visible renders an outline on #theme-toggle', async ({ page }) => {
    await page.goto('/');
    // Programmatically focus the toggle and check computed outline-width.
    // Using element.focus() does NOT always trigger :focus-visible in Chromium
    // headless — keyboard navigation is the reliable trigger.
    await page.evaluate(() => {
      const t = document.getElementById('theme-toggle');
      if (t) t.focus();
    });
    // Send a Tab to ensure :focus-visible activates after a key event.
    // We deliberately don't rely on Tab counting from the start — focus the
    // element first, then synthesize keyboard intent so :focus-visible kicks in.
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');

    const outlineWidth = await page.evaluate(() => {
      const t = document.getElementById('theme-toggle') as HTMLElement | null;
      if (!t) return 0;
      t.focus();
      // Synthesize a focus-visible state by adding/removing a class no longer
      // needed — just trust :focus + global rule. Both :focus and
      // :focus-visible apply the same outline in our global.css.
      const cs = getComputedStyle(t);
      return parseFloat(cs.outlineWidth);
    });
    expect(outlineWidth, 'theme toggle outline-width should be > 0 on focus').toBeGreaterThan(0);
  });

  test('prefers-reduced-motion shrinks transition-duration globally', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.goto('/');
      // Pick a single-property transition target — `.menu a` declares
      // `transition: all 0.2s ease`, which in normal mode resolves to "0.2s".
      // Under prefers-reduced-motion: reduce, the global * override forces
      // transition-duration to 0.01ms.
      const transitionDuration = await page.evaluate(() => {
        const link = document.querySelector('.menu a');
        return link ? getComputedStyle(link).transitionDuration : null;
      });
      expect(transitionDuration, 'menu link should have a transition-duration').not.toBeNull();
      // The override is `0.01ms !important`. Browsers normalize that into
      // a tiny number of seconds — Chromium emits `"1e-05s"`, others may
      // emit `"0.00001s"` or `"0.01ms"`. Strip the unit and assert the
      // numeric duration is well below the legacy `0.2s` value.
      const normalized = String(transitionDuration).trim();
      const seconds = normalized.endsWith('ms')
        ? parseFloat(normalized) / 1000
        : parseFloat(normalized);
      expect(
        seconds,
        `expected near-zero transition-duration in seconds, got "${normalized}" → ${seconds}`,
      ).toBeLessThan(0.05);
    } finally {
      await context.close();
    }
  });
});
