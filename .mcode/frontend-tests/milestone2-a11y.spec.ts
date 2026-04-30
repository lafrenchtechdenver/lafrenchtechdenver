import { expect, test } from "@playwright/test";

/**
 * milestone2-a11y.spec.ts — Accessibility baseline for Milestone 2.
 *
 * Verifies:
 *   - Skip-to-content link is the FIRST focusable element on every page.
 *   - Skip-link href points to #main-content.
 *   - Skip-link is offscreen by default (top: -48px) and moves into view on focus.
 *   - <main id="main-content"> landmark exists on every page.
 *   - :focus-visible outline ring renders on interactive elements (theme toggle).
 *   - prefers-reduced-motion reduces transition-duration globally.
 */

const ALL_PAGES = [
  "/",
  "/index.html",
  "/about.html",
  "/companies-sponsors.html",
  "/events.html",
  "/members-benefits.html",
  "/resources.html",
];

test.describe("Skip-to-content link", () => {
  test("skip-link is the first focusable element on /", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      return {
        tag: el.tagName,
        cls: el.className,
        href: (el as HTMLAnchorElement).href ?? "",
      };
    });
    expect(focused, "document.activeElement should be set after Tab").not.toBeNull();
    expect(focused!.tag).toBe("A");
    expect(focused!.cls).toContain("skip-link");
    expect(focused!.href).toContain("#main-content");
  });

  test("skip-link is offscreen by default (top < 0)", async ({ page }) => {
    await page.goto("/");
    const topBefore = await page.locator(".skip-link").evaluate(
      (el) => parseFloat(getComputedStyle(el).top)
    );
    expect(topBefore, "skip-link should be offscreen before focus").toBeLessThan(0);
  });

  test("skip-link becomes visible on focus (top >= 0)", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.locator(".skip-link");
    await skipLink.focus();
    await expect
      .poll(
        async () =>
          skipLink.evaluate((el) => parseFloat(getComputedStyle(el).top)),
        { message: "skip-link should slide into view", timeout: 2000 }
      )
      .toBeGreaterThanOrEqual(0);
  });

  for (const url of ALL_PAGES) {
    test(`skip-link points at #main-content on ${url}`, async ({ page }) => {
      await page.goto(url);
      const skip = page.locator(".skip-link");
      await expect(skip).toHaveCount(1);
      await expect(skip).toHaveAttribute("href", "#main-content");
    });
  }
});

test.describe("<main> landmark", () => {
  for (const url of ALL_PAGES) {
    test(`<main id="main-content"> exists on ${url}`, async ({ page }) => {
      await page.goto(url);
      const main = page.locator("main#main-content");
      await expect(main, `<main id="main-content"> missing on ${url}`).toHaveCount(1);
    });
  }
});

test.describe(":focus-visible outline", () => {
  test("theme-toggle has an outline when focused via keyboard", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const t = document.getElementById("theme-toggle");
      if (t) t.focus();
    });
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");

    const outlineWidth = await page.evaluate(() => {
      const t = document.getElementById("theme-toggle") as HTMLElement | null;
      if (!t) return 0;
      t.focus();
      return parseFloat(getComputedStyle(t).outlineWidth);
    });
    expect(outlineWidth, "theme toggle should have outline-width > 0 on focus").toBeGreaterThan(0);
  });
});

test.describe("prefers-reduced-motion", () => {
  test("transitions are near-zero under prefers-reduced-motion: reduce", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await page.goto("/");
      const transitionDuration = await page.evaluate(() => {
        const link = document.querySelector(".menu a");
        return link ? getComputedStyle(link).transitionDuration : null;
      });
      expect(transitionDuration, "should have transition-duration").not.toBeNull();
      const normalized = String(transitionDuration).trim();
      const seconds = normalized.endsWith("ms")
        ? parseFloat(normalized) / 1000
        : parseFloat(normalized);
      expect(
        seconds,
        `expected near-zero duration, got "${normalized}" → ${seconds}s`
      ).toBeLessThan(0.05);
    } finally {
      await context.close();
    }
  });
});
