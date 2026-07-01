import type { SlideBlock } from './renderers';
import { slideTone } from './slideTone';
import type { RenderCtx, Surface } from './utils';

type ContextInput = Pick<SlideBlock, 'blockType'> & { title?: unknown };

export type SlideRenderContext = RenderCtx & {
  surface: Surface;
  sections: string[];
  page: number;
  total: number;
};

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
  const total = slides.length;

  return slides.map((block, index) => {
    const surface = slideTone(block.blockType, prevTone);
    prevTone = surface;
    const variantIndex = block.blockType === 'statement' ? statementIndex++ : undefined;
    return {
      surface,
      variantIndex,
      sections,
      page: index + 1,
      total,
    };
  });
}

export function buildPreviewRenderContext(
  blockTypes: readonly string[],
  slideIndex: number,
  sections: string[] = [],
): SlideRenderContext | undefined {
  return buildDeckRenderContexts(
    blockTypes.map((blockType) => ({ blockType }) as ContextInput),
    sections,
  )[slideIndex];
}
