/**
 * milestone3-content-collections.spec.ts
 *
 * E2E tests for Milestone 3: Astro Content Collections (board, partners, kpis, site)
 * replacing inline data across pages, plus the rebuilt About page and new components.
 *
 * Covers:
 * - Home page: 4 KPI cards (values: 13, 262, 5, 33%), 6 partner cards with outbound links
 * - About page: hero, mission/values cards, 7 board cards in defined order with photos
 * - is-grayscale CSS class on board portraits (no inline style="filter:...")
 * - SocialLinks reads from site.json (LinkedIn, Facebook, mailto)
 * - Membership-form CTA URL on home page comes from site.json
 * - All 6 nav links render correctly across pages
 */

import { test, expect } from "@playwright/test";

const EXPECTED_KPI_VALUES = ["13", "262", "5", "33%"];
const EXPECTED_KPI_LABELS = ["Companies", "People", "Nationalities", "Women"];

const EXPECTED_HOME_PARTNERS = [
  { name: "Superteam", url: /superteam/ },
  { name: "Modelcode.ai", url: /modelcode/ },
  { name: "Mad Science of Colorado", url: /madscience/ },
  { name: "Ridiculous Engineering", url: /ridiculousengineering/ },
  { name: "Einride", url: /einride/ },
  { name: "Extern", url: /extern/ },
];

// Sponsor-only partners must NOT appear on home page
const SPONSOR_ONLY_PARTNERS = ["Techstars", "Finmark"];

const EXPECTED_BOARD_MEMBERS = [
  "Ben Bouteille",
  "Baptiste Le Poittevin",
  "Patrizia Marzialli",
  "Sandrine Vohra",
  "Arthur Rio",
  "Clémence Viot",
  "Elina Hakobyan Roetynck",
];

const NAV_LINKS = [
  { text: "Home", href: "/index.html" },
  { text: "About us", href: "/about.html" },
  { text: "Companies & Sponsors", href: "/companies-sponsors.html" },
  { text: "Members Benefits", href: "/members-benefits.html" },
  { text: "Events", href: "/events.html" },
  { text: "Resources", href: "/resources.html" },
];

const MEMBERSHIP_FORM_URL =
  "https://docs.google.com/forms/d/1tpHwjsberWYWbVuiEy9S6CP44k0gxJuaFi9ha5QBIqM/viewform";

// ─── Home page: KPI cards ────────────────────────────────────────────────────

test.describe("Home page — KPI cards from kpis collection", () => {
  test("shows exactly 4 KPI cards", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator('[data-testid="kpi-card"]');
    await expect(cards).toHaveCount(EXPECTED_KPI_VALUES.length);
  });

  test("each KPI value is rendered", async ({ page }) => {
    await page.goto("/");
    for (const value of EXPECTED_KPI_VALUES) {
      await expect(
        page.locator('[data-testid="kpi-card"]', { hasText: value })
      ).toHaveCount(1);
    }
  });

  test("KPI cards contain both value and label", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator('[data-testid="kpi-card"]');
    for (let i = 0; i < EXPECTED_KPI_VALUES.length; i++) {
      const card = cards.nth(i);
      // Card must contain at least one of the expected values
      const cardText = await card.textContent();
      const hasValue = EXPECTED_KPI_VALUES.some((v) => cardText?.includes(v));
      const hasLabel = EXPECTED_KPI_LABELS.some((l) => cardText?.includes(l));
      expect(hasValue, `KPI card ${i} has a value`).toBe(true);
      expect(hasLabel, `KPI card ${i} has a label`).toBe(true);
    }
  });
});

// ─── Home page: Partner cards ────────────────────────────────────────────────

