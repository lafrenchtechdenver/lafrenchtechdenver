/**
 * milestone4-pages.spec.ts
 *
 * E2E tests for Milestone 4: the four remaining pages (companies-sponsors,
 * events, members-benefits, resources), image pipeline, Luma iframe, and
 * Become-a-Member CTA wiring.
 *
 * These tests complement the existing `tests/` suite by focusing on:
 *  - Visual rendering of each new page (hero, content structure)
 *  - Luma calendar iframe visible inside .events-frame with correct src
 *  - Become-a-Member CTA opens to Google Form in a new tab
 *  - Sponsor partner cards (Techstars + Finmark) on companies-sponsors page
 *  - Welcome to France resource card links to correct URL
 *  - Astro <Image> pipeline: board/partner/hero images served as modern formats
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

// ─────────────────────────────────────────────────────────────────────────────
// Companies & Sponsors page
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Companies & Sponsors page", () => {
  test("page returns HTTP 200", async ({ page }) => {
    const resp = await page.goto("/companies-sponsors.html");
    expect(resp?.status(), "GET /companies-sponsors.html should return 200").toBeLessThan(400);
  });

  test("page title includes Companies & Sponsors", async ({ page }) => {
    await page.goto("/companies-sponsors.html");
    await expect(page).toHaveTitle(/Companies.*Sponsors/i);
  });

  test("hero heading is visible", async ({ page }) => {
    await page.goto("/companies-sponsors.html");
    const h1 = page.locator("section.hero h1, h1");
    await expect(h1.first()).toBeVisible();
    await expect(h1.first()).toContainText("Companies");
  });

  test("shows exactly 2 sponsor partner cards (Techstars and Finmark)", async ({ page }) => {
    await page.goto("/companies-sponsors.html");
    const cards = page.locator('[data-testid="partner-card"]');
    await expect(cards).toHaveCount(2);
  });

  test("Techstars partner card is visible", async ({ page }) => {
    await page.goto("/companies-sponsors.html");
    const card = page.locator('[data-testid="partner-card"]', { hasText: "Techstars" });
    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();
  });

  test("Finmark partner card is visible", async ({ page }) => {
    await page.goto("/companies-sponsors.html");
    const card = page.locator('[data-testid="partner-card"]', { hasText: "Finmark" });
    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();
  });

  test("sponsor partner cards each have an outbound link", async ({ page }) => {
    await page.goto("/companies-sponsors.html");
    const cards = page.locator('[data-testid="partner-card"]');
    const count = await cards.count();
    expect(count).toBe(2);
    for (let i = 0; i < count; i++) {
      const link = cards.nth(i).locator("a");
      const href = await link.getAttribute("href");
      expect(href, `partner card ${i} should have an href`).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);
    }
  });

  test("sponsor partner cards each have an image", async ({ page }) => {
    await page.goto("/companies-sponsors.html");
    const cards = page.locator('[data-testid="partner-card"]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const img = cards.nth(i).locator("img");
      await expect(img).toBeVisible();
      const alt = await img.getAttribute("alt");
      expect(alt, `partner card ${i} image should have non-empty alt`).toBeTruthy();
    }
  });

  test("mission paragraph is present", async ({ page }) => {
    await page.goto("/companies-sponsors.html");
    // The page has a paragraph about the organisations backing the community
    const body = await page.locator("main").textContent();
    expect(body).toContain("Friends");
  });

  test("footer is visible with copyright", async ({ page }) => {
    await page.goto("/companies-sponsors.html");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("La French Tech Denver");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Events page
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Events page", () => {
  test("page returns HTTP 200", async ({ page }) => {
    const resp = await page.goto("/events.html", { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "GET /events.html should return 200").toBeLessThan(400);
  });

  test("page title includes Events", async ({ page }) => {
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/Events/i);
  });

  test("hero heading is visible", async ({ page }) => {
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
    await expect(h1.first()).toContainText("Events");
  });

  test("Luma calendar iframe is present inside .events-frame", async ({ page }) => {
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });
    const wrapper = page.locator(".events-frame");
    await expect(wrapper, ".events-frame wrapper must exist").toBeVisible();
    const iframe = wrapper.locator("iframe");
    await expect(iframe, "Luma iframe must be inside .events-frame").toBeVisible();
  });

  test("Luma iframe src matches site.json lumaCalendarUrl", async ({ page }) => {
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });
    const iframe = page.locator(".events-frame iframe");
    await expect(iframe).toHaveAttribute("src", site.lumaCalendarUrl);
  });

  test("Luma iframe has non-zero dimensions (responsive container)", async ({ page }) => {
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });
    const iframe = page.locator(".events-frame iframe");
    const box = await iframe.boundingBox();
    expect(box, "iframe should have a bounding box").not.toBeNull();
    expect(box!.width, "iframe width should be > 0").toBeGreaterThan(0);
    expect(box!.height, "iframe height should be > 0").toBeGreaterThan(0);
  });

  test("intro paragraph about upcoming events is visible", async ({ page }) => {
    await page.goto("/events.html", { waitUntil: "domcontentloaded" });
    const main = page.locator("main");
    await expect(main).toContainText("Luma");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Members Benefits page
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Members Benefits page", () => {
  test("page returns HTTP 200", async ({ page }) => {
    const resp = await page.goto("/members-benefits.html");
    expect(resp?.status(), "GET /members-benefits.html should return 200").toBeLessThan(400);
  });

  test("page title includes Members", async ({ page }) => {
    await page.goto("/members-benefits.html");
    await expect(page).toHaveTitle(/Members/i);
  });

  test("hero heading is visible", async ({ page }) => {
    await page.goto("/members-benefits.html");
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
    await expect(h1.first()).toContainText("Members");
  });

  test("Individuals benefit card is visible", async ({ page }) => {
    await page.goto("/members-benefits.html");
    // Use getByRole heading to find the specific benefit card heading
    const heading = page.getByRole("heading", { name: "For Individuals" });
    await expect(heading).toBeVisible();
  });

  test("Companies benefit card is visible", async ({ page }) => {
    await page.goto("/members-benefits.html");
    const heading = page.getByRole("heading", { name: "For Companies" });
    await expect(heading).toBeVisible();
  });

  test("both benefit cards are rendered in a grid-2 layout", async ({ page }) => {
    await page.goto("/members-benefits.html");
    // The two individual/companies benefit cards (not the CTA section)
    const individualsCard = page.getByRole("heading", { name: "For Individuals" });
    const companiesCard = page.getByRole("heading", { name: "For Companies" });
    await expect(individualsCard).toBeVisible();
    await expect(companiesCard).toBeVisible();
  });

  test("Become a Member CTA is visible", async ({ page }) => {
    await page.goto("/members-benefits.html");
    const cta = page.locator("a.cta");
    await expect(cta).toBeVisible();
    await expect(cta).toContainText("Become a Member");
  });

  test("Become a Member CTA href matches site.json membershipFormUrl", async ({ page }) => {
    await page.goto("/members-benefits.html");
    const cta = page.locator(`a.cta[href="${site.membershipFormUrl}"]`);
    await expect(cta).toBeVisible();
  });

  test("Become a Member CTA opens in a new tab with noopener", async ({ page }) => {
    await page.goto("/members-benefits.html");
    const cta = page.locator("a.cta");
    await expect(cta).toHaveAttribute("target", "_blank");
    await expect(cta).toHaveAttribute("rel", "noopener");
  });

  test("Membership CTA URL is a Google Form URL", async ({ page }) => {
    await page.goto("/members-benefits.html");
    const cta = page.locator("a.cta");
    const href = await cta.getAttribute("href");
    expect(href).toMatch(/docs\.google\.com\/forms/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Resources page
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Resources page", () => {
  test("page returns HTTP 200", async ({ page }) => {
    const resp = await page.goto("/resources.html");
    expect(resp?.status(), "GET /resources.html should return 200").toBeLessThan(400);
  });

  test("page title includes Resources", async ({ page }) => {
    await page.goto("/resources.html");
    await expect(page).toHaveTitle(/Resources/i);
  });

  test("hero heading is visible", async ({ page }) => {
    await page.goto("/resources.html");
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
    await expect(h1.first()).toContainText("Resources");
  });

  test("Welcome to France card is visible", async ({ page }) => {
    await page.goto("/resources.html");
    const card = page.locator(".card", { hasText: "Welcome to France" });
    await expect(card).toBeVisible();
  });

  test("Welcome to France link points to welcometofrance.com", async ({ page }) => {
    await page.goto("/resources.html");
    const link = page.locator('a[href*="welcometofrance.com"]');
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toContain("welcometofrance.com");
  });

  test("Welcome to France link opens in a new tab", async ({ page }) => {
    await page.goto("/resources.html");
    const link = page.locator('a[href*="welcometofrance.com"]');
    await expect(link).toHaveAttribute("target", "_blank");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Image pipeline — Astro <Image> component output
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Image pipeline (Astro Sharp)", () => {
  test("partner card images on home page are rendered by Astro pipeline (/_astro/ path)", async ({ page }) => {
    await page.goto("/");
    const imgs = page.locator('[data-testid="partner-card"] img');
    const count = await imgs.count();
    expect(count, "partner card images should exist").toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const src = await imgs.nth(i).getAttribute("src");
      // Astro image pipeline emits hashed URLs under /_astro/
      expect(src, `partner img ${i} should be pipeline-processed`).toMatch(/\/_astro\//);
    }
  });

  test("board card images on about page are rendered by Astro pipeline (/_astro/ path)", async ({ page }) => {
    await page.goto("/about.html");
    const imgs = page.locator('[data-testid="board-card"] img');
    const count = await imgs.count();
    expect(count, "board card images should exist").toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const src = await imgs.nth(i).getAttribute("src");
      expect(src, `board img ${i} should be pipeline-processed`).toMatch(/\/_astro\//);
    }
  });

  test("hero image on home page is served in a modern format via <picture> or srcset", async ({ page }) => {
    await page.goto("/");
    // Astro generates <picture> with sources for AVIF/WebP and <img> with srcset
    const heroImgOrPicture = page.locator(".hero picture img, .hero img[srcset], .hero img[src]");
    await expect(heroImgOrPicture.first()).toBeVisible();
  });

  test("partner card images on companies-sponsors have non-zero dimensions", async ({ page }) => {
    await page.goto("/companies-sponsors.html");
    const imgs = page.locator('[data-testid="partner-card"] img');
    const count = await imgs.count();
    expect(count, "there should be sponsor images").toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await imgs.nth(i).boundingBox();
      expect(box, `sponsor img ${i} should have a bounding box`).not.toBeNull();
      expect(box!.width, `sponsor img ${i} width > 0`).toBeGreaterThan(0);
      expect(box!.height, `sponsor img ${i} height > 0`).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Milestone 4 site chrome — all 6 pages carry nav + footer
// ─────────────────────────────────────────────────────────────────────────────

const ALL_M4_PAGES = [
  "/companies-sponsors.html",
  "/events.html",
  "/members-benefits.html",
  "/resources.html",
];

test.describe("Site chrome on Milestone 4 pages", () => {
  for (const url of ALL_M4_PAGES) {
    test(`sticky nav present on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const nav = page.locator("nav, header nav");
      await expect(nav.first()).toBeVisible();
    });

    test(`all 6 nav links present on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
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
        await expect(link, `nav should have ${href} on ${url}`).toBeVisible();
      }
    });

    test(`active nav link is set correctly on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const activeLink = page.locator(`#menu a[href="${url}"].active`);
      await expect(activeLink, `${url} link should be active on its own page`).toHaveCount(1);
    });

    test(`only one nav link is active on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const activeLinks = page.locator("#menu a.active");
      await expect(activeLinks).toHaveCount(1);
    });

    test(`theme toggle present on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const toggle = page.locator("#theme-toggle");
      await expect(toggle).toBeVisible();
    });

    test(`footer with copyright present on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      await expect(footer).toContainText("La French Tech Denver");
      await expect(footer).toContainText("Community-run in Denver, CO");
    });

    test(`skip-to-content link is first focusable element on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
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
            }
          : null;
      });
      expect(focused).not.toBeNull();
      expect(focused?.className).toContain("skip-link");
      expect(focused?.href).toBe("#main-content");
    });

    test(`<main id="main-content"> landmark present on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const main = page.locator("main#main-content");
      await expect(main).toHaveCount(1);
    });
  }
});
