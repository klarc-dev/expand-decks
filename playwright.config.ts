import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT || 4317);
const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || `http://localhost:${port}`;
const sourceDatabaseURL = process.env.E2E_DATABASE_URL || process.env.DATABASE_URL;
if (!sourceDatabaseURL) throw new Error('E2E tests require DATABASE_URL or E2E_DATABASE_URL.');
const databaseURL = new URL(sourceDatabaseURL);
if (!process.env.E2E_DATABASE_URL && !databaseURL.pathname.endsWith('_e2e')) {
  databaseURL.pathname = `${databaseURL.pathname.replace(/\/$/, '')}_e2e`;
}
const isolatedDatabaseURL = databaseURL.toString();

// E2E runs must be hermetic even when the invoking shell carries production
// defaults (the Hermes TUI does). Never require real provider credentials for
// deterministic browser coverage.
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: isolatedDatabaseURL,
  NEXT_PUBLIC_SERVER_URL: baseURL,
  GOOGLE_FONTS_API_KEY: process.env.GOOGLE_FONTS_API_KEY || 'e2e-placeholder',
  PAYLOAD_DB_PUSH: '1',
});

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    // The setup's first browser action opens Payload admin. Waiting on the
    // lightweight health route alone leaves the much heavier admin route cold
    // and charges its first compilation against the setup test timeout.
    url: `${baseURL}/admin/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DATABASE_URL: isolatedDatabaseURL,
      NEXT_PUBLIC_SERVER_URL: baseURL,
      GOOGLE_FONTS_API_KEY: process.env.GOOGLE_FONTS_API_KEY || 'e2e-placeholder',
      PAYLOAD_DB_PUSH: '1',
    },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
