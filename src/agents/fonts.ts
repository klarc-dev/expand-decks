import { z } from 'zod';

import { listGoogleFonts } from '@/lib/googleFonts';

import { generateStructured } from './model';

export type FontPair = { headingFont: string; bodyFont: string };

const FontPairSchema = z.object({
  headingFont: z.string(),
  bodyFont: z.string(),
});

const FALLBACK_PAIR: FontPair = { headingFont: 'Gilroy', bodyFont: 'Roboto' };

export async function chooseFontPairForBrief(brief: string): Promise<FontPair> {
  const catalog = await listGoogleFonts({ sort: 'popularity' });
  const families = catalog.fonts
    .map((f) => f.family)
    .filter(Boolean)
    .slice(0, 80);
  if (families.length < 2) return FALLBACK_PAIR;

  const result = await generateStructured({
    name: 'font-pair',
    instructions: `Tu es directeur artistique typographique. Choisis une paire de familles Google Fonts pour une présentation professionnelle.

Contraintes :
- Choisis uniquement parmi la liste fournie.
- headingFont doit être expressive mais lisible pour titres de slides.
- bodyFont doit être très lisible pour texte courant.
- Évite deux polices trop décoratives ensemble.
- Réponds uniquement via l'outil structuré.`,
    schema: FontPairSchema,
    prompt: `Brief :
${brief}

Familles disponibles :
${families.join(', ')}`,
    validate: (pair) => {
      const allowed = new Set(families);
      const errors: string[] = [];
      if (!allowed.has(pair.headingFont))
        errors.push('headingFont must be from the provided catalog');
      if (!allowed.has(pair.bodyFont)) errors.push('bodyFont must be from the provided catalog');
      return errors;
    },
    maxValidationRepairs: 2,
  });

  return result;
}
