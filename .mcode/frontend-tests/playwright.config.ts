import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://127.0.0.1:4321",
    headless: true,
    screenshot: "only-on-failure",
  },
  reporter: [["list"]],
});
