/**
 * Tiny typed wrapper for same-origin admin POST calls.
 *
 * Centralises the shape both admin field components used by hand: POST with
 * `credentials: 'include'`, a tolerant JSON parse (invalid JSON → `{}` rather
 * than a throw), and a flat `{ ok, status, data }` result so callers branch on
 * `ok` and read `data.error` / `data.<field>` directly. A body is only sent —
 * with `Content-Type: application/json` — when one is provided.
 */
export async function adminPost(
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: any }> {
  const init: RequestInit = { method: 'POST', credentials: 'include' };

  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));

  return { ok: res.ok, status: res.status, data };
}
