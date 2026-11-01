import { defineConfig, devices } from '@playwright/test';

// End-to-end suite (specs arrive with the UI bolts).
export default defineConfig({
  testDir: './playwright',
  outputDir: './playwright/.results',
  reporter: [['list'], ['html', { outputFolder: './playwright/report', open: 'never' }]],
  // All specs share one live backend (one station, one set of Dummy devices) — parallel workers
  // would let one spec's `/training/reset` or scale ramp land mid another spec's assertions.
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    video: 'on',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Two servers, each with its own readiness check: the client (Vite) starts faster than the
  // API (Nest boot + migrations), so a single combined check against :5173 could let tests begin
  // before :3000 is actually accepting connections.
  webServer: [
    {
      command: 'pnpm dev:server',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev:client',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
