import type { SlideBlock } from './renderers';
import { slideTone } from './slideTone';
import type { RenderCtx, SlideRef, Surface } from './utils';

type ContextInput = Pick<SlideBlock, 'blockType'> & {
  id?: unknown;
  title?: unknown;
};

export type SlideRenderContext = RenderCtx & {
  surface: Surface;
  sections: string[];
  slideRefs: SlideRef[];
  page: number;
  total: number;
};

function collectSlideRefs(slides: readonly ContextInput[]): SlideRef[] {
  return slides.map((b) => ({
    id: typeof b.id === 'string' && b.id ? b.id : null,
    blockType: b.blockType,
    title: typeof b.title === 'string' ? b.title : null,
  }));
}

export function collectSectionTitles(slides: readonly ContextInput[]): string[] {
  return slides
    .filter((b) => b.blockType === 'section')
    .map((b) => (typeof b.title === 'string' ? b.title : ''))
    .filter((t) => t.trim().length > 0);
}

export function buildDeckRenderContexts(
  slides: readonly ContextInput[],
  sectionsOverride?: string[],
): SlideRenderContext[] {
  let prevTone: Surface | null = null;
  let statementIndex = 0;
  const sections = sectionsOverride ?? collectSectionTitles(slides);
  const slideRefs = collectSlideRefs(slides);
  const total = slides.length;

  return slides.map((block, index) => {
    const surface = slideTone(block.blockType, prevTone);
    prevTone = surface;
    const variantIndex = block.blockType === 'statement' ? statementIndex++ : undefined;
    return {
      surface,
      variantIndex,
      sections,
      slideRefs,
      page: index + 1,
      total,
    };
  });
}

export function buildPreviewRenderContext(
  blockTypes: readonly string[],
  slideIndex: number,
  sections: string[] = [],
  slideRefs?: readonly SlideRef[],
): SlideRenderContext | undefined {
  // The admin sends block ids alongside block types so agenda links resolve to
  // the same pages in the preview as in the export.
  const inputs = blockTypes.map(
    (blockType, index) =>
      ({
        blockType,
        id: slideRefs?.[index]?.id ?? undefined,
        title: slideRefs?.[index]?.title ?? undefined,
      }) as ContextInput,
  );
  return buildDeckRenderContexts(inputs, sections)[slideIndex];
}
