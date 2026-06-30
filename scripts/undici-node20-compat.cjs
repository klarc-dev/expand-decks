// Compatibility shim for Node 20.x + undici 8.x.
//
// Payload 3.85 currently pulls undici@8, whose CacheStorage implementation calls
// `worker_threads.markAsUncloneable`. That API exists in newer Node releases but
// not in the Node 20.20.x runtime used by this project locally. Next loads Payload
// as an external module for /admin, so the missing API crashes the dev server
// before the admin can render. No-op is sufficient here because the app does not
// rely on cloning CacheStorage instances across worker boundaries.
const workerThreads = require('node:worker_threads');

if (typeof workerThreads.markAsUncloneable !== 'function') {
  workerThreads.markAsUncloneable = () => {};
}
