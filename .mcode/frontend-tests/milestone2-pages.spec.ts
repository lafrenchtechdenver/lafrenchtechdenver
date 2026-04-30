import { expect, test } from "@playwright/test";

/**
 * milestone2-pages.spec.ts — Page-level verification for Milestone 2.
 *
 * Tests that all six pages respond 200, have the expected structure,
 * and the homepage contains the key content elements described in the
 * milestone specification.
 */

const ALL_PAGES = [
  { url: "/", title: "La French Tech Denver" },
  { url: "/index.html", title: "La French Tech Denver" },
  { url: "/about.html", title: "About us" },
  { url: "/companies-sponsors.html", title: "Companies & Sponsors" },
  { url: "/events.html", title: "Events" },
  { url: "/members-benefits.html", title: "Members Benefits" },
  { url: "/resources.html", title: "Resources" },
];

test.describe("Page availability", () => {
  for (const { url, title } of ALL_PAGES) {
    test(`${url} returns 200 and has expected title`, async ({ page }) => {
      const response = await page.goto(url);
      expect(response?.status(), `GET ${url} should return 200`).toBe(200);
      await expect(page).toHaveTitle(new RegExp(title, "i"));
    });
  }
});

test.describe("Homepage content", () => {
  test("hero heading reads 'La French Tech Denver'", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero h1")).toHaveText("La French Tech Denver");
  });

  test("hero has a subtitle paragraph", async ({ page }) => {
    await page.goto("/");
    const heroParagraph = page.locator(".hero p");
    await expect(heroParagraph).toBeVisible();
    await expect(heroParagraph).toContainText("French touch");
  });

  test("'What is La French Tech Denver' section is present", async ({
    page,
  }) => {
    await page.goto("/");
    const heading = page.locator("h2", {
      hasText: "What is La French Tech Denver",
    });
    await expect(heading).toBeVisible();
  });

  test("Google Form CTA 'Become a Member' is present and links to the form", async ({
    page,
  }) => {
    await page.goto("/");
    const cta = page.locator('a.cta', { hasText: "Become a Member" });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toContain("docs.google.com/forms");
  });

  test("exactly 4 KPI cards are rendered", async ({ page }) => {
    await page.goto("/");
    const kpiCards = page.locator(".kpi");
    await expect(kpiCards).toHaveCount(4);
  });

  test("KPI values are correct (13 Companies, 262 People, 5 Nationalities, 33% Women)", async ({
    page,
  }) => {
    await page.goto("/");
    const kpiSection = page.locator(".kpis");
    await expect(kpiSection).toContainText("13");
    await expect(kpiSection).toContainText("262");
    await expect(kpiSection).toContainText("5");
    await expect(kpiSection).toContainText("33%");
  });

  test("'Friends & Partners' section with 6 partner cards", async ({
    page,
  }) => {
    await page.goto("/");
    const heading = page.locator("h2", { hasText: "Friends & Partners" });
    await expect(heading).toBeVisible();

    const partnerCards = page.locator(".partner");
    await expect(partnerCards).toHaveCount(6);
  });

  test("partner card names are correct", async ({ page }) => {
    await page.goto("/");
    const partnerNames = [
      "Superteam",
      "Modelcode.ai",
      "Mad Science of Colorado",
      "Ridiculous Engineering",
      "Einride",
      "Extern",
    ];
    for (const name of partnerNames) {
      const card = page.locator(".partner", { hasText: name });
      await expect(card, `partner card for ${name} should be visible`).toBeVisible();
    }
  });
});

test.describe("Sitemap and robots.txt", () => {
  test("sitemap-index.xml is accessible", async ({ page }) => {
    const response = await page.goto("/sitemap-index.xml");
    expect(response?.status()).toBe(200);
  });

  test("sitemap-0.xml has all six pages with .html suffix", async ({
    page,
  }) => {
    const response = await page.goto("/sitemap-0.xml");
    expect(response?.status()).toBe(200);
    const content = await page.content();
    const expectedUrls = [
      "index.html",
      "about.html",
      "companies-sponsors.html",
      "events.html",
      "members-benefits.html",
      "resources.html",
    ];
    for (const url of expectedUrls) {
      expect(content, `sitemap should contain ${url}`).toContain(url);
    }
  });

  test("robots.txt references the sitemap", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);
    const content = await page.content();
    expect(content).toContain("Sitemap:");
    expect(content).toContain("sitemap-index.xml");
  });
});
