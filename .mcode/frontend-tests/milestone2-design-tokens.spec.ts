import { expect, test } from "@playwright/test";

/**
 * milestone2-design-tokens.spec.ts — Tailwind 4 design token verification.
 *
 * Verifies:
 *   - CSS custom property `--primary` is the French Tech red (239 65 53)
 *     in both light and dark themes.
 *   - CSS custom property `--accent` is the French Tech blue (0 85 164)
 *     in light mode.
 *   - Hero text in dark mode is NOT forced to legacy near-black #0f172a.
 *   - Hero has a gradient overlay scrim (--hero-overlay token).
 *   - Body font-family uses Inter Variable with system-ui fallback.
 *   - Headings use Bricolage Grotesque Variable.
 */

test.describe("Design tokens — CSS custom properties", () => {
  test("--primary is French Tech red (239 65 53) on light theme", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
    });
    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim()
    );
    expect(value.replace(/\s+/g, " ")).toBe("239 65 53");
  });

  test("--primary is French Tech red (239 65 53) on dark theme", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim()
    );
    expect(value.replace(/\s+/g, " ")).toBe("239 65 53");
  });

  test("--accent is French Tech blue (0 85 164) on light theme", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
    });
    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim()
    );
    expect(value.replace(/\s+/g, " ")).toBe("0 85 164");
  });

  test("--accent changes in dark mode (not the same blue as light)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim()
    );
    // Dark accent is a different blue value (59 130 246).
    expect(value.replace(/\s+/g, " ")).not.toBe("0 85 164");
  });
});

test.describe("Hero contrast fix", () => {
  test("hero h1 text in dark mode is NOT the legacy near-black (#0f172a)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    const color = await page.evaluate(() => {
      const h1 = document.querySelector(".hero h1") as HTMLElement | null;
      return h1 ? getComputedStyle(h1).color : null;
    });
    expect(color, "hero h1 should have a computed color").not.toBeNull();
    // The legacy bug was forcing color: #0f172a (rgb(15, 23, 42)) even in dark mode.
    expect(color).not.toMatch(/^rgb\(\s*15\s*,\s*23\s*,\s*42\s*\)/);
  });

  test("hero applies a gradient overlay above the photo", async ({ page }) => {
    await page.goto("/");
    const bg = await page.evaluate(() => {
      const hero = document.querySelector(".hero") as HTMLElement | null;
      return hero ? getComputedStyle(hero).backgroundImage : null;
    });
    expect(bg, "hero should have a backgroundImage").not.toBeNull();
    expect(bg!).toMatch(/gradient\(/);
    expect(bg!).toMatch(/hero/);
  });
});

test.describe("Typography", () => {
  test("body font-family uses Inter Variable with system-ui fallback", async ({
    page,
  }) => {
    await page.goto("/");
    const family = await page.evaluate(() =>
      getComputedStyle(document.body).fontFamily
    );
    expect(family.toLowerCase()).toContain("inter variable");
    expect(family.toLowerCase()).toContain("system-ui");
  });

  test("heading font-family uses Bricolage Grotesque Variable", async ({
    page,
  }) => {
    await page.goto("/");
    const family = await page.evaluate(() => {
      const h1 = document.querySelector(".hero h1") as HTMLElement | null;
      return h1 ? getComputedStyle(h1).fontFamily : null;
    });
    expect(family, "hero h1 should have a font-family").not.toBeNull();
    expect(family!.toLowerCase()).toContain("bricolage grotesque variable");
  });
});
