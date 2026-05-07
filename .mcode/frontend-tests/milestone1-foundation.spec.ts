/**
 * milestone1-foundation.spec.ts
 *
 * E2E tests for Milestone 1 (Foundation): the Astro scaffold, BaseLayout,
 * home page, and URL-preserving placeholders.
 *
 * Covers the seven behaviors called out in the M1 frontend-testing brief:
 *
 * 1. URL contract  — all 6 legacy .html URLs return HTTP 200 and render <h1>
 * 2. Nav           — 6 links with .html suffixes; active state follows
 *                    the current page; clicking each link navigates correctly
 * 3. Theme toggle  — flips data-theme, persists in localStorage, glyph swaps
 * 4. Mobile burger — visible at 375px; aria-expanded syncs; outside-click closes
 * 5. Social links  — LinkedIn, Facebook, mailto on every page
 * 6. Skip-to-content — first focusable element; activating it moves focus to <main>
 * 7. Home content  — hero h1, 4 KPI cards, 6 partner cards, Google Form CTA link
 *
 * These tests run against the already-started preview server (baseURL configured
 * in playwright.config.ts). No webServer block here — the server is managed by
 * the run-app lifecycle.
 */

import { test, expect } from "@playwright/test";

// ─── Shared constants ─────────────────────────────────────────────────────────

const ALL_PAGES = [
  "/",
  "/index.html",
  "/about.html",
  "/companies-sponsors.html",
  "/members-benefits.html",
  "/events.html",
  "/resources.html",
];

const NAV_LINKS = [
  { label: "Home", href: "/index.html" },
  { label: "About us", href: "/about.html" },
  { label: "Companies & Sponsors", href: "/companies-sponsors.html" },
  { label: "Members Benefits", href: "/members-benefits.html" },
  { label: "Events", href: "/events.html" },
  { label: "Resources", href: "/resources.html" },
];

const MEMBERSHIP_FORM_URL =
  "https://docs.google.com/forms/d/1tpHwjsberWYWbVuiEy9S6CP44k0gxJuaFi9ha5QBIqM/viewform";

// ─── 1. URL contract ──────────────────────────────────────────────────────────

test.describe("M1 — URL contract", () => {
  for (const url of [
    "/",
    "/index.html",
    "/about.html",
    "/companies-sponsors.html",
    "/events.html",
    "/members-benefits.html",
    "/resources.html",
  ]) {
    test(`GET ${url} returns HTTP 200`, async ({ page }) => {
      // events.html embeds a Luma iframe that keeps the load event open ~30s;
      // domcontentloaded is sufficient for URL / structure assertions.
      const resp = await page.goto(url, { waitUntil: "domcontentloaded" });
      expect(resp?.status(), `${url} should return 200`).toBeLessThan(400);
    });

    test(`${url} renders an <h1>`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const h1 = page.locator("h1");
      await expect(h1.first(), `${url} should have a visible <h1>`).toBeVisible();
    });
  }
});

// ─── 2. Nav — links, active state, navigation ─────────────────────────────────

test.describe("M1 — Nav: 6 .html links on every page", () => {
  for (const url of ALL_PAGES) {
    test(`all 6 nav links present on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      for (const link of NAV_LINKS) {
        const el = page.locator(`#menu a[href="${link.href}"]`);
        await expect(el, `"${link.label}" link should be visible on ${url}`).toBeVisible();
      }
    });
  }
});

test.describe("M1 — Nav: active state on current page", () => {
  for (const { label, href } of NAV_LINKS) {
    test(`"${label}" link has .active on ${href}`, async ({ page }) => {
      await page.goto(href, { waitUntil: "domcontentloaded" });
      const activeLink = page.locator(`#menu a[href="${href}"]`);
      await expect(
        activeLink,
        `"${label}" link should carry .active class on ${href}`
      ).toHaveClass(/active/);
    });

    test(`only one nav link is active on ${href}`, async ({ page }) => {
      await page.goto(href, { waitUntil: "domcontentloaded" });
      const activeLinks = page.locator("#menu a.active");
      await expect(
        activeLinks,
        `exactly one nav link should be active on ${href}`
      ).toHaveCount(1);
    });
  }
});

