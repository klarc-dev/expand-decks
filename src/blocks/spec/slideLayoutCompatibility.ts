import { analyzeSlideLayouts, type LayoutChangeAnalysis } from './slideContent';
import { SPEC_BY_TYPE } from './index';

export type SlideLayoutCompatibility = LayoutChangeAnalysis;

/** Compatibility is now a projection of the unified slide-content adapters. */
export function assessSlideLayoutCompatibility(
  slide: Record<string, unknown>,
  targetLayouts: readonly string[],
): SlideLayoutCompatibility[] {
  const sourceLayout = typeof slide.blockType === 'string' ? slide.blockType : '';
  if (!SPEC_BY_TYPE.has(sourceLayout)) {
    throw new Error(`Layout source inconnu : ${sourceLayout}`);
  }
  for (const target of targetLayouts) {
    if (!SPEC_BY_TYPE.has(target)) throw new Error(`Layout cible inconnu : ${target}`);
  }
  const ranked = analyzeSlideLayouts(slide, targetLayouts);
  const byLayout = new Map(ranked.map((result) => [result.layout, result]));
  return targetLayouts.map((layout) => byLayout.get(layout)!);
}
