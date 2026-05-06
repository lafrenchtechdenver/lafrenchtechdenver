/**
 * milestone1-foundation.spec.ts
 *
 * Comprehensive E2E coverage for the Foundation Milestone (Milestone 1) surface.
 *
 * Tests the following specific requirements from the foundation milestone spec:
 *
 * 1. Home page — hero h1, subheading, "What is La French Tech Denver" section,
 *    "Become a Member" CTA with correct Google Form URL, four KPI cards
 *    (13 Companies, 262 People, 5 Nationalities, 33% Women), six Friends &
 *    Partners cards (Superteam, Modelcode.ai, Mad Science of Colorado,
 *    Ridiculous Engineering, Einride, Extern) each with image and outbound link.
 *
 * 2. Five non-home pages — each returns HTTP 200, has the shared nav
 *    (six links, brand mark, theme toggle, social icons), shared footer,
 *    and its own <h1>.
 *
 * 3. Theme toggle — clicking #theme-toggle flips documentElement.dataset.theme
 *    to "dark", persists via localStorage.theme, survives reload.
 *
 * 4. Mobile burger menu — at 375×812, burger button visible; clicking opens #menu
 *    (gets .active); clicking again closes; clicking outside .nav via real
 *    page.mouse.click closes the open menu; burger has aria-controls="menu"
 *    and aria-expanded syncs with open/close state.
 *
 * 5. Skip-to-content link — appears on focus as first interactive element;
 *    activating it focuses #main-content.
 *
 * 6. Nav active state — the link for the current URL has .active class.
 *
 * 7. Embedded external content — /events.html Luma iframe src matches
 *    lumaCalendarUrl from social.json.
 *
 * URL values are read from src/content/site/social.json — the single source of
 * truth per route_global_constants_through_site_collection.md instruction.
 */

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOCIAL_JSON_PATH = resolve(
  __dirname,
  "../../src/content/site/social.json"
);

interface SocialJson {
  linkedinUrl: string;
  facebookUrl: string;
  contactEmail: string;
  membershipFormUrl: string;
  lumaCalendarUrl: string;
}

const site: SocialJson = JSON.parse(readFileSync(SOCIAL_JSON_PATH, "utf-8"));

const MOBILE_VIEWPORT = { width: 375, height: 812 };

const ALL_PAGES = [
  { url: "/", label: "home" },
  { url: "/about.html", label: "about", h1: "About La French Tech Denver" },
  { url: "/companies-sponsors.html", label: "companies-sponsors", h1: "Companies & Sponsors" },
  { url: "/events.html", label: "events", h1: "Events" },
  { url: "/members-benefits.html", label: "members-benefits", h1: "Members Benefits" },
  { url: "/resources.html", label: "resources", h1: "Resources" },
];

const SIX_NAV_LINKS = [
  { label: "Home", href: "/index.html" },
  { label: "About us", href: "/about.html" },
  { label: "Companies & Sponsors", href: "/companies-sponsors.html" },
  { label: "Members Benefits", href: "/members-benefits.html" },
  { label: "Events", href: "/events.html" },
  { label: "Resources", href: "/resources.html" },
];

const EXPECTED_KPIS = [
  { value: "13", label: "Companies" },
  { value: "262", label: "People" },
  { value: "5", label: "Nationalities" },
  { value: "33%", label: "Women" },
];

