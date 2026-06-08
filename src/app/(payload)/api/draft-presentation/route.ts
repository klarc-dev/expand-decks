import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';
import type { Presentation } from '@/payload-types';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, NoObjectGeneratedError } from 'ai';
import { z } from 'zod';

import { COLLECTIONS } from '@/lib/collections';
import { CTX } from '@/lib/context';
import { ROLES } from '@/access/roles';
import { ALL_SPECS } from '@/blocks/spec';
import { emitSlidesArraySchema } from '@/blocks/spec/emit/emitDraftSchema';
import { buildSystemPrompt } from '@/blocks/spec/emit/emitPromptSection';

const requestSchema = z.object({
  presentationId: z.union([z.string().min(1).max(128), z.number()]),
  brief: z.string().trim().min(10).max(8000),
});

// Derived from the block-spec SSOT: markdown drops out via aiDraftable:false,
// image/imagePosition via per-field ai:false.
const slidesArraySchema = emitSlidesArraySchema(ALL_SPECS);

const SYSTEM_PROMPT = buildSystemPrompt(
  ALL_SPECS.flatMap((spec) => (spec.promptMeta ? [spec.promptMeta] : [])),
);

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });

    // Authenticate the user via Payload
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'presentationId et brief sont requis' },
        { status: 400 },
      );
    }
    const { presentationId, brief } = parsed.data;

    // Verify the presentation exists and user has access
    const presentation = await payload.findByID({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      user,
    });

    if (!presentation) {
      return NextResponse.json({ error: 'Présentation introuvable' }, { status: 404 });
    }

    // Authorize the WRITE before spending LLM tokens: only an admin or the
    // presentation owner may draft into it (read access alone is broader).
    const createdById =
      typeof presentation.createdBy === 'object'
        ? presentation.createdBy?.id
        : presentation.createdBy;
    if (user.role !== ROLES.admin && createdById !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
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

    // Zod validated the structured output against the block-spec union, so the
    // slides match the generated Presentation['slides'] union at runtime.
    const slides = object.slides as Presentation['slides'];

    // Write blocks to the presentation
    await payload.update({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      data: { slides },
      user,
      context: { [CTX.skipBuildQueue]: true },
    });

    return NextResponse.json({
      success: true,
      slideCount: object.slides.length,
    });
  } catch (error) {
    // Never return raw provider errors to the client — they can leak base URLs,
    // model names, and config hints. Log server-side; send a stable message.
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error('[draft-presentation] invalid model output', {
        finishReason: error.finishReason,
        cause: error.cause instanceof Error ? error.cause.message : undefined,
      });
      return NextResponse.json(
        {
          error:
            'La génération a produit un format inattendu. Simplifiez le brief et réessayez.',
        },
        { status: 422 },
      );
    }
    console.error('[draft-presentation] generation failed', error);
    return NextResponse.json(
      {
        error:
          'La génération a échoué : le service IA est indisponible ou mal configuré. Réessayez plus tard ou contactez un administrateur.',
      },
      { status: 500 },
    );
  }
}
