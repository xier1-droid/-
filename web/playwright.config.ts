import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const port = new URL(baseURL).port || "3000";
const serverCommand = process.env.PLAYWRIGHT_SERVER_COMMAND ?? `npm run dev -- -p ${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: { ...devices["Pixel 5"], baseURL },
  webServer: { command: serverCommand, url: baseURL, reuseExistingServer: true },
});
