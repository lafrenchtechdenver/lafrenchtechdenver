import { expect, test } from "@playwright/test";

/**
 * milestone2-mobile-menu.spec.ts — Burger menu at mobile viewport (<=900px).
 *
 * Verifies:
 *   - At 375px width the .burger button is visible (CSS max-width: 900px rule).
 *   - #menu is initially hidden at mobile width.
 *   - Clicking .burger toggles .active class on #menu.
 *   - Clicking outside .nav element closes the open menu.
 *   - All six nav links are accessible in the open menu.
 */

const MOBILE_VIEWPORT = { width: 375, height: 812 };

test.describe("Mobile burger menu", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("burger button is visible at 375px width", async ({ page }) => {
    await page.goto("/");
    const burger = page.locator(".burger");
    await expect(burger, "burger should be visible at 375px").toBeVisible();
  });

  test("menu is initially hidden at mobile width", async ({ page }) => {
    await page.goto("/");
    const menu = page.locator("#menu");
    await expect(menu).not.toHaveClass(/active/);
    const isHidden = await page.evaluate(() => {
      const el = document.getElementById("menu");
      return el ? getComputedStyle(el).display === "none" : true;
    });
    expect(isHidden, "menu should be hidden before burger click").toBe(true);
  });

  test("clicking burger opens the menu (.active added)", async ({ page }) => {
    await page.goto("/");
    await page.click(".burger");
    const menu = page.locator("#menu");
    await expect(menu).toHaveClass(/active/);
    const isVisible = await page.evaluate(() => {
      const el = document.getElementById("menu");
      return el ? getComputedStyle(el).display !== "none" : false;
    });
    expect(isVisible, "menu should be visible after burger click").toBe(true);
  });

  test("clicking burger again closes the menu", async ({ page }) => {
    await page.goto("/");
    await page.click(".burger");
    await expect(page.locator("#menu")).toHaveClass(/active/);
    await page.click(".burger");
    await expect(page.locator("#menu")).not.toHaveClass(/active/);
  });

  test("clicking outside .nav closes the open menu", async ({ page }) => {
    await page.goto("/");
    await page.click(".burger");
    await expect(page.locator("#menu")).toHaveClass(/active/);

    // Compute a coordinate below the nav and click it.
    const target = await page.evaluate(() => {
      const nav = document.querySelector(".nav") as HTMLElement | null;
      const menu = document.getElementById("menu") as HTMLElement | null;
      const header = nav?.getBoundingClientRect();
      const menuRect = menu?.getBoundingClientRect();
      const navBottom = Math.max(header?.bottom ?? 0, menuRect?.bottom ?? 0);
      const x = Math.max(10, Math.floor(window.innerWidth / 2));
      const y = Math.min(window.innerHeight - 10, Math.floor(navBottom) + 40);
      return { x, y };
    });
    await page.mouse.click(target.x, target.y);
    await expect(page.locator("#menu")).not.toHaveClass(/active/);
  });

  test("all six nav links are accessible in the open mobile menu", async ({
    page,
  }) => {
    await page.goto("/");
    await page.click(".burger");
    await expect(page.locator("#menu")).toHaveClass(/active/);

    const navLinks = [
      "/index.html",
      "/about.html",
      "/companies-sponsors.html",
      "/members-benefits.html",
      "/events.html",
      "/resources.html",
    ];
    for (const href of navLinks) {
      const link = page.locator(`#menu a[href="${href}"]`);
      await expect(
        link,
        `${href} link should be visible in open mobile menu`
      ).toBeVisible();
    }
  });
});
