/**
 * Dev convenience: open a HEADED browser, log into the Payload admin with the
 * seed credentials, and leave it open so you can click around as a real user.
 *
 *   pnpm login                 # uses SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD + NEXT_PUBLIC_SERVER_URL
 *   pnpm login -- --url=http://localhost:4317
 *
 * The browser stays open until you close the window or Ctrl-C the process.
 * Requires the dev server to be running (`pnpm dev`) in another terminal.
 */
import { chromium } from 'playwright';

const arg = (name) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const baseUrl = (
  arg('url') ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  `http://localhost:${process.env.PORT || '4317'}`
).replace(/\/$/, '');

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  console.error(
    'Missing SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD. Run with env loaded, e.g.\n' +
      '  node --env-file=.env scripts/login.mjs',
  );
  process.exit(1);
}

const loginUrl = `${baseUrl}/admin/login`;
console.log(`opening ${loginUrl} …`);

const browser = await chromium.launch({
  headless: false,
  // A real, persistent-feeling window for clicking around.
  args: ['--start-maximized'],
});
const context = await browser.newContext({ viewport: null });
const page = await context.newPage();

try {
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
} catch (err) {
  console.error(
    `\nCould not reach ${loginUrl}. Is the dev server running? Start it with \`pnpm dev\`.\n` +
      (err instanceof Error ? err.message : String(err)),
  );
  await browser.close();
  process.exit(1);
}

// If Payload already has a valid session it redirects /admin/login → /admin.
if (!page.url().includes('/login')) {
  console.log('already logged in — browser is open.');
} else {
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"], button:has-text("Login"), button:has-text("Connexion")'),
  ]);
  if (page.url().includes('/login')) {
    console.error('login did not redirect — check the seed credentials. Browser left open.');
  } else {
    console.log(`logged in as ${email} — browser is open.`);
  }
}

console.log('Leave this terminal running. Close the browser window or Ctrl-C to quit.');

// Quit cleanly when the user closes the window.
browser.on('disconnected', () => process.exit(0));
// Keep the process alive otherwise.
await new Promise(() => {});
