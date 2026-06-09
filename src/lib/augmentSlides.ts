/**
 * Merge strategy for augment-mode drafting.
 *
 * The load-bearing correctness rule (see plan U8): existing slides must be
 * preserved *verbatim* — they are already Lexical and must never be routed back
 * through the LLM (the two-pass pipeline's `alignBatch` keeps the model's freshly
 * generated body and discards the original, so a round-trip silently rewrites
 * content). Only newly-drafted slides are produced by the model and converted to
 * Lexical; this helper just concatenates, keeping the existing entries by
 * reference so they are provably untouched.
 *
 * Append is the only merge strategy implemented; replace-by-index is a deferred
 * open question (see plan).
 */
export function mergeAugmentedSlides<E, N>(existing: readonly E[], drafted: readonly N[]): (E | N)[] {
  return [...existing, ...drafted];
}