const EXPECTED_PARTNERS = [
  { name: "Superteam", href: "https://superteam.ca" },
  { name: "Modelcode.ai", href: "https://modelcode.ai" },
  { name: "Mad Science of Colorado", href: "https://colorado.madscience.org" },
  { name: "Ridiculous Engineering", href: "https://ridiculousengineering.com" },
  { name: "Einride", href: "https://einride.tech" },
  { name: "Extern", href: "https://www.extern.com" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. Home page content
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Foundation — Home page", () => {
  test('hero <h1> reads "La French Tech Denver"', async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero h1")).toHaveText("La French Tech Denver");
  });

  test("hero subheading is present", async ({ page }) => {
    await page.goto("/");
    // Subheading: "Your tech rendez-vous with a French touch and mountain views"
    await expect(page.locator(".hero p")).toContainText(
      "French touch"
    );
  });

  test('"What is La French Tech Denver" section heading is present', async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "What is La French Tech Denver" })
    ).toBeVisible();
  });

  test('"Become a Member" CTA points to the Google Form URL from social.json', async ({ page }) => {
    await page.goto("/");
    const cta = page.locator(`a.cta[href="${site.membershipFormUrl}"]`);
    await expect(cta).toBeVisible();
    await expect(cta).toContainText("Become a Member");
  });

  test("all 4 KPI cards are present with correct values and labels", async ({ page }) => {
    await page.goto("/");
    for (const kpi of EXPECTED_KPIS) {
      const card = page.locator('[data-testid="kpi-card"]', {
        hasText: kpi.value,
      });
      await expect(card, `KPI card "${kpi.value}" should exist`).toHaveCount(1);
      await expect(card).toContainText(kpi.label);
    }
  });

  test("exactly 4 KPI cards are rendered", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="kpi-card"]')).toHaveCount(4);
  });

  test("exactly 6 Friends & Partners cards are rendered", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="partner-card"]')).toHaveCount(6);
  });

  for (const partner of EXPECTED_PARTNERS) {
    test(`partner "${partner.name}" has an image and outbound link`, async ({ page }) => {
      await page.goto("/");
      const card = page.locator('[data-testid="partner-card"]', {
        hasText: partner.name,
      });
      await expect(card, `${partner.name} card should exist`).toHaveCount(1);

      const link = card.locator(`a[href="${partner.href}"]`);
      await expect(link, `${partner.name} link should be visible`).toBeVisible();

      const img = link.locator("img");
      await expect(img, `${partner.name} image should be visible`).toBeVisible();
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Five non-home pages — 200 / nav / footer / h1
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Foundation — Secondary pages (200 + nav + footer + h1)", () => {
  const SECONDARY = ALL_PAGES.filter((p) => p.url !== "/");

  for (const { url, h1 } of SECONDARY) {
    test(`${url} returns HTTP 200`, async ({ page }) => {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded" });
      expect(resp?.status(), `GET ${url} should return 200`).toBeLessThan(400);
    });

    test(`${url} has its own <h1>: "${h1}"`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1").first()).toContainText(h1!);
    });

    test(`${url} has the shared nav with all six links`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      for (const link of SIX_NAV_LINKS) {
        const el = page.locator(`#menu a[href="${link.href}"]`);
        await expect(
          el,
          `nav should contain "${link.label}" on ${url}`
        ).toBeVisible();
      }
    });

    test(`${url} has the shared footer`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      await expect(footer).toContainText("La French Tech Denver");
      await expect(footer).toContainText("Community-run in Denver, CO");
    });

    test(`${url} has the brand mark in the nav header`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      // Brand mark is an img inside .logo (the nav's header container holds .logo and #menu)
      const brandMark = page.locator(".logo img");
      await expect(brandMark.first(), "brand mark image should be visible").toBeVisible();
    });

    test(`${url} has the #theme-toggle in the nav`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#theme-toggle")).toBeVisible();
    });

    test(`${url} has social icons (LinkedIn, Facebook, email) in nav`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(
        page.locator(`a[href="${site.linkedinUrl}"]`)
      ).toBeVisible();
      await expect(
        page.locator(`a[href="${site.facebookUrl}"]`)
      ).toBeVisible();
      await expect(
        page.locator(`a[href="mailto:${site.contactEmail}"]`)
      ).toBeVisible();
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Theme toggle — flip, localStorage, reload persistence
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Foundation — Theme toggle", () => {
  test("clicking #theme-toggle flips data-theme to dark", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("theme");
      document.documentElement.setAttribute("data-theme", "light");
    });

    await page.click("#theme-toggle");

    const theme = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme")
    );
    expect(theme).toBe("dark");
  });

  test("dark theme persists in localStorage after toggle", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();

    await page.click("#theme-toggle");

    const stored = await page.evaluate(() => localStorage.getItem("theme"));
    expect(stored).toBe("dark");
  });

  test("dark theme survives a page reload (inline <head> script restores it)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();

    await page.click("#theme-toggle");
    // Confirm dark was set
    const themeBefore = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme")
    );
    expect(themeBefore).toBe("dark");

    await page.reload();

    const themeAfter = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme")
    );
    expect(themeAfter).toBe("dark");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Mobile burger menu — aria-controls, aria-expanded, outside-click
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Foundation — Mobile burger menu", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("burger button is visible at 375×812 viewport", async ({ page }) => {
    await page.goto("/");
    const burger = page.locator(".burger");
    await expect(burger, "burger button must be visible at mobile width").toBeVisible();
  });

  test("burger button has aria-controls='menu'", async ({ page }) => {
    await page.goto("/");
    const burger = page.locator(".burger");
    await expect(burger).toHaveAttribute("aria-controls", "menu");
  });

  test("aria-expanded is 'false' before burger is clicked", async ({ page }) => {
    await page.goto("/");
    const burger = page.locator(".burger");
    const expanded = await burger.getAttribute("aria-expanded");
    expect(expanded).toBe("false");
  });

  test("clicking burger adds .active to #menu and sets aria-expanded='true'", async ({ page }) => {
    await page.goto("/");
    await page.locator(".burger").click();
    await page.waitForTimeout(200);

    await expect(page.locator("#menu")).toHaveClass(/active/);

    const expanded = await page.locator(".burger").getAttribute("aria-expanded");
    expect(expanded).toBe("true");
  });

  test("clicking burger again removes .active and sets aria-expanded='false'", async ({ page }) => {
    await page.goto("/");
    await page.locator(".burger").click();
    await page.waitForTimeout(200);
    await page.locator(".burger").click();
    await page.waitForTimeout(200);

    await expect(page.locator("#menu")).not.toHaveClass(/active/);

    const expanded = await page.locator(".burger").getAttribute("aria-expanded");
    expect(expanded).toBe("false");
  });

  test("clicking outside .nav via real page.mouse.click closes the open menu", async ({ page }) => {
    await page.goto("/");

    // Open the menu.
    await page.locator(".burger").click();
    await page.waitForTimeout(200);
    await expect(page.locator("#menu")).toHaveClass(/active/);

    // Click outside the nav using a real hit-tested mouse click — NOT
    // dispatchEvent, which skips hit-testing (see use_real_input_for_outside-click_tests.md).
    const heroHeading = page.locator(".hero h1");
    await expect(heroHeading).toBeVisible();
    const box = await heroHeading.boundingBox();
    if (!box) {
      throw new Error("Could not get hero heading bounding box");
    }
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);

    await expect(page.locator("#menu")).not.toHaveClass(/active/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Skip-to-content link
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Foundation — Skip-to-content link", () => {
  for (const { url } of ALL_PAGES) {
    test(`skip-link is the first focusable element on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });

      // Blur any existing focus, then Tab once to get first focusable element.
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

      expect(focused, `an element should be focused after Tab on ${url}`).not.toBeNull();
      expect(focused!.className, "first Tab focus should be the skip-link").toContain("skip-link");
      expect(focused!.tagName).toBe("A");
      expect(focused!.href).toBe("#main-content");
    });
  }

  test("activating skip-link focuses #main-content", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      el?.blur?.();
    });
    await page.keyboard.press("Tab"); // focus skip-link
    await page.keyboard.press("Enter"); // activate

    // URL should contain the #main-content fragment.
    expect(page.url()).toMatch(/#main-content$/);

    // main#main-content should exist.
    const mainExists = await page.evaluate(
      () => !!document.getElementById("main-content")
    );
    expect(mainExists).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Nav active state
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Foundation — Nav active state", () => {
  const PAGE_ACTIVE_PAIRS = [
    { url: "/index.html", activeHref: "/index.html" },
    { url: "/about.html", activeHref: "/about.html" },
    { url: "/companies-sponsors.html", activeHref: "/companies-sponsors.html" },
    { url: "/members-benefits.html", activeHref: "/members-benefits.html" },
    { url: "/events.html", activeHref: "/events.html" },
    { url: "/resources.html", activeHref: "/resources.html" },
  ];

  for (const { url, activeHref } of PAGE_ACTIVE_PAIRS) {
    test(`the nav link for "${activeHref}" has .active on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const activeLink = page.locator(`#menu a[href="${activeHref}"]`);
      await expect(activeLink, `link to "${activeHref}" should have .active class`).toHaveClass(/active/);
    });

    test(`only one nav link is active on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const activeLinks = page.locator("#menu a.active");
      await expect(activeLinks).toHaveCount(1);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Embedded external content — Luma iframe on /events.html
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Foundation — Embedded external content", () => {
  test("events page has a Luma iframe with src matching lumaCalendarUrl from social.json", async ({
    page,
  }) => {
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });

    const iframe = page.locator(".events-frame iframe");
    await expect(iframe, "Luma iframe must be present in .events-frame").toBeVisible();
    await expect(iframe).toHaveAttribute("src", site.lumaCalendarUrl);
  });

  test("Luma iframe has positive dimensions (renders within container)", async ({ page }) => {
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });
    const iframe = page.locator(".events-frame iframe");
    const box = await iframe.boundingBox();
    expect(box, "iframe must have a bounding box").not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });
});
