#!/usr/bin/env node
/**
 * Operate the production deployment from the repo, without hand-typing the
 * ssh and docker plumbing every time.
 *
 *   pnpm prod status
 *   pnpm prod run <scripts/file.ts> [args...] [--yes] [--allow-dirty]
 *   pnpm prod pull [--no-media] [--name <db>] [--force]
 *
 * status  Shows the live containers, the deployed image sha, and the job
 *         queue, so "is my commit deployed?" is one command.
 * run     Executes a repo script INSIDE the production payload container, even
 *         when that script is not part of the deployed image yet: the file is
 *         copied to /app/scripts/, run with tsx against production, then the
 *         shipped copy (if any) is restored. Scripts whose name starts with
 *         seed- or set- mutate data and require --yes. A script with
 *         uncommitted changes is refused unless --allow-dirty is passed.
 * pull    Mirrors production into local dev, one way: pg_dump from the postgres
 *         container restored into a fresh local database (slides_prod_<date>
 *         by default) plus an rsync of the media volume into ./media. Prints
 *         the DATABASE_URL to put in .env. Never writes to production.
 *
 * Environment overrides: PROD_SSH_HOST (klarc), PROD_APP_UUID (the Coolify
 * application uuid used as the container-name prefix), PROD_MEDIA_DIR (host
 * path of the media bind mount), LOCAL_PG_URL (postgresql://localhost:5432).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';

const SSH_HOST = process.env.PROD_SSH_HOST ?? 'klarc';
const APP_UUID = process.env.PROD_APP_UUID ?? 'cwarktiocfrejvca0mvdfjar';
const MEDIA_DIR = process.env.PROD_MEDIA_DIR ?? '/home/joachim/docker/expand-decks/media';
const LOCAL_PG_URL = process.env.LOCAL_PG_URL ?? 'postgresql://localhost:5432';
const SSH = ['ssh', '-o', 'ForwardX11=no', '-o', 'ConnectTimeout=25', SSH_HOST];
const REPO = resolve(new URL('..', import.meta.url).pathname);
const DUMP_DIR = join(REPO, '.prod-dumps');

const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

function ssh(command, opts = {}) {
  const r = spawnSync(SSH[0], [...SSH.slice(1), command], {
    encoding: 'utf8',
    stdio: opts.inherit ? ['ignore', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    const detail = opts.inherit ? 'see output above' : (r.stderr ?? '').trim() || command;
    throw new Error(`remote command on ${SSH_HOST} exited with ${r.status}: ${detail}`);
  }
  return (r.stdout ?? '').trim();
}

function local(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: opts.inherit ? 'inherit' : 'pipe',
    ...opts,
  });
}

function containers() {
  const names = ssh('docker ps --format "{{.Names}}"').split('\n');
  const payload = names.find((n) => n.startsWith(`payload-${APP_UUID}`));
  const workers = names.filter((n) => n.startsWith(`payload-worker-`) && n.includes(APP_UUID));
  const postgres = names.find((n) => n.startsWith(`postgres-${APP_UUID}`));
  if (!payload || !postgres) {
    throw new Error(
      `Could not find payload/postgres containers for ${APP_UUID}. Running: ${names.join(', ')}`,
    );
  }
  return { payload, workers, postgres };
}

/** Run SQL in the production postgres, unaligned tuples. Read-only by intent. */
function psql(postgres, sql) {
  return ssh(
    `printf %s ${shq(sql)} | docker exec -i ${postgres} sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'`,
  );
}

function parseFlags(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--yes' || a === '--allow-dirty' || a === '--no-media' || a === '--force')
      flags[a.slice(2)] = true;
    else if (a === '--name') flags.name = argv[++i];
    else rest.push(a);
  }
  return { flags, rest };
}

function status() {
  const { payload, workers, postgres } = containers();
  const image = ssh(`docker inspect -f "{{.Config.Image}}" ${payload}`);
  const sha = image.split(':').pop();
  const localHead = local('git', ['rev-parse', 'HEAD'], { cwd: REPO }).trim();
  const deployedLocally =
    spawnSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], { cwd: REPO }).status === 0;
  const jobs = psql(
    postgres,
    'select count(*) filter (where processing), count(*) filter (where not processing and not has_error), count(*) filter (where has_error) from payload_jobs where completed_at is null',
  );
  const [processing, pending, failed] = jobs.split('|');
  console.log(`host       ${SSH_HOST}`);
  console.log(`payload    ${payload}`);
  console.log(`workers    ${workers.join(', ') || '(none)'}`);
  console.log(`postgres   ${postgres}`);
  console.log(
    `deployed   ${sha}${deployedLocally ? '  (ancestor of local HEAD)' : '  (NOT in local history)'}`,
  );
  console.log(`local HEAD ${localHead}${localHead === sha ? '  (same as deployed)' : ''}`);
  console.log(`jobs       ${processing} processing, ${pending} pending, ${failed} failed`);
}

