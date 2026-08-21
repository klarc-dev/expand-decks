import { ALL_SPECS } from '../blocks/spec';
import { aiSchemaOf } from '../blocks/spec/dsl';
import { languageInstruction, type DeckLanguage } from './language';
import { generateStructured } from './model';
import { buildWriterLayoutPrompt } from './prompts/catalog';
import { findInformationalStyleViolations } from './prompts/style';

const SPEC_BY_TYPE = new Map(ALL_SPECS.map((spec) => [spec.blockType, spec]));

/** Rewrite one existing slide, preserving its selected layout and using its block schema. */
export async function reviseSlide({
  instruction,
  language,
  slide,
}: {
  instruction: string;
  language: DeckLanguage;
  slide: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const blockType = typeof slide.blockType === 'string' ? slide.blockType : '';
  const spec = SPEC_BY_TYPE.get(blockType);
  if (!spec) throw new Error(`Unknown slide blockType: ${blockType}`);
  if (!spec.aiDraftable) throw new Error(`Slide blockType is not AI-draftable: ${blockType}`);

  const result = await generateStructured<Record<string, unknown>>({
    name: `slide-revision:${blockType}`,
    instructions: `Tu révises UNE seule diapositive existante, sans toucher au reste de la présentation.\n\n${buildWriterLayoutPrompt(blockType)}\n\n${languageInstruction(language)}\n\nConserve le blockType imposé. Préserve les faits et éléments non concernés. Applique seulement la demande de l'auteur.`,
    schema: aiSchemaOf(spec) as never,
    prompt: `DIAPOSITIVE EXISTANTE :\n${JSON.stringify(slide, null, 2)}\n\n---\n\nDEMANDE DE MODIFICATION :\n${instruction}`,
    validate: findInformationalStyleViolations,
    maxValidationRepairs: 3,
  });

  return { ...result, blockType };
}
