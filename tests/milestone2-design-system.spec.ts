import { expect, test } from '@playwright/test';

/**
 * milestone2-design-system.spec.ts — Milestone 2 design system verification.
 *
 * Covers the specific deliverables of Milestone 2:
 * - Tailwind 4 design tokens (French Tech red #EF4135 / blue #0055A4)
 * - Self-hosted variable fonts (Inter + Bricolage Grotesque, no Google Fonts)
 * - ThemeToggle glyph changes (◐/◑)
 * - Hero contrast fix in dark mode
 * - Focus rings on all interactive elements (3px solid)
 * - Nav active state on all 6 pages
 * - Sitemap + robots.txt artifacts
 * - prefers-reduced-motion CSS rules present
 */

const ALL_PAGES = [
  { url: '/', activeHref: '/index.html' },
  { url: '/index.html', activeHref: '/index.html' },
  { url: '/about.html', activeHref: '/about.html' },
  { url: '/companies-sponsors.html', activeHref: '/companies-sponsors.html' },
  { url: '/members-benefits.html', activeHref: '/members-benefits.html' },
  { url: '/events.html', activeHref: '/events.html' },
  { url: '/resources.html', activeHref: '/resources.html' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Theme toggle glyph
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Theme toggle glyph', () => {
  test('glyph is ◐ in light mode', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    const glyph = await page.evaluate(() =>
      document.getElementById('theme-toggle')?.textContent?.trim(),
    );
    expect(glyph).toBe('◐');
  });

  test('glyph changes to ◑ after switching to dark mode', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    await page.click('#theme-toggle');

    const glyph = await page.evaluate(() =>
      document.getElementById('theme-toggle')?.textContent?.trim(),
    );
    expect(glyph).toBe('◑');
  });

  test('glyph reverts to ◐ after switching back to light mode', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    // Go dark then back to light.
    await page.click('#theme-toggle');
    await page.click('#theme-toggle');

    const glyph = await page.evaluate(() =>
      document.getElementById('theme-toggle')?.textContent?.trim(),
    );
    expect(glyph).toBe('◐');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// No FOUC — theme applied before paint
// ─────────────────────────────────────────────────────────────────────────────

test.describe('No FOUC (Flash of Unstyled Theme)', () => {
  test('data-theme is set on <html> before DOMContentLoaded', async ({ page }) => {
    // Store dark theme in localStorage before navigating.
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));

    // The inline <head> script runs synchronously when the HTML is parsed and
    // sets data-theme before any body content is rendered.  We verify this by
    // intercepting the response and checking that the attribute is applied
    // by injecting an initScript that reads the attribute on the NEXT load.
    let themeOnDCL: string | null = null;
    await page.exposeFunction('captureTheme', (t: string | null) => {
      themeOnDCL = t;
    });
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        (window as unknown as { captureTheme: (t: string | null) => void }).captureTheme(theme);
      });
    });

    await page.goto('/');
    // Allow the DOMContentLoaded event to fire and our handler to complete.
    await page.waitForLoadState('domcontentloaded');
    // Small wait to ensure the async captureTheme call returns.
    await page.waitForTimeout(100);

    // data-theme must be 'dark' (set by the inline head script).
    expect(themeOnDCL).toBe('dark');
  });

  test('data-theme is set immediately on reload without flash', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();

    // After reload the attribute must already be present.
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Self-hosted fonts — no Google Fonts request
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Self-hosted fonts', () => {
  test('no Google Fonts link tags are present', async ({ page }) => {
    await page.goto('/');

    const googleFontsLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('link[href]');
      return Array.from(links)
        .map((l) => (l as HTMLLinkElement).href)
        .filter((h) => h.includes('fonts.googleapis.com') || h.includes('fonts.gstatic.com'));
    });

    expect(googleFontsLinks).toHaveLength(0);
  });

  test('no Google Fonts requests are made during page load', async ({ page }) => {
    const googleFontRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('fonts.googleapis.com') || req.url().includes('fonts.gstatic.com')) {
        googleFontRequests.push(req.url());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(googleFontRequests).toHaveLength(0);
  });

  test('Inter Variable font-face is declared in the stylesheet', async ({ page }) => {
    await page.goto('/');

    const hasInterFontFace = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            if (
              rule instanceof CSSFontFaceRule &&
              rule.style.getPropertyValue('font-family').includes('Inter Variable')
            ) {
              return true;
            }
          }
        } catch {
          // Cross-origin stylesheet — skip.
        }
      }
      return false;
    });

    expect(hasInterFontFace).toBe(true);
  });

  test('Bricolage Grotesque Variable font-face is declared in the stylesheet', async ({ page }) => {
    await page.goto('/');

    const hasBricolageFont = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            if (
              rule instanceof CSSFontFaceRule &&
              rule.style.getPropertyValue('font-family').includes('Bricolage Grotesque Variable')
            ) {
              return true;
            }
          }
        } catch {
          // Cross-origin stylesheet — skip.
        }
      }
      return false;
    });

    expect(hasBricolageFont).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — French Tech brand colors
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Design tokens', () => {
  test('--primary CSS variable resolves to French Tech red (#EF4135) in light mode', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    const primaryChannel = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
    );

    // The token is stored as "239 65 53" (RGB channels without the function wrapper).
    expect(primaryChannel).toBe('239 65 53');
  });

  test('--primary CSS variable is the same in dark mode (#EF4135)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();

    const primaryChannel = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
    );

    // Red primary is kept the same in both themes.
    expect(primaryChannel).toBe('239 65 53');
  });

  test('--accent CSS variable resolves to French Tech blue (#0055A4) in light mode', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    const accentChannel = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    );

    // #0055A4 = rgb(0, 85, 164)
    expect(accentChannel).toBe('0 85 164');
  });

  test('[data-theme="dark"] selector toggles the dark token set', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();

    // In dark mode --bg becomes "15 23 42" (dark navy), not the light "247 247 251".
    const bgChannel = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
    );
    expect(bgChannel).toBe('15 23 42');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hero contrast in dark mode
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Hero contrast', () => {
  test('hero h1 color is NOT the legacy forced black in dark mode', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();

    const color = await page.evaluate(() => {
      const h1 = document.querySelector('.hero h1');
      if (!h1) return null;
      return window.getComputedStyle(h1).color;
    });

    // Legacy was rgb(15, 23, 42) = #0f172a (near-black forced in light AND dark).
    // After the fix, dark mode hero text should be near-white (~241, 245, 249).
    expect(color).not.toBeNull();
    // Not the legacy forced near-black.
    expect(color).not.toBe('rgb(15, 23, 42)');
  });

  test('hero h1 color is a light value in dark mode (near-white)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();

    const { r, g, b } = await page.evaluate(() => {
      const h1 = document.querySelector('.hero h1');
      if (!h1) return { r: 0, g: 0, b: 0 };
      const color = window.getComputedStyle(h1).color;
      const match = color.match(/\d+/g);
      return match
        ? { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) }
        : { r: 0, g: 0, b: 0 };
    });

    // Near-white — all channels should be > 200.
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(200);
    expect(b).toBeGreaterThan(200);
  });

  test('hero is present and contains heading on home page', async ({ page }) => {
    await page.goto('/');
    const heroHeading = page.locator('.hero h1');
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).toContainText('La French Tech Denver');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Focus rings on interactive elements
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Focus rings', () => {
  test(':focus-visible outline is > 0px on theme toggle', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const toggle = document.getElementById('theme-toggle') as HTMLElement | null;
      toggle?.focus();
    });

    const outlineWidth = await page.evaluate(() => {
      const toggle = document.getElementById('theme-toggle');
      if (!toggle) return null;
      return parseFloat(window.getComputedStyle(toggle).outlineWidth);
    });

    expect(outlineWidth).toBeGreaterThan(0);
  });

  test(':focus-visible outline is > 0px on a nav link when focused', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const link = document.querySelector('#menu a') as HTMLElement | null;
      link?.focus();
    });

    const outlineWidth = await page.evaluate(() => {
      const link = document.querySelector('#menu a') as HTMLElement | null;
      if (!link) return null;
      return parseFloat(window.getComputedStyle(link).outlineWidth);
    });

    expect(outlineWidth).toBeGreaterThan(0);
  });

  test(':focus-visible outline is > 0px on a social link when focused', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const link = document.querySelector('.social-link') as HTMLElement | null;
      link?.focus();
    });

    const outlineWidth = await page.evaluate(() => {
      const link = document.querySelector('.social-link') as HTMLElement | null;
      if (!link) return null;
      return parseFloat(window.getComputedStyle(link).outlineWidth);
    });

    expect(outlineWidth).toBeGreaterThan(0);
  });

  test(':focus-visible outline is > 0px on the CTA link when focused', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const cta = document.querySelector('.cta') as HTMLElement | null;
      cta?.focus();
    });

    const outlineWidth = await page.evaluate(() => {
      const cta = document.querySelector('.cta') as HTMLElement | null;
      if (!cta) return null;
      return parseFloat(window.getComputedStyle(cta).outlineWidth);
    });

    expect(outlineWidth).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Nav active state — all 6 pages
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Nav active state', () => {
  // Skip the bare "/" — it redirects to /index.html anyway and active is on /index.html.
  const PAGE_ACTIVE_PAIRS = [
    { url: '/index.html', activeHref: '/index.html' },
    { url: '/about.html', activeHref: '/about.html' },
    { url: '/companies-sponsors.html', activeHref: '/companies-sponsors.html' },
    { url: '/members-benefits.html', activeHref: '/members-benefits.html' },
    { url: '/events.html', activeHref: '/events.html' },
    { url: '/resources.html', activeHref: '/resources.html' },
  ];

  for (const { url, activeHref } of PAGE_ACTIVE_PAIRS) {
    test(`${url}: nav link for "${activeHref}" has .active class`, async ({ page }) => {
      // /events.html keeps the load event open ~30 s due to the Luma iframe.
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const activeLink = page.locator(`#menu a[href="${activeHref}"]`);
      await expect(activeLink).toHaveClass(/active/);
    });
  }

  for (const { url } of PAGE_ACTIVE_PAIRS) {
    test(`${url}: only one nav link is active at a time`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const activeLinks = page.locator('#menu a.active');
      await expect(activeLinks).toHaveCount(1);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Sitemap and robots.txt
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sitemap and robots.txt', () => {
  test('GET /sitemap-index.xml returns 200', async ({ page }) => {
    const response = await page.goto('/sitemap-index.xml');
    expect(response?.status()).toBe(200);
  });

  test('/sitemap-index.xml is a valid XML sitemapindex', async ({ page }) => {
    await page.goto('/sitemap-index.xml');
    const content = await page.content();
    expect(content).toContain('sitemapindex');
    expect(content).toContain('sitemap-0.xml');
  });

  test('GET /sitemap-0.xml returns 200', async ({ page }) => {
    const response = await page.goto('/sitemap-0.xml');
    expect(response?.status()).toBe(200);
  });

  test('/sitemap-0.xml contains the site URLs', async ({ page }) => {
    await page.goto('/sitemap-0.xml');
    const content = await page.content();
    expect(content).toContain('lafrenchtechdenver.com');
  });

  test('GET /robots.txt returns 200', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);
  });

  test('/robots.txt contains a Sitemap directive', async ({ page }) => {
    await page.goto('/robots.txt');
    const content = await page.content();
    expect(content).toContain('Sitemap:');
    expect(content).toContain('sitemap-index.xml');
  });

  test('/robots.txt allows all user-agents', async ({ page }) => {
    await page.goto('/robots.txt');
    const content = await page.content();
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Allow: /');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// prefers-reduced-motion
// ─────────────────────────────────────────────────────────────────────────────

test.describe('prefers-reduced-motion', () => {
  test('transition-duration is near-zero when prefers-reduced-motion: reduce', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // The CSS should gate transitions: transition-duration becomes 0.01ms.
    const bodyTransitionDuration = await page.evaluate(() => {
      return parseFloat(window.getComputedStyle(document.body).transitionDuration);
    });

    // 0.01ms = 0.00001s — practically zero.
    expect(bodyTransitionDuration).toBeLessThanOrEqual(0.00002);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Social links present on every page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Social links on all pages', () => {
  for (const { url } of ALL_PAGES) {
    test(`LinkedIn link present on ${url}`, async ({ page }) => {
      // /events.html keeps the load event open ~30 s due to the Luma iframe.
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const linkedin = page.locator(
        'a[href="https://www.linkedin.com/company/denver-french-tech"]',
      );
      await expect(linkedin).toBeVisible();
    });

    test(`Facebook link present on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const facebook = page.locator(
        'a[href="https://www.facebook.com/groups/lafrenchtechdenver/"]',
      );
      await expect(facebook).toBeVisible();
    });

    test(`Mailto link present on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const email = page.locator('a[href="mailto:contact@lafrenchtechdenver.com"]');
      await expect(email).toBeVisible();
    });
  }
});
