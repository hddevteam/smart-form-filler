import { defineConfig, devices } from '@playwright/test';

const projects = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
];

if (process.env.PLAYWRIGHT_EDGE === '1') {
  projects.push({
    name: 'msedge',
    use: { ...devices['Desktop Edge'] },
  });
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: (process.env.CI ? 1 : undefined) as unknown as number,
  reporter: 'html',

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects,

  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173/extension/popup.html',
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});