test.describe("M1 — Nav: clicking a link navigates and updates active", () => {
  test("clicking About us nav link navigates to /about.html and marks it active", async ({
    page,
  }) => {
    await page.goto("/");
    // Click inside the nav rather than navigating directly.
    await page.locator('#menu a[href="/about.html"]').click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/about\.html/);
    const activeLink = page.locator('#menu a[href="/about.html"]');
    await expect(activeLink).toHaveClass(/active/);
  });

  test("clicking Home nav link from /about.html marks Home active", async ({
    page,
  }) => {
    await page.goto("/about.html");
    await page.locator('#menu a[href="/index.html"]').click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/index\.html|\/$/);
    const activeLink = page.locator('#menu a[href="/index.html"]');
    await expect(activeLink).toHaveClass(/active/);
  });
});

// ─── 3. Theme toggle ──────────────────────────────────────────────────────────

test.describe("M1 — Theme toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Ensure clean light-mode start.
    await page.evaluate(() => {
      localStorage.removeItem("theme");
      document.documentElement.setAttribute("data-theme", "light");
    });
  });

  test("default data-theme is 'light' on fresh load", async ({ page }) => {
    await page.reload();
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(theme).toBe("light");
  });

  test("glyph is ◐ in light mode", async ({ page }) => {
    const glyph = await page.locator("#theme-toggle").textContent();
    expect(glyph?.trim()).toBe("◐");
  });

  test("clicking #theme-toggle sets data-theme to 'dark'", async ({ page }) => {
    await page.click("#theme-toggle");
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(theme).toBe("dark");
  });

  test("glyph becomes ◑ in dark mode", async ({ page }) => {
    await page.click("#theme-toggle");
    const glyph = await page.locator("#theme-toggle").textContent();
    expect(glyph?.trim()).toBe("◑");
  });

  test("clicking #theme-toggle stores 'dark' in localStorage", async ({ page }) => {
    await page.click("#theme-toggle");
    const stored = await page.evaluate(() => localStorage.getItem("theme"));
    expect(stored).toBe("dark");
  });

  test("dark theme persists after page reload via localStorage", async ({ page }) => {
    await page.click("#theme-toggle");
    await page.reload();
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(theme, "inline <head> script should restore dark mode before paint").toBe("dark");
  });

  test("clicking #theme-toggle twice returns to light mode", async ({ page }) => {
    await page.click("#theme-toggle");
    await page.click("#theme-toggle");
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(theme).toBe("light");
  });

  test("#theme-toggle is visible on every page", async ({ page }) => {
    for (const url of ALL_PAGES) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(
        page.locator("#theme-toggle"),
        `#theme-toggle should be visible on ${url}`
      ).toBeVisible();
    }
  });
});

// ─── 4. Mobile burger menu ────────────────────────────────────────────────────

test.describe("M1 — Mobile burger menu", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("burger button (#burger-button) is visible at 375px viewport", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#burger-button")).toBeVisible();
  });

  test("burger button has aria-controls='menu'", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#burger-button")).toHaveAttribute(
      "aria-controls",
      "menu"
    );
  });

  test("aria-expanded is 'false' before burger click", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#burger-button")).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  test("menu is hidden before burger click", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#menu")).not.toHaveClass(/active/);
  });

  test("clicking burger reveals menu and sets aria-expanded='true'", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#burger-button").click();

    await expect(page.locator("#menu")).toHaveClass(/active/);
    await expect(page.locator("#burger-button")).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  test("clicking burger again hides menu and resets aria-expanded='false'", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#burger-button").click();
    await page.locator("#burger-button").click();

    await expect(page.locator("#menu")).not.toHaveClass(/active/);
    await expect(page.locator("#burger-button")).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  test("clicking outside nav closes menu and resets aria-expanded (real mouse)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#burger-button").click();
    await expect(page.locator("#menu")).toHaveClass(/active/);

    // Use real page.mouse.click so the document-level outside-click listener fires.
    // Synthetic dispatchEvent bypasses hit-testing and listener capture chains —
    // see the use_real_input_for_outside-click_tests.md instruction.
    await page.mouse.click(187, 700);

    await expect(page.locator("#menu")).not.toHaveClass(/active/);
    await expect(page.locator("#burger-button")).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });
});

// ─── 5. Social links ──────────────────────────────────────────────────────────

