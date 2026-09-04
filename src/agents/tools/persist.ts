/**
 * Persist tool — the ONLY write into Payload from the agent runtime. Converts
 * the drafted slides' markdown fields to Lexical editor state and writes them to
 * the presentation via the Local API. This write intentionally runs the normal
 * presentation build hook so the generated SPA/PDF reflect the new slides.
 */
import type { Payload } from 'payload';

import type { Presentation } from '@/payload-types';
import { parseAiSlides } from '../../blocks/spec';
import { COLLECTIONS } from '../../lib/collections';
import { mergeAugmentedSlides } from '../../lib/augmentSlides';
import { convertSlidesMarkdownToLexical } from '../../lib/richTextWrite';
import type { SlideBlock } from '../../export/renderers';

export async function persistSlides(opts: {
  payload: Payload;
  presentationId: string | number;
  slides: SlideBlock[];
  mode: 'replace' | 'augment' | 'revise';
  existing?: Presentation['slides'];
  user?: unknown;
}): Promise<{ slideCount: number }> {
  const { payload, presentationId, slides, mode } = opts;

  const draftedRich = await convertSlidesMarkdownToLexical(parseAiSlides(slides), payload);

  const nextSlides =
    mode === 'augment'
      ? (mergeAugmentedSlides(
          Array.isArray(opts.existing) ? opts.existing : [],
          draftedRich,
        ) as Presentation['slides'])
      : (draftedRich as Presentation['slides']);

  await payload.update({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    data: { slides: nextSlides },
    user: opts.user as never,
  });

  return { slideCount: slides.length };
}
