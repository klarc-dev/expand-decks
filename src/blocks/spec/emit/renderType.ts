/**
 * L2 render-type derivation — type-only emit module.
 *
 * `InferRender` is the single canonical alias used to derive a renderer's
 * `*BlockData` type from a render `z.object` literal (see dsl.ts top-of-file
 * note). `Equal` / `Expect` provide compile-time, bidirectional structural
 * equality assertions so a derivation that drifts from a hand-written
 * `*BlockData` becomes a `tsc` error.
 *
 * Client-safety: imports ONLY zod — no Payload / Next runtime — so it stays
 * loadable into `'use client'` renderer types.
 */

import { z } from 'zod';

/** Render-data type for a precise render schema value (a `z.object` literal). */
export type InferRender<TSchema extends z.ZodType> = z.infer<TSchema>;

/**
 * Compile-time, bidirectional structural equality. Resolves to `true` only when
 * `A` and `B` are mutually assignable in the exact same way (the function-wrapper
 * trick compares the types invariantly, so `T | null` vs `T | null | undefined`
 * etc. are distinguished — except where TS itself treats them as identical, e.g.
 * an optional property `?: X` already implies `| undefined`).
 */
export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (
  <T>() => T extends B ? 1 : 2
)
  ? true
  : false;

/** Assertion helper: `Expect<Equal<...>>` errors at compile time on a mismatch. */
export type Expect<T extends true> = T;
