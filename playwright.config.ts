import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stackPath = path.join(__dirname, "e2e", ".ssp-e2e-stack.json");
let baseURL = process.env.SSP_E2E_BASE_URL || "http://127.0.0.1:8080";
if (fs.existsSync(stackPath)) {
  try {
    const stack = JSON.parse(fs.readFileSync(stackPath, "utf8"));
    if (stack.frontend_hint) baseURL = stack.frontend_hint;
  } catch {
    /* keep default */
  }
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/playwright-report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  outputDir: "e2e/test-results",
});
