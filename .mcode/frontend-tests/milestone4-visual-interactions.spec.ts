/**
 * milestone4-visual-interactions.spec.ts
 *
 * Browser-visible flow tests for Milestone 4 that go beyond the existing
 * functional `tests/` suite. Focuses on:
 *
 *  1. Theme toggle: glyph updates (◐/◑), data-theme flips, localStorage persistence
 *  2. Mobile burger menu: real mouse interactions at ≤900px; outside-click via page.mouse
 *  3. CTA contrast: computed colour values in light and dark mode
 *  4. Skip-to-content: Tab key lands on .skip-link, Enter activates it, main gets focus
 *  5. Responsive events iframe: .events-frame dimensions at narrow viewport
 *  6. aria-expanded on the burger button kept in sync with menu state
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Theme toggle visual behaviour
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Theme toggle — visual behaviour", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Start from a clean, known light-mode state.
    await page.evaluate(() => {
      localStorage.removeItem("theme");
      document.documentElement.setAttribute("data-theme", "light");
    });
  });

  test("glyph is ◐ in light mode and ◑ in dark mode", async ({ page }) => {
    const toggle = page.locator("#theme-toggle");

    const lightGlyph = await toggle.textContent();
    expect(lightGlyph?.trim()).toBe("◐");

    await toggle.click();
    await page.waitForTimeout(100);

    const darkGlyph = await toggle.textContent();
    expect(darkGlyph?.trim()).toBe("◑");
  });

  test("clicking toggle flips data-theme from light to dark", async ({ page }) => {
    await page.reload();
    const before = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme")
    );
    expect(before).toBe("light");

    await page.click("#theme-toggle");
    await page.waitForTimeout(100);

    const after = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme")
    );
    expect(after).toBe("dark");
  });

  test("clicking toggle twice returns to light mode", async ({ page }) => {
    await page.reload();
    await page.click("#theme-toggle");
    await page.click("#theme-toggle");
    await page.waitForTimeout(100);

    const theme = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme")
    );
    expect(theme).toBe("light");
  });

  test("dark theme is stored in localStorage after toggle", async ({ page }) => {
    await page.reload();
    await page.click("#theme-toggle");
    await page.waitForTimeout(100);

    const stored = await page.evaluate(() => localStorage.getItem("theme"));
    expect(stored).toBe("dark");
  });

  test("dark theme persists across page reload", async ({ page }) => {
    await page.reload();
    await page.click("#theme-toggle"); // go dark
    await page.waitForTimeout(100);

    await page.reload();

    const theme = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme")
    );
    expect(theme).toBe("dark");
  });

  test("theme toggle works on every Milestone 4 page", async ({ page }) => {
    const pages = [
      "/companies-sponsors.html",
      "/events.html",
      "/members-benefits.html",
      "/resources.html",
    ];

    for (const url of pages) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        localStorage.removeItem("theme");
        document.documentElement.setAttribute("data-theme", "light");
      });

      await page.click("#theme-toggle");
      await page.waitForTimeout(100);

      const theme = await page.evaluate(
        () => document.documentElement.getAttribute("data-theme")
      );
      expect(theme, `dark mode should be active after toggle on ${url}`).toBe("dark");

      // Reset for next iteration
      await page.evaluate(() => localStorage.removeItem("theme"));
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Mobile burger menu — real mouse interactions
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Mobile burger menu — real mouse interactions", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("burger button is visible at 375px", async ({ page }) => {
    await page.goto("/");
    const burger = page.locator(".burger");
    await expect(burger).toBeVisible();
  });

  test("menu is not visible before burger click", async ({ page }) => {
    await page.goto("/");
    const menu = page.locator("#menu");
    // CSS hides the menu at mobile before .active is applied
    await expect(menu).not.toHaveClass(/active/);
  });

  test("clicking burger shows the menu", async ({ page }) => {
    await page.goto("/");
    await page.locator(".burger").click();
    await page.waitForTimeout(200);

    const menu = page.locator("#menu");
    await expect(menu).toHaveClass(/active/);
  });

  test("clicking burger again hides the menu", async ({ page }) => {
    await page.goto("/");
    await page.locator(".burger").click();
    await page.waitForTimeout(200);
    await page.locator(".burger").click();
    await page.waitForTimeout(200);

    const menu = page.locator("#menu");
    await expect(menu).not.toHaveClass(/active/);
  });

  test("clicking outside the nav closes the open menu via real mouse", async ({ page }) => {
    await page.goto("/");

    // Open the menu using a real click.
    await page.locator(".burger").click();
    await page.waitForTimeout(200);
    await expect(page.locator("#menu")).toHaveClass(/active/);

    // Scroll so that the hero heading at the bottom of the viewport is reachable.
    // The nav occupies the top portion of the screen at mobile; clicking the
    // hero area is guaranteed to be outside .nav.
    const heroBox = await page.locator(".hero h1").boundingBox();
    if (heroBox) {
      // Use page.mouse for a real hit-tested click that triggers the outside-click handler.
      await page.mouse.click(
        heroBox.x + heroBox.width / 2,
        heroBox.y + heroBox.height / 2
      );
    } else {
      // Fallback: click a point well below the nav (y=600 on a 812px screen).
      await page.mouse.click(187, 600);
    }
    await page.waitForTimeout(200);

    await expect(page.locator("#menu")).not.toHaveClass(/active/);
  });

  test("all 6 nav links are visible inside the open mobile menu", async ({ page }) => {
    await page.goto("/");
    await page.locator(".burger").click();
    await page.waitForTimeout(200);

    const links = [
      "/index.html",
      "/about.html",
      "/companies-sponsors.html",
      "/members-benefits.html",
      "/events.html",
      "/resources.html",
    ];
    for (const href of links) {
      const link = page.locator(`#menu a[href="${href}"]`);
      await expect(link, `${href} should be visible in open menu`).toBeVisible();
    }
  });

  test("aria-expanded is true when menu is open and false when closed", async ({ page }) => {
    await page.goto("/");
    const burger = page.locator(".burger");

    // Initially closed
    const expandedBefore = await burger.getAttribute("aria-expanded");
    // Accept both null (attribute not present) and "false"
    if (expandedBefore !== null) {
      expect(expandedBefore).toBe("false");
    }

    await burger.click();
    await page.waitForTimeout(200);

    const expandedAfter = await burger.getAttribute("aria-expanded");
    expect(expandedAfter).toBe("true");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CTA button contrast — light and dark mode
// ─────────────────────────────────────────────────────────────────────────────

test.describe("CTA button — WCAG AA contrast check", () => {
  /**
   * Compute a relative luminance from an RGB tuple.
   * Formula per WCAG 2.x: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
   */
  function relativeLuminance(r: number, g: number, b: number): number {
    const channel = (c: number) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  function contrastRatio(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function parseRgb(cssColor: string): { r: number; g: number; b: number } | null {
    const m = cssColor.match(/\d+/g);
    if (!m) return null;
    return { r: parseInt(m[0]), g: parseInt(m[1]), b: parseInt(m[2]) };
  }

  test("CTA button has ≥4.5:1 contrast ratio in light mode", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("theme");
      document.documentElement.setAttribute("data-theme", "light");
    });

    const colors = await page.evaluate(() => {
      const el = document.querySelector("a.cta") as HTMLElement | null;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    });

    expect(colors, "a.cta should exist on home page").not.toBeNull();

    const bgRgb = parseRgb(colors!.bg);
    const fgRgb = parseRgb(colors!.color);
    expect(bgRgb, "background color should be parseable").not.toBeNull();
    expect(fgRgb, "foreground color should be parseable").not.toBeNull();

    const bgL = relativeLuminance(bgRgb!.r, bgRgb!.g, bgRgb!.b);
    const fgL = relativeLuminance(fgRgb!.r, fgRgb!.g, fgRgb!.b);
    const ratio = contrastRatio(bgL, fgL);

    expect(
      ratio,
      `CTA contrast ratio should be ≥4.5:1 (got ${ratio.toFixed(2)}:1)`
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("CTA button has ≥4.5:1 contrast ratio in dark mode", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.reload();

    const colors = await page.evaluate(() => {
      const el = document.querySelector("a.cta") as HTMLElement | null;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    });

    expect(colors, "a.cta should exist in dark mode").not.toBeNull();

    const bgRgb = parseRgb(colors!.bg);
    const fgRgb = parseRgb(colors!.color);
    expect(bgRgb).not.toBeNull();
    expect(fgRgb).not.toBeNull();

    const bgL = relativeLuminance(bgRgb!.r, bgRgb!.g, bgRgb!.b);
    const fgL = relativeLuminance(fgRgb!.r, fgRgb!.g, fgRgb!.b);
    const ratio = contrastRatio(bgL, fgL);

    expect(
      ratio,
      `CTA contrast in dark mode should be ≥4.5:1 (got ${ratio.toFixed(2)}:1)`
    ).toBeGreaterThanOrEqual(4.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Skip-to-content: keyboard navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Skip-to-content — keyboard flow", () => {
  test("first Tab lands on .skip-link and it has href=#main-content", async ({ page }) => {
    await page.goto("/");
    // Ensure nothing is focused from the navigation event.
    await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      el?.blur?.();
    });

    await page.keyboard.press("Tab");

    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el
        ? {
            tagName: el.tagName,
            className: el.className,
            href: (el as HTMLAnchorElement).getAttribute("href"),
            text: (el.textContent || "").trim(),
          }
        : null;
    });

    expect(focused).not.toBeNull();
    expect(focused!.className).toContain("skip-link");
    expect(focused!.tagName).toBe("A");
    expect(focused!.href).toBe("#main-content");
    expect(focused!.text).toBe("Skip to content");
  });

  test("activating skip-link with Enter jumps to #main-content", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      el?.blur?.();
    });

    await page.keyboard.press("Tab"); // focus skip-link
    await page.keyboard.press("Enter"); // activate

    await expect(page).toHaveURL(/#main-content$/);
  });

  test("skip-link is visually hidden when not focused (top < 0)", async ({ page }) => {
    await page.goto("/");

    const top = await page.evaluate(() => {
      const el = document.querySelector(".skip-link") as HTMLElement | null;
      return el ? el.getBoundingClientRect().top : null;
    });

    expect(top).not.toBeNull();
    expect(top!).toBeLessThan(0);
  });

  test("skip-link slides into view when focused (top ≥ 0)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const el = document.querySelector(".skip-link") as HTMLElement | null;
      el?.focus();
    });
    await page.waitForTimeout(300);

    const top = await page.evaluate(() => {
      const el = document.querySelector(".skip-link") as HTMLElement | null;
      return el ? el.getBoundingClientRect().top : null;
    });

    expect(top).not.toBeNull();
    expect(top!).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Events iframe responsive container
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Events iframe — responsive container", () => {
  test("iframe fills .events-frame width at desktop viewport", async ({ page }) => {
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });

    const iframeBox = await page.locator(".events-frame iframe").boundingBox();
    const wrapperBox = await page.locator(".events-frame").boundingBox();

    expect(iframeBox).not.toBeNull();
    expect(wrapperBox).not.toBeNull();
    // Iframe width should be close to wrapper width (within 4px tolerance).
    expect(iframeBox!.width).toBeGreaterThanOrEqual(wrapperBox!.width - 4);
  });

  test("iframe is visible and has positive height at desktop", async ({ page }) => {
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });
    const iframe = page.locator(".events-frame iframe");
    await expect(iframe).toBeVisible();
    const box = await iframe.boundingBox();
    expect(box!.height).toBeGreaterThan(0);
  });

  test("iframe does not cause horizontal scroll at 375px (no overflow)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    // Allow up to 2px rounding difference.
    expect(
      scrollWidth,
      `scrollWidth (${scrollWidth}) should not exceed clientWidth (${clientWidth}) — no horizontal overflow`
    ).toBeLessThanOrEqual(clientWidth + 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Navigation: active link across all Milestone 4 pages
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Navigation — active link on Milestone 4 pages", () => {
  const M4_PAGES = [
    { url: "/companies-sponsors.html", activeHref: "/companies-sponsors.html", label: "Companies & Sponsors" },
    { url: "/members-benefits.html", activeHref: "/members-benefits.html", label: "Members Benefits" },
    { url: "/resources.html", activeHref: "/resources.html", label: "Resources" },
  ];

  for (const { url, activeHref, label } of M4_PAGES) {
    test(`"${label}" nav link is active on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const activeLink = page.locator(`#menu a[href="${activeHref}"]`);
      await expect(activeLink).toHaveClass(/active/);
    });

    test(`only one nav link is active on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const activeLinks = page.locator("#menu a.active");
      await expect(activeLinks).toHaveCount(1);
    });
  }

  test("Events nav link is active on /events.html", async ({ page }) => {
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });
    const activeLink = page.locator('#menu a[href="/events.html"]');
    await expect(activeLink).toHaveClass(/active/);
  });

  test("only one nav link is active on /events.html", async ({ page }) => {
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });
    const activeLinks = page.locator("#menu a.active");
    await expect(activeLinks).toHaveCount(1);
  });
});
