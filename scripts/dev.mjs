// Dev launcher: free the hardcoded dev port, then start Next on it.
//
// Why: Payload's CSRF check compares the request Origin against `serverURL`
// (NEXT_PUBLIC_SERVER_URL). If Next falls back to a different port because the
// configured one is occupied, every write 403s and the admin reports "you must
// be logged in" (req.user is silently nulled). So we pin one uncommon port,
// kill whatever holds it, and bind to it explicitly.
//
// PORT is read from the environment (.env is loaded by Next itself; we also read
// it here via process.env which Next's CLI passes through). Fallback: 4317.

import { execSync, spawn } from 'node:child_process';

const PORT = process.env.PORT || '4317';

function freePort(port) {
  try {
    const out = execSync(`lsof -ti tcp:${port}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    if (!out) return;
    const pids = out.split('\n').filter(Boolean);
    execSync(`kill -9 ${pids.join(' ')}`);
    console.log(`[dev] freed port ${port} (killed ${pids.join(', ')})`);
  } catch {
    // lsof exits non-zero when nothing is listening — that's the happy path.
  }
}

freePort(PORT);

const child = spawn('next', ['dev', '-p', PORT], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 0));
