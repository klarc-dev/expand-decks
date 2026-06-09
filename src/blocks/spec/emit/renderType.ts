/**
 * L2 render-type derivation — type-only emit module.
 *
 * `InferRender` is re-exported from `../dsl` (its single canonical home — the
 * client-safe DSL that spec files already import) so there is exactly one alias
 * definition. `Equal` / `Expect` provide compile-time, bidirectional structural
 * equality assertions so a derivation that drifts from a hand-written
 * `*BlockData` becomes a `tsc` error.
 *
 * Client-safety: imports ONLY zod + the client-safe dsl — no Payload / Next
 * runtime — so it stays loadable into `'use client'` renderer types.
 */

/** Render-data type for a precise render schema value (a `z.object` literal). */
export type { InferRender } from '../dsl';

/**
 * Compile-time, bidirectional structural equality. Resolves to `true` only when
 * `A` and `B` are mutually assignable in the exact same way (the function-wrapper
 * trick compares the types invariantly, so `T | null` vs `T | null | undefined`
 * etc. are distinguished — except where TS itself treats them as identical, e.g.
 * an optional property `?: X` already implies `| undefined`).
 */
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/** Assertion helper: `Expect<Equal<...>>` errors at compile time on a mismatch. */
export type Expect<T extends true> = T;
