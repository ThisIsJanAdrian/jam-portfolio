import { defineConfig, devices } from '@playwright/test';

// Override with E2E_PORT to avoid reusing a dev server that is already running on 4321.
const PORT = Number(process.env.E2E_PORT ?? 4321);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // fail CI if a stray test.only is committed
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Cross-browser and mobile coverage.
  projects: [
    // Desktop is 1920x1080: the size the page is designed at (the root font is 16px from there up).
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  // Test the real production build, not the dev server.
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
