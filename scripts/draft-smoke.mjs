import { draftPresentationSlides } from '../src/lib/draftPresentation.ts';

const DEFAULT_BRIEF =
  "Présentation de 6 diapositives sur les avantages du télétravail pour une PME : productivité, coûts, attractivité.";

const brief = process.argv[2] ?? DEFAULT_BRIEF;

try {
  const result = await draftPresentationSlides(brief);
  const blockTypes = result.slides.map((s) => s.blockType);
  console.log(`slides: ${result.slides.length}`);
  console.log(`blockTypes: ${blockTypes.join(', ')}`);
  process.exit(0);
} catch (error) {
  console.error('draft-smoke failed:', error);
  process.exit(1);
}
