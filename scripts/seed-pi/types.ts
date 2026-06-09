/**
 * Shared types for the modular PI deck seed (`scripts/seed-pi/`).
 *
 * Each file in `slides/` default-exports a `SlideFactory`: a pure function that
 * receives the build context (currently just the markdown→Lexical converter
 * `rt`) and returns one slide block, or an array of them. `assemble.ts` globs
 * the directory, sorts by filename, calls each factory, flattens, and upserts
 * the presentation.
 *
 * To add a slide: drop a new `NNN-name.ts` in `slides/` (numeric prefix sets the
 * order — gaps of 10 leave room to insert). To reorder: rename the prefix.
 */
import type { Presentation } from '../../src/payload-types';

export type Slide = NonNullable<Presentation['slides']>[number];

/** markdown → Lexical editor state. Cast `as never` to satisfy the rich-text field type. */
export type RichText = (markdown: string) => never;

export type SlideCtx = { rt: RichText };

export type SlideFactory = (ctx: SlideCtx) => Slide | Slide[];
