/**
 * Build output policy: which artifacts a build job should produce.
 *
 * - `both` (default) — PDF + SPA, the parity-preserving policy for normal
 *   publish/update builds.
 * - `pdf` / `spa` — targeted maintenance/debug rebuilds that touch one artifact,
 *   leaving the other on its previous fingerprint (surfaced as stale in admin).
 */
export const OUTPUT_POLICIES = ['both', 'pdf', 'spa'] as const;
export type OutputPolicy = (typeof OUTPUT_POLICIES)[number];

export const DEFAULT_OUTPUT_POLICY: OutputPolicy = 'both';

export function normalizeOutputPolicy(value: unknown): OutputPolicy {
  return OUTPUT_POLICIES.includes(value as OutputPolicy)
    ? (value as OutputPolicy)
    : DEFAULT_OUTPUT_POLICY;
}

export function wantsPdf(policy: OutputPolicy): boolean {
  return policy === 'both' || policy === 'pdf';
}

export function wantsSpa(policy: OutputPolicy): boolean {
  return policy === 'both' || policy === 'spa';
}
