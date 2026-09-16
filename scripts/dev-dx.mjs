/**
 * Full-DX dev launcher: kill stale servers, start Next, auto-open the admin
 * once it's actually listening — no manual refresh, no guessing.
 *
 *   pnpm dev:dx
 *
 * - kill-port clears any stale process on the pinned port (4317) AND on the
 *   common fallbacks (3000/3001) so a zombie Next can't shadow the new one.
 * - wait-on polls the server until it responds (not a blind sleep), then
 *   opens the admin once.
 * - concurrently keeps the two streams prefixed and colorized, and kills the
 *   opener when Next exits so nothing lingers.
 *
 */
import { spawn } from 'node:child_process';

const PORT = process.env.PORT || '4317';
const URL = `http://localhost:${PORT}/admin`;
const run = (cmd, args) => spawn(cmd, args, { stdio: 'inherit', env: process.env });

// 1. Clear stale servers on the pinned port and the common fallbacks.
const kill = run('kill-port', [PORT, '3000', '3001']);
kill.on('close', () => {
  // 2. Start Next (dev.mjs pins the port again as a belt-and-braces) and,
  //    in parallel, wait for a real 200 before opening the admin once.
  const child = run('concurrently', [
    '--kill-others-on-fail',
    '--prefix-colors',
    'blue,green',
    '--names',
    'web,open',
    `next dev -p ${PORT}`,
    `wait-on ${URL} --timeout 60000 && open ${URL}`,
  ]);
  child.on('exit', (code) => process.exit(code ?? 0));
});
