import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const eyebrowZod = z.string().optional();
const surfaceZod = (gradient: boolean) =>
  (gradient
    ? z.enum(['dark', 'light', 'gradient'])
    : z.enum(['dark', 'light'])
  ).optional();

// image/imagePosition are intentionally omitted from AI drafting — they require an uploaded media id, not an LLM-generated value; authors add images in the admin.
const coverSchema = z.object({
  blockType: z.literal('cover'),
  eyebrow: eyebrowZod,
  title: z.string(),
  subtitle: z.string().optional(),
  footerLeft: z.string().optional(),
  footerRight: z.string().optional(),
  surface: surfaceZod(true),
});

const sectionSchema = z.object({
  blockType: z.literal('section'),
  number: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  surface: surfaceZod(false),
});

const statementSchema = z.object({
  blockType: z.literal('statement'),
  eyebrow: z.string().optional(),
  title: z.string(),
  body: z.string().optional(),
  footer: z.string().optional(),
});

// image/imagePosition are intentionally omitted from AI drafting — they require an uploaded media id, not an LLM-generated value; authors add images in the admin.
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
  eyebrow: eyebrowZod,
  title: z.string(),
  surface: surfaceZod(false),
  stats: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
});

const quotesSchema = z.object({
  blockType: z.literal('quotes'),
  eyebrow: z.string().optional(),
  title: z.string(),
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

const ctaSchema = z.object({
  blockType: z.literal('cta'),
  eyebrow: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  primaryAction: z.string().optional(),
  secondaryAction: z.string().optional(),
  footerNote: z.string().optional(),
});

// markdown is intentionally excluded — it is an admin-only escape-hatch block, not AI-draftable.
// Plain z.union, not z.discriminatedUnion: the latter serializes to JSON
// Schema `oneOf`, which OpenAI structured outputs rejects ("'oneOf' is not
// permitted"); z.union produces the accepted `anyOf`. The blockType literal
// in each member keeps validation equivalent.
const slideBlockSchema = z.union([
  coverSchema,
  sectionSchema,
  statementSchema,
  twoColsSchema,
  cardGridSchema,
  statsSchema,
  quotesSchema,
  ctaSchema,
]);

const slidesArraySchema = z.object({
  slides: z.array(slideBlockSchema).min(3).max(20),
});

const SYSTEM_PROMPT = `Tu génères des diapositives structurées à partir d'un brief en langage naturel.

Tu retournes un tableau de blocs (slides) typés. Chaque bloc a un champ "blockType" qui détermine sa mise en page. Ces blocs sont purement des LAYOUTS : ils ne portent aucune logique métier, seulement une structure visuelle réutilisable.

Layouts disponibles :

1. **cover** — Diapositive d'ouverture
   - eyebrow: accroche courte au-dessus du titre
   - title: titre principal (obligatoire)
   - subtitle: paragraphe descriptif
   - footerLeft / footerRight: textes en bas de slide
   - surface: "dark" | "light" | "gradient"

2. **section** — Intercalaire de section
   - number: numéro (ex. "01")
   - title: titre (obligatoire)
   - subtitle: description
   - surface: "dark" | "light"

3. **statement** — Affirmation ou citation mise en avant
   - eyebrow, title (obligatoire), body, footer

4. **twoCols** — Deux colonnes avec cartes à droite
   - eyebrow, title (obligatoire), intro, leftFooter
   - rightCards: [{title, description}]

5. **cardGrid** — Grille de cartes numérotées
   - eyebrow, title (obligatoire), sidebarText
   - columns: "2" | "3" | "4"
   - cards: [{number, title, description}]

6. **stats** — Chiffres clés en grille
   - eyebrow, title (obligatoire), surface
   - stats: [{value, label}]

7. **quotes** — Grille de citations
   - eyebrow, title (obligatoire)
   - quotes: [{quote, authorName, authorRole}]

8. **cta** — Diapositive centrée pour appel à l'action OU clôture (merci, contact, etc.)
   - eyebrow, title (obligatoire), subtitle
   - primaryAction / secondaryAction: libellés de boutons
   - footerNote: petit texte en bas

Règles :
- Commence TOUJOURS par un bloc "cover"
- Termine TOUJOURS par un bloc "cta"
- Utilise "section" pour structurer le contenu en parties
- Varie les layouts pour rendre la présentation dynamique
- Reste dans la langue du brief (français par défaut si ambigu)
- Génère entre 8 et 15 diapositives selon la complexité du brief
- Les textes doivent être concis et percutants`;

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

    // Generate slides via the configured OpenAI-compatible endpoint
    // (OpenAI direct, or a LiteLLM/OpenRouter proxy — model name must match
    // what that endpoint serves, hence OPENAI_MODEL).
    const llm = createOpenAI({
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY || '',
    });
    const { object } = await generateObject({
      model: llm(process.env.OPENAI_MODEL || 'gpt-5-mini'),
      schema: slidesArraySchema,
      system: SYSTEM_PROMPT,
      prompt: brief,
      temperature: 0.7,
      providerOptions: {
        openai: {
          // OpenAI strict mode rejects our schema (optional fields without
          // null, length bounds). Non-strict still guides the model with the
          // schema; Zod validates the result server-side either way.
          strictJsonSchema: false,
        },
      },
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
    // Authors get a readable French message; the raw provider error (LiteLLM
    // auth failures, model errors…) goes in `detail` for debugging.
    const detail = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      {
        error:
          'La génération a échoué : le service IA est indisponible ou mal configuré. Réessayez plus tard ou contactez un administrateur.',
        detail,
      },
      { status: 500 },
    );
  }
}
