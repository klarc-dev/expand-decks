/**
 * Persist tool — the ONLY write into Payload from the agent runtime. Converts
 * the drafted slides' markdown fields to Lexical editor state and writes them to
 * the presentation via the Local API, exactly like the legacy draft route, with
 * `skipBuildQueue` so the agent's own writes never trip the build hook.
 */
import type { Payload } from 'payload';

import type { Presentation } from '@/payload-types';
import { COLLECTIONS } from '../../lib/collections';
import { CTX } from '../../lib/context';
import { mergeAugmentedSlides } from '../../lib/augmentSlides';
import { convertSlidesMarkdownToLexical } from '../../lib/richTextWrite';
import type { SlideBlock } from '../../export/renderers';

export async function persistSlides(opts: {
  payload: Payload;
  presentationId: string | number;
  slides: SlideBlock[];
  mode: 'replace' | 'augment';
  existing?: Presentation['slides'];
  user?: unknown;
}): Promise<{ slideCount: number }> {
  const { payload, presentationId, slides, mode } = opts;

  const draftedRich = await convertSlidesMarkdownToLexical(
    slides as unknown as Parameters<typeof convertSlidesMarkdownToLexical>[0],
    payload,
  );

  const existing = (
    mode === 'augment' && Array.isArray(opts.existing) ? opts.existing : []
  ) as NonNullable<Presentation['slides']>;
  const nextSlides = mergeAugmentedSlides(existing, draftedRich) as Presentation['slides'];

  await payload.update({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    data: { slides: nextSlides },
    user: opts.user as never,
    context: { [CTX.skipBuildQueue]: true },
  });

  return { slideCount: slides.length };
}