function run(argv) {
  const { flags, rest } = parseFlags(argv);
  const [scriptArg, ...args] = rest;
  if (!scriptArg)
    throw new Error('Usage: pnpm prod run <scripts/file.ts> [args...] [--yes] [--allow-dirty]');
  const abs = resolve(REPO, scriptArg);
  const rel = relative(REPO, abs);
  if (!rel.startsWith('scripts/') || rel.includes('/', 'scripts/'.length) || !existsSync(abs)) {
    throw new Error(`Script must be a file directly under scripts/ (got ${rel})`);
  }
  const name = basename(abs);
  if (/^(seed-|set-)/.test(name) && !flags.yes) {
    throw new Error(`${name} mutates production data; rerun with --yes to confirm`);
  }
  const dirty = local('git', ['status', '--porcelain', '--', rel], { cwd: REPO }).trim();
  if (dirty && !flags['allow-dirty']) {
    throw new Error(
      `${rel} has uncommitted changes; commit it or pass --allow-dirty to run this working copy`,
    );
  }
  const { payload } = containers();
  const image = ssh(`docker inspect -f "{{.Config.Image}}" ${payload}`);
  console.error(`→ ${payload} (${image.split(':').pop()})`);
  console.error(
    `→ running ${rel}${dirty ? ' (working copy, uncommitted)' : ''} ${args.join(' ')}`.trimEnd(),
  );

  const remoteTmp = `/tmp/prod-run-${process.pid}-${name}`;
  const target = `/app/scripts/${name}`;
  local('scp', ['-o', 'ForwardX11=no', '-q', abs, `${SSH_HOST}:${remoteTmp}`]);
  const quotedArgs = args.map(shq).join(' ');
  // Keep the image's own copy (if any) so the container is left as deployed.
  const remote = [
    `set -e`,
    `P=${payload}`,
    `docker exec $P sh -c ${shq(`test -f ${target} && cp ${target} ${target}.deployed || true`)}`,
    `docker cp ${remoteTmp} $P:${target}`,
    `rm -f ${remoteTmp}`,
    `code=0; docker exec $P sh -c ${shq(`pnpm exec tsx scripts/${name} ${quotedArgs}`)} || code=$?`,
    `docker exec $P sh -c ${shq(`if test -f ${target}.deployed; then mv ${target}.deployed ${target}; else rm -f ${target}; fi`)}`,
    `exit $code`,
  ].join('\n');
  ssh(remote, { inherit: true });
}

function pull(argv) {
  const { flags } = parseFlags(argv);
  const { postgres } = containers();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const dbName = flags.name ?? `slides_prod_${date}`;
  if (!/^[a-z0-9_]+$/.test(dbName)) throw new Error(`Database name must be [a-z0-9_]: ${dbName}`);
  const adminUrl = `${LOCAL_PG_URL}/postgres`;
  const exists =
    local('psql', [
      adminUrl,
      '-At',
      '-c',
      `select 1 from pg_database where datname='${dbName}'`,
    ]).trim() === '1';
  if (exists && !flags.force) {
    throw new Error(
      `Local database ${dbName} already exists; pass --force to drop and recreate it, or --name <other>`,
    );
  }

  mkdirSync(DUMP_DIR, { recursive: true });
  const dump = join(DUMP_DIR, `${dbName}.dump`);
  console.error(`→ pg_dump from ${postgres} to ${relative(REPO, dump)}`);
  const r = spawnSync(
    'sh',
    [
      '-c',
      `${SSH.map(shq).join(' ')} ${shq(`docker exec ${postgres} sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges'`)} > ${shq(dump)}`,
    ],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  );
  if (r.status !== 0 || !existsSync(dump) || statSync(dump).size === 0)
    throw new Error('pg_dump failed');
  console.error(`  ${(statSync(dump).size / 1024 / 1024).toFixed(1)} MB`);

  if (exists) {
    console.error(`→ dropping local ${dbName}`);
    local('psql', [adminUrl, '-q', '-c', `drop database "${dbName}" with (force)`]);
  }
  console.error(`→ creating local ${dbName} and restoring`);
  local('psql', [adminUrl, '-q', '-c', `create database "${dbName}"`]);
  const restore = spawnSync(
    'pg_restore',
    ['--no-owner', '--no-privileges', '--exit-on-error', '-d', `${LOCAL_PG_URL}/${dbName}`, dump],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  );
  if (restore.status !== 0) throw new Error('pg_restore failed');
  const counts = local('psql', [
    `${LOCAL_PG_URL}/${dbName}`,
    '-At',
    '-c',
    "select (select count(*) from presentations)||' presentations, '||(select count(*) from users)||' users, '||(select count(*) from media)||' media'",
  ]).trim();
  console.error(`  ${counts}`);

  if (!flags['no-media']) {
    console.error(`→ rsync media from ${SSH_HOST}:${MEDIA_DIR}/ to ./media/`);
    local(
      'rsync',
      [
        '-az',
        '--info=stats1',
        '-e',
        'ssh -o ForwardX11=no',
        `${SSH_HOST}:${MEDIA_DIR}/`,
        `${join(REPO, 'media')}/`,
      ],
      {
        inherit: true,
      },
    );
  }

  console.log('');
  console.log(`Local mirror ready. Point the app at it with:`);
  console.log(`  DATABASE_URL=${LOCAL_PG_URL}/${dbName}`);
}

const [verb, ...argv] = process.argv.slice(2);
try {
  if (verb === 'status') status();
  else if (verb === 'run') run(argv);
  else if (verb === 'pull') pull(argv);
  else {
    console.error('Usage: pnpm prod <status|run|pull> ...  (see header of scripts/prod.mjs)');
    process.exit(2);
  }
} catch (error) {
  console.error(`prod: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
