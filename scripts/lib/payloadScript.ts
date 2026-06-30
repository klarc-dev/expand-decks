import config from '@payload-config';
import { getPayload } from 'payload';

export type ScriptPayload = Awaited<ReturnType<typeof getPayload>>;

type MaybeClosablePayload = ScriptPayload & {
  close?: () => Promise<void> | void;
  destroy?: () => Promise<void> | void;
  db?: {
    close?: () => Promise<void> | void;
    destroy?: () => Promise<void> | void;
    pool?: {
      end?: () => Promise<void> | void;
      destroy?: () => Promise<void> | void;
    };
  };
};

export async function getScriptPayload(): Promise<ScriptPayload> {
  return getPayload({ config });
}

async function callMaybeClose(label: string, fn: (() => Promise<void> | void) | undefined) {
  if (!fn) return false;
  try {
    await fn();
    return true;
  } catch (error) {
    console.warn(`[payload-script] ${label} cleanup failed`, error);
    return false;
  }
}

export async function closeScriptPayload(payload: ScriptPayload): Promise<void> {
  const closable = payload as MaybeClosablePayload;

  // Payload/adapter internals vary by version. Try public-ish methods first,
  // then the underlying pool. One successful close is enough.
  const closed =
    (await callMaybeClose('payload.close', closable.close?.bind(closable))) ||
    (await callMaybeClose('payload.destroy', closable.destroy?.bind(closable))) ||
    (await callMaybeClose('payload.db.close', closable.db?.close?.bind(closable.db))) ||
    (await callMaybeClose('payload.db.destroy', closable.db?.destroy?.bind(closable.db))) ||
    (await callMaybeClose('payload.db.pool.end', closable.db?.pool?.end?.bind(closable.db.pool))) ||
    (await callMaybeClose(
      'payload.db.pool.destroy',
      closable.db?.pool?.destroy?.bind(closable.db.pool),
    ));

  if (!closed) {
    console.warn('[payload-script] no Payload cleanup method found; forcing process exit');
  }
}

export async function runPayloadScript(
  script: (payload: ScriptPayload) => Promise<void>,
): Promise<never> {
  let exitCode = 0;
  let payload: ScriptPayload | undefined;

  // Close the pool on Ctrl-C / kill too, so an interrupted script can't leave
  // an "idle in transaction" session blocking later schema work.
  let interrupted = false;
  const onSignal = (signal: NodeJS.Signals) => {
    if (interrupted) return;
    interrupted = true;
    void (async () => {
      if (payload) await closeScriptPayload(payload);
      process.exit(signal === 'SIGINT' ? 130 : 143);
    })();
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    payload = await getScriptPayload();
    await script(payload);
  } catch (error) {
    exitCode = 1;
    console.error(error);
  } finally {
    if (payload) await closeScriptPayload(payload);
  }

  process.exit(exitCode);
}
