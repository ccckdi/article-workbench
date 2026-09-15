import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:4187",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      'java -jar ../backend/build/libs/article-workbench.jar --server.port=4187 --spring.r2dbc.url="r2dbc:h2:mem:///browser-tests?DB_CLOSE_DELAY=-1"',
    url: "http://127.0.0.1:4187/api/health",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
