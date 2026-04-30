import { expect, test } from "@playwright/test";

/**
 * milestone2-theme.spec.ts — Light/dark theme toggle and persistence.
 *
 * Verifies:
 *   - Default theme on fresh load is "light".
 *   - Clicking #theme-toggle flips data-theme from "light" to "dark".
 *   - Theme is stored in localStorage under the key "theme".
 *   - Reloading the page restores the stored theme (no FOUC — inline head script).
 *   - #theme-toggle is present on every page.
 */

test.describe("Theme toggle", () => {
  test("default theme is light on first load (no stored preference)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();

    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(theme).toBe("light");
  });

  test("clicking #theme-toggle switches to dark", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();

    await page.click("#theme-toggle");
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(theme).toBe("dark");
  });

  test("clicking #theme-toggle twice returns to light", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();

    await page.click("#theme-toggle");
    await page.click("#theme-toggle");
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(theme).toBe("light");
  });

  test("dark theme is stored in localStorage after toggle", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();

    await page.click("#theme-toggle");
    const stored = await page.evaluate(() => localStorage.getItem("theme"));
    expect(stored).toBe("dark");
  });

  test("dark theme persists after reload (inline head script reads localStorage)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();

    await page.click("#theme-toggle");
    await page.reload();

    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(theme).toBe("dark");
  });

  test("light theme persists after reload", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("theme", "light"));
    await page.reload();

    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(theme).toBe("light");
  });

  test("#theme-toggle is present on every page", async ({ page }) => {
    const pages = [
      "/",
      "/about.html",
      "/companies-sponsors.html",
      "/members-benefits.html",
      "/events.html",
      "/resources.html",
    ];
    for (const url of pages) {
      await page.goto(url);
      const toggle = page.locator("#theme-toggle");
      await expect(
        toggle,
        `#theme-toggle should be visible on ${url}`
      ).toBeVisible();
    }
  });
});
