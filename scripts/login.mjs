/**
 * Dev convenience: start the dev server, then open a HEADED browser, log into
 * the Payload admin with the seed credentials, and leave it open so you can
 * click around as a real user.
 *
 *   pnpm login                 # uses SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD + NEXT_PUBLIC_SERVER_URL
 *   pnpm login -- --url=http://localhost:4317   # attach to an already-running server
 *
 * This launches `pnpm dev` itself (no separate terminal needed) and waits for
 * it to come up before logging in. Pass --url to skip starting dev and attach
 * to a server you're already running elsewhere.
 *
 * The browser and the dev server stay running until you close the browser
 * window or Ctrl-C the process — both are torn down cleanly on exit.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const arg = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');

const explicitUrl = arg('url');

const baseUrl = (
  explicitUrl ||
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

// Start `pnpm dev` ourselves unless the caller pointed us at an existing server.
let devProc = null;
if (!explicitUrl) {
  console.log('[login] starting dev server (pnpm dev) …');
  devProc = spawn('pnpm', ['dev'], { stdio: 'inherit', env: process.env });
  devProc.on('exit', (code) => {
    // If dev dies, there's nothing to log into — bail out.
    console.error(`[login] dev server exited (code ${code ?? 0}).`);
    process.exit(code ?? 0);
  });
}

// Poll the admin login page until the dev server answers (or we give up).
async function waitForServer(url, { timeoutMs = 60000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      // Any HTTP response means the server is up and routing.
      if (res.status > 0) return;
    } catch {
      // Connection refused / DNS — server not ready yet.
    }
    if (Date.now() > deadline) {
      throw new Error(`timed out after ${timeoutMs}ms waiting for ${url}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

const loginUrl = `${baseUrl}/admin/login`;

if (devProc) {
  try {
    await waitForServer(loginUrl);
    console.log('[login] dev server is up.');
  } catch (err) {
    console.error(`[login] ${err instanceof Error ? err.message : String(err)}`);
    devProc.kill('SIGTERM');
    process.exit(1);
  }
}

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
    `\nCould not reach ${loginUrl}.\n` + (err instanceof Error ? err.message : String(err)),
  );
  await browser.close();
  devProc?.kill('SIGTERM');
  process.exit(1);
}

// If Payload already has a valid session it redirects /admin/login → /admin.
if (!page.url().includes('/login')) {
  console.log('already logged in — browser is open.');
} else {
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page
      .waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 })
      .catch(() => {}),
    page.click('button[type="submit"], button:has-text("Login"), button:has-text("Connexion")'),
  ]);
  if (page.url().includes('/login')) {
    console.error('login did not redirect — check the seed credentials. Browser left open.');
  } else {
    console.log(`logged in as ${email} — browser is open.`);
  }
}

console.log('Leave this terminal running. Close the browser window or Ctrl-C to quit.');

// Tear down both the browser and the dev server on the way out.
let cleaningUp = false;
function shutdown(code = 0) {
  if (cleaningUp) return;
  cleaningUp = true;
  devProc?.kill('SIGTERM');
  process.exit(code);
}

// Quit cleanly when the user closes the window.
browser.on('disconnected', () => shutdown(0));
// Ctrl-C / kill should also take the dev server down with us.
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// Keep the process alive otherwise.
await new Promise(() => {});