test.describe("Home page — partner cards from partners collection", () => {
  test("shows exactly 6 home-featured partner cards", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator('[data-testid="partner-card"]');
    await expect(cards).toHaveCount(EXPECTED_HOME_PARTNERS.length);
  });

  test("each expected partner name is visible", async ({ page }) => {
    await page.goto("/");
    for (const partner of EXPECTED_HOME_PARTNERS) {
      await expect(
        page.locator('[data-testid="partner-card"]', { hasText: partner.name })
      ).toHaveCount(1);
    }
  });

  test("sponsor-only partners do not appear on home page", async ({ page }) => {
    await page.goto("/");
    for (const name of SPONSOR_ONLY_PARTNERS) {
      await expect(
        page.locator('[data-testid="partner-card"]', { hasText: name })
      ).toHaveCount(0);
    }
  });

  test("each partner card wraps content in an outbound link", async ({
    page,
  }) => {
    await page.goto("/");
    const cards = page.locator('[data-testid="partner-card"]');
    const count = await cards.count();
    expect(count).toBe(6);
    for (let i = 0; i < count; i++) {
      const link = cards.nth(i).locator("a");
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener");
      const href = await link.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);
    }
  });

  test("each partner card has an img with non-empty alt text", async ({
    page,
  }) => {
    await page.goto("/");
    const cards = page.locator('[data-testid="partner-card"]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const img = cards.nth(i).locator("img");
      const alt = await img.getAttribute("alt");
      expect(alt).toBeTruthy();
      expect(alt!.length).toBeGreaterThan(0);
    }
  });
});

// ─── Home page: membership CTA from site.json ────────────────────────────────

test.describe("Home page — membership CTA from site.json", () => {
  test("Become a Member link points to the Google Form URL", async ({
    page,
  }) => {
    await page.goto("/");
    const cta = page.locator('a[href*="google.com/forms"]');
    await expect(cta).toHaveCount(1);
    await expect(cta).toHaveAttribute("href", MEMBERSHIP_FORM_URL);
  });

  test("Become a Member CTA is visible and opens in new tab", async ({
    page,
  }) => {
    await page.goto("/");
    const cta = page.locator('a[href*="google.com/forms"]');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("target", "_blank");
  });
});

// ─── About page: hero and mission/values ─────────────────────────────────────

test.describe("About page — hero and mission/values cards", () => {
  test("page title includes About", async ({ page }) => {
    await page.goto("/about.html");
    await expect(page).toHaveTitle(/About/i);
  });

  test("hero heading is visible", async ({ page }) => {
    await page.goto("/about.html");
    await expect(page.locator("h1")).toContainText("About La French Tech Denver");
  });

  test("hero subtitle text is visible", async ({ page }) => {
    await page.goto("/about.html");
    await expect(page.locator("section.hero p")).toContainText(
      "curated support community"
    );
  });

  test("Mission card is rendered", async ({ page }) => {
    await page.goto("/about.html");
    await expect(page.locator(".card", { hasText: "Our Mission" })).toBeVisible();
  });

  test("Values card is rendered", async ({ page }) => {
    await page.goto("/about.html");
    await expect(page.locator(".card", { hasText: "Our Values" })).toBeVisible();
  });

  test("Meet the Board heading is present", async ({ page }) => {
    await page.goto("/about.html");
    await expect(page.locator("h2", { hasText: "Meet the Board" })).toBeVisible();
  });
});

// ─── About page: board grid from board collection ────────────────────────────

test.describe("About page — board grid from board collection", () => {
  test("shows exactly 7 board cards", async ({ page }) => {
    await page.goto("/about.html");
    const cards = page.locator('[data-testid="board-card"]');
    await expect(cards).toHaveCount(EXPECTED_BOARD_MEMBERS.length);
  });

  test("board cards render in the correct order", async ({ page }) => {
    await page.goto("/about.html");
    const cards = page.locator('[data-testid="board-card"]');
    for (let i = 0; i < EXPECTED_BOARD_MEMBERS.length; i++) {
      await expect(cards.nth(i)).toContainText(EXPECTED_BOARD_MEMBERS[i]);
    }
  });

  test("each board card has a photo with correct alt text", async ({
    page,
  }) => {
    await page.goto("/about.html");
    const cards = page.locator('[data-testid="board-card"]');
    const count = await cards.count();
    expect(count).toBe(7);
    for (let i = 0; i < count; i++) {
      const img = cards.nth(i).locator("img");
      await expect(img).toHaveAttribute("alt", EXPECTED_BOARD_MEMBERS[i]);
    }
  });

  test("board photos use is-grayscale CSS class, not inline filter style", async ({
    page,
  }) => {
    await page.goto("/about.html");
    const cards = page.locator('[data-testid="board-card"]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      // Must have is-grayscale class
      await expect(card).toHaveClass(/is-grayscale/);
      // Must NOT have inline filter style on the image
      const img = card.locator("img");
      const styleAttr = await img.getAttribute("style");
      expect(styleAttr ?? "").not.toMatch(/filter/i);
    }
  });

  test("each board card shows a role/title", async ({ page }) => {
    await page.goto("/about.html");
    const cards = page.locator('[data-testid="board-card"]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const note = cards.nth(i).locator(".note");
      const text = await note.textContent();
      expect(text?.trim().length, `Board card ${i} has a role`).toBeGreaterThan(0);
    }
  });
});

