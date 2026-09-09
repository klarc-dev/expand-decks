import { spawn, spawnSync } from 'node:child_process';

const databaseURL = new URL(process.env.DATABASE_URL ?? '');
const databaseName = databaseURL.pathname.replace(/^\//, '');
if (!databaseName || !databaseName.endsWith('_e2e')) {
  throw new Error(`Refusing to prepare non-E2E database: ${databaseName || '(missing)'}`);
}

const connectionArgs = [
  ...(databaseURL.hostname ? ['--host', databaseURL.hostname] : []),
  ...(databaseURL.port ? ['--port', databaseURL.port] : []),
  ...(databaseURL.username ? ['--username', decodeURIComponent(databaseURL.username)] : []),
];
const commandEnv = {
  ...process.env,
  ...(databaseURL.password ? { PGPASSWORD: decodeURIComponent(databaseURL.password) } : {}),
};

function run(command, args) {
  const result = spawnSync(command, [...connectionArgs, ...args], {
    env: commandEnv,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('dropdb', ['--if-exists', databaseName]);
run('createdb', [databaseName]);

const server = spawn('pnpm', ['dev'], {
  env: process.env,
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}

server.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
