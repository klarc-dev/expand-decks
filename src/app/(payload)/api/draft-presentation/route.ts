import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

const coverSchema = z.object({
  blockType: z.literal('cover'),
  eyebrow: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  footerLeft: z.string().optional(),
  footerRight: z.string().optional(),
  surface: z.enum(['dark', 'light', 'gradient']).optional(),
});

const sectionSchema = z.object({
  blockType: z.literal('section'),
  number: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  surface: z.enum(['dark', 'light']).optional(),
});

const statementSchema = z.object({
  blockType: z.literal('statement'),
  eyebrow: z.string().optional(),
  title: z.string(),
  body: z.string().optional(),
  footer: z.string().optional(),
});

const twoColsSchema = z.object({
  blockType: z.literal('twoCols'),
  eyebrow: z.string().optional(),
  title: z.string(),
  intro: z.string().optional(),
  leftFooter: z.string().optional(),
  rightCards: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
});

const cardGridSchema = z.object({
  blockType: z.literal('cardGrid'),
  eyebrow: z.string().optional(),
  title: z.string(),
  sidebarText: z.string().optional(),
  columns: z.enum(['2', '3', '4']).optional(),
  cards: z
    .array(
      z.object({
        number: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
});

const statsSchema = z.object({
  blockType: z.literal('stats'),
  eyebrow: z.string().optional(),
  title: z.string(),
  surface: z.enum(['dark', 'light']).optional(),
  stats: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
});

const testimonialsSchema = z.object({
  blockType: z.literal('testimonials'),
  eyebrow: z.string().optional(),
  title: z.string(),
  rating: z.string().optional(),
  quotes: z
    .array(
      z.object({
        quote: z.string(),
        authorName: z.string(),
        authorRole: z.string().optional(),
      }),
    )
    .optional(),
});

const officesSchema = z.object({
  blockType: z.literal('offices'),
  eyebrow: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  offices: z
    .array(
      z.object({
        name: z.string(),
        region: z.string().optional(),
        label: z.string().optional(),
        specialties: z.string().optional(),
      }),
    )
    .optional(),
});

const ctaSchema = z.object({
  blockType: z.literal('cta'),
  eyebrow: z.string().optional(),
  title: z.string(),
  primaryAction: z.string().optional(),
  secondaryAction: z.string().optional(),
  contactRows: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
});

const endSchema = z.object({
  blockType: z.literal('end'),
  wordmark: z.string().optional(),
  tagline: z.string().optional(),
  footerNote: z.string().optional(),
});

const slideBlockSchema = z.discriminatedUnion('blockType', [
  coverSchema,
  sectionSchema,
  statementSchema,
  twoColsSchema,
  cardGridSchema,
  statsSchema,
  testimonialsSchema,
  officesSchema,
  ctaSchema,
  endSchema,
]);

const slidesArraySchema = z.object({
  slides: z.array(slideBlockSchema).min(3).max(20),
});

const SYSTEM_PROMPT = `Tu es un expert en création de présentations professionnelles pour le cabinet de conseil Expand. Tu génères des diapositives structurées à partir d'un brief en langage naturel.

Tu dois retourner un tableau de blocs (slides) typés. Chaque bloc a un champ "blockType" qui détermine sa structure.

Types de blocs disponibles :

1. **cover** — Diapositive de couverture (toujours la première)
   - eyebrow: accroche courte au-dessus du titre
   - title: titre principal (obligatoire)
   - subtitle: paragraphe descriptif
   - footerLeft: texte en bas à gauche
   - footerRight: texte en bas à droite
   - surface: "dark" | "light" | "gradient"

2. **section** — Intercalaire de section
   - number: numéro de section (ex. "01")
   - title: titre de la section (obligatoire)
   - subtitle: description complémentaire
   - surface: "dark" | "light"

3. **statement** — Affirmation ou citation mise en avant
   - eyebrow: accroche
   - title: citation ou affirmation principale (obligatoire)
   - body: texte développant l'affirmation
   - footer: légende ou note

4. **twoCols** — Mise en page deux colonnes avec cartes
   - eyebrow: accroche (ex. "01 · Conseil financier")
   - title: titre principal (obligatoire)
   - intro: paragraphe d'introduction (colonne gauche)
   - leftFooter: texte ou statistique en bas de la colonne gauche
   - rightCards: tableau de cartes [{title, description}]

5. **cardGrid** — Grille de cartes numérotées
   - eyebrow: accroche
   - title: titre principal (obligatoire)
   - sidebarText: texte optionnel sur le côté
   - columns: "2" | "3" | "4"
   - cards: tableau [{number, title, description}]

6. **stats** — Chiffres clés
   - eyebrow: accroche
   - title: titre principal (obligatoire)
   - surface: "dark" | "light"
   - stats: tableau [{value, label}]

7. **testimonials** — Témoignages clients
   - eyebrow: accroche
   - title: titre (obligatoire)
   - rating: note globale (ex. "5/5 · 28 avis")
   - quotes: tableau [{quote, authorName, authorRole}]

8. **offices** — Implantations géographiques
   - eyebrow: accroche
   - title: titre (obligatoire)
   - subtitle: description
   - offices: tableau [{name, region, label, specialties}]

9. **cta** — Appel à l'action
   - eyebrow: question d'amorce
   - title: titre principal (obligatoire)
   - primaryAction: texte du bouton principal
   - secondaryAction: texte du lien secondaire
   - contactRows: tableau [{label, value}]

10. **end** — Diapositive de fin
    - wordmark: nom ou logo textuel
    - tagline: slogan
    - footerNote: texte en bas

Règles :
- Commence TOUJOURS par un bloc "cover"
- Termine TOUJOURS par un bloc "end"
- Utilise des sections ("section") pour structurer le contenu
- Varie les types de blocs pour rendre la présentation dynamique
- Tout le contenu DOIT être en français sauf indication contraire
- Génère entre 8 et 15 diapositives selon la complexité du brief
- Les textes doivent être professionnels, concis et percutants
- N'utilise PAS le bloc "markdown" (réservé aux administrateurs)`;

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });

    // Authenticate the user via Payload
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { presentationId, brief } = body;

    if (!presentationId || !brief) {
      return NextResponse.json(
        { error: 'presentationId et brief sont requis' },
        { status: 400 },
      );
    }

    // Verify the presentation exists and user has access
    const presentation = await payload.findByID({
      collection: 'presentations',
      id: presentationId,
      user,
    });

    if (!presentation) {
      return NextResponse.json({ error: 'Présentation introuvable' }, { status: 404 });
    }

    // Generate slides via Claude structured output
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-5'),
      schema: slidesArraySchema,
      system: SYSTEM_PROMPT,
      prompt: brief,
      temperature: 0.7,
    });

    // Write blocks to the presentation
    await payload.update({
      collection: 'presentations',
      id: presentationId,
      data: { slides: object.slides },
      user,
      context: { skipBuildQueue: true },
    });

    return NextResponse.json({
      success: true,
      slideCount: object.slides.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