// ─── Navigation: 6 links across all pages ────────────────────────────────────

test.describe("Navigation — 6 links render correctly on all pages", () => {
  for (const page_url of [
    "/",
    "/about.html",
    "/companies-sponsors.html",
    "/members-benefits.html",
    "/events.html",
    "/resources.html",
  ]) {
    test(`nav has 6 page links on ${page_url}`, async ({ page }) => {
      await page.goto(page_url);
      const navPageLinks = page.locator('nav a[href^="/"]');
      // Expect exactly 6 internal nav links
      await expect(navPageLinks).toHaveCount(6);
    });

    test(`all nav link hrefs are correct on ${page_url}`, async ({ page }) => {
      await page.goto(page_url);
      for (const link of NAV_LINKS) {
        const el = page.locator(`nav a[href="${link.href}"]`);
        await expect(el).toHaveCount(1);
        await expect(el).toBeVisible();
      }
    });
  }
});

// ─── Social links: read from site.json ───────────────────────────────────────

test.describe("SocialLinks — read from site.json", () => {
  const pages = ["/", "/about.html"];

  for (const page_url of pages) {
    test(`LinkedIn link is present and correct on ${page_url}`, async ({
      page,
    }) => {
      await page.goto(page_url);
      const linkedin = page.locator(
        'a[href*="linkedin.com/company/denver-french-tech"]'
      );
      await expect(linkedin).toHaveCount(1);
      await expect(linkedin).toHaveAttribute("target", "_blank");
    });

    test(`Facebook link is present and correct on ${page_url}`, async ({
      page,
    }) => {
      await page.goto(page_url);
      const facebook = page.locator(
        'a[href*="facebook.com/groups/lafrenchtechdenver"]'
      );
      await expect(facebook).toHaveCount(1);
      await expect(facebook).toHaveAttribute("target", "_blank");
    });

    test(`mailto link is present on ${page_url}`, async ({ page }) => {
      await page.goto(page_url);
      const mailto = page.locator('a[href^="mailto:contact@lafrenchtechdenver.com"]');
      await expect(mailto).toHaveCount(1);
    });
  }
});

// ─── Theme toggle ─────────────────────────────────────────────────────────────

test.describe("Theme toggle", () => {
  test("clicking theme toggle switches to dark mode", async ({ page }) => {
    await page.goto("/");
    // Initial state should not be dark (or could be - check toggle works)
    const toggle = page.locator("#theme-toggle, button[aria-label*='theme' i], button[aria-label*='Toggle theme' i]").first();
    await toggle.click();
    const theme = await page.evaluate(
      () => document.documentElement.dataset.theme
    );
    expect(theme).toBe("dark");
  });

  test("theme persists after reload via localStorage", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("#theme-toggle, button[aria-label*='theme' i], button[aria-label*='Toggle theme' i]").first();
    await toggle.click();
    // Verify dark mode set
    const themeBefore = await page.evaluate(
      () => document.documentElement.dataset.theme
    );
    expect(themeBefore).toBe("dark");
    // Reload and confirm persistence
    await page.reload();
    const themeAfter = await page.evaluate(
      () => document.documentElement.dataset.theme
    );
    expect(themeAfter).toBe("dark");
  });
});

// ─── Mobile burger menu ───────────────────────────────────────────────────────

test.describe("Mobile burger menu", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("burger button is visible at 375px viewport", async ({ page }) => {
    await page.goto("/");
    // Nav.astro renders: <button class="burger" id="burger-button" aria-label="Toggle menu">
    const burger = page.locator("#burger-button");
    await expect(burger).toBeVisible();
  });

  test("clicking burger button adds active class to the menu", async ({
    page,
  }) => {
    await page.goto("/");
    // Nav.astro renders: <nav class="menu" id="menu">
    const burger = page.locator("#burger-button");
    const menu = page.locator("#menu");
    // Before click: menu should NOT have active class
    await expect(menu).not.toHaveClass(/active/);
    await burger.click();
    await page.waitForTimeout(300);
    // After click: menu should have active class
    await expect(menu).toHaveClass(/active/);
  });
});