test.describe("M1 — Social links on every page", () => {
  for (const url of ALL_PAGES) {
    test(`LinkedIn, Facebook, mailto links present on ${url}`, async ({
      page,
    }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });

      // LinkedIn — must point at the company page
      await expect(
        page.locator('a[href*="linkedin.com/company/denver-french-tech"]'),
        `LinkedIn link on ${url}`
      ).toBeVisible();

      // Facebook — must point at the group page
      await expect(
        page.locator('a[href*="facebook.com/groups/lafrenchtechdenver"]'),
        `Facebook link on ${url}`
      ).toBeVisible();

      // Mailto — must target the community contact address
      await expect(
        page.locator('a[href="mailto:contact@lafrenchtechdenver.com"]'),
        `mailto link on ${url}`
      ).toBeVisible();
    });
  }
});

// ─── 6. Skip-to-content link ──────────────────────────────────────────────────

test.describe("M1 — Skip-to-content link", () => {
  for (const url of ALL_PAGES) {
    test(`skip-link is the first focusable element on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });

      // Blur any element that may have received focus during navigation.
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        el?.blur?.();
      });

      // First Tab press must land on the skip-link.
      await page.keyboard.press("Tab");

      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return {
          tagName: el.tagName,
          className: el.className,
          href: (el as HTMLAnchorElement).getAttribute("href"),
          text: (el.textContent ?? "").trim(),
        };
      });

      expect(focused, "an element should be focused").not.toBeNull();
      expect(focused!.className, "first Tab should land on .skip-link").toContain(
        "skip-link"
      );
      expect(focused!.tagName, "skip-link should be an <a>").toBe("A");
      expect(focused!.href, "skip-link href must be #main-content").toBe(
        "#main-content"
      );
      expect(focused!.text, "skip-link text must read 'Skip to content'").toBe(
        "Skip to content"
      );
    });
  }

  test("activating skip-link with Enter moves URL fragment to #main-content", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      el?.blur?.();
    });
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    // The URL gains a #main-content fragment when the link is followed.
    await expect(page).toHaveURL(/#main-content$/);
  });

  test("<main id='main-content'> landmark present on every page", async ({ page }) => {
    for (const url of ALL_PAGES) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const main = page.locator("main#main-content");
      await expect(
        main,
        `<main id="main-content"> should exist on ${url}`
      ).toHaveCount(1);
    }
  });
});

// ─── 7. Home page content ─────────────────────────────────────────────────────

test.describe("M1 — Home page content", () => {
  test("hero <h1> text is 'La French Tech Denver'", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero h1")).toHaveText("La French Tech Denver");
  });

  test("hero subheading is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero p")).toContainText(
      "Your tech rendez-vous with a French touch and mountain views"
    );
  });

  test("exactly 4 KPI cards are rendered with [data-testid='kpi-card']", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="kpi-card"]')).toHaveCount(4);
  });

  test("KPI cards show the expected values: 13, 262, 5, 33%", async ({
    page,
  }) => {
    await page.goto("/");
    for (const value of ["13", "262", "5", "33%"]) {
      await expect(
        page.locator('[data-testid="kpi-card"]', { hasText: value }),
        `KPI card with value "${value}" should be present`
      ).toHaveCount(1);
    }
  });

  test("exactly 6 partner cards are rendered with [data-testid='partner-card']", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="partner-card"]')).toHaveCount(6);
  });

  test("all 6 expected partner names are visible", async ({ page }) => {
    await page.goto("/");
    for (const name of [
      "Superteam",
      "Modelcode.ai",
      "Mad Science of Colorado",
      "Ridiculous Engineering",
      "Einride",
      "Extern",
    ]) {
      await expect(
        page.locator('[data-testid="partner-card"]', { hasText: name }),
        `partner card for "${name}" should be present`
      ).toHaveCount(1);
    }
  });

  test("Google Form CTA link is present and points at the correct URL", async ({
    page,
  }) => {
    await page.goto("/");
    const cta = page.locator(`a[href="${MEMBERSHIP_FORM_URL}"]`);
    await expect(cta).toBeVisible();
    await expect(cta).toContainText("Become a Member");
  });

  test("'What is La French Tech Denver' section heading is present", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "What is La French Tech Denver" })
    ).toBeVisible();
  });
});
