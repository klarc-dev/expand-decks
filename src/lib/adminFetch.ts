/**
 * Client-safe fetch helper for admin UI components. No node imports.
 *
 * Wraps `fetch` with `credentials: 'include'`, parses JSON (tolerating
 * non-JSON bodies), and throws an AdminFetchError carrying the server's
 * `error` message and optional `detail` when the response is not ok.
 */

export class AdminFetchError extends Error {
  detail?: string;
  constructor(message: string, detail?: string) {
    super(message);
    this.detail = detail;
  }
}

export async function adminFetch<T = unknown>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { credentials: 'include', ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new AdminFetchError(
      (data as { error?: string })?.error || 'Erreur réseau',
      (data as { detail?: string })?.detail,
    );
  return data as T;
}
