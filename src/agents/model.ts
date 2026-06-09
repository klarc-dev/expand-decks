/**
 * Mastra-native structured generation against the 9router gateway.
 *
 * Phase 0 spike (scripts/mastra-spike.mjs) established three facts for
 * `@mastra/core@1.41.0` + 9router:
 *   1. Feeding the app's existing `nineRouter(DRAFT_MODEL)` (which bakes in
 *      `forceNonStreamFetch`) to a Mastra Agent round-trips NON-STREAMED — no
 *      SSE/parse error. No custom MastraModelGateway class is required.
 *   2. Mastra's `structuredOutput`/`experimental_output` is prompt-coercion the
 *      proxy does not enforce — the model invents its own shape. Do NOT use it.
 *   3. Forced TOOL-CALLING works and is the structured-output mechanism: one
 *      `emit` tool whose inputSchema is the Zod schema, `toolChoice:'required'`,
 *      then read the validated args from `res.toolCalls[0].payload.args`.
 *
 * `generateStructured` is the single LLM entry point for every agent in this
 * runtime — the Mastra-native replacement for `src/lib/ai.ts` `draftObject`.
 */
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import type { z } from 'zod';

import { DRAFT_MODEL, nineRouter } from '../lib/ai';

/** Per-call wall-clock budget; the gateway buffers the whole non-streamed body. */
const DEFAULT_TIMEOUT_MS = 110_000;

/**
 * The model instance every agent shares (forceNonStreamFetch is baked in).
 *
 * Typed as `any` at this one boundary: `nineRouter` is built from the app's
 * `@ai-sdk/openai-compatible@2` provider, while `@mastra/core` bundles its own
 * AI-SDK provider types (LanguageModelV3). The two are runtime-compatible (proven
 * by the live smokes) but their structural types don't unify. The cast is
 * isolated here so every call site stays fully typed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const draftModel = nineRouter(DRAFT_MODEL) as any;

/**
 * Run a one-shot structured generation: build a throwaway Agent with a single
 * forced `emit` tool, capture its validated arguments.
 *
 * @throws if the model never calls the tool or the args fail Zod validation.
 */
/** An image part for multimodal prompts (e.g. a slide PNG to critique). */
export type ImagePart = { base64: string; mimeType?: string };

export async function generateStructured<T>({
  name,
  instructions,
  schema,
  prompt,
  images,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRepairs = 1,
}: {
  name: string;
  instructions: string;
  schema: z.ZodType<T>;
  prompt: string;
  /** Optional images appended to the user turn (multimodal critique). */
  images?: ImagePart[];
  timeoutMs?: number;
  maxRepairs?: number;
}): Promise<T> {
  const emit = createTool({
    id: 'emit',
    description: 'Emit the final structured result. Call this exactly once.',
    inputSchema: schema,
    execute: async () => ({ ok: true }),
  });

  const agent = new Agent({
    id: name,
    name,
    instructions: `${instructions}\n\nYou MUST call the \`emit\` tool exactly once with the result. Do not write prose.`,
    model: draftModel,
    tools: { emit },
  });

  // Build the user turn: plain string, or a content-parts message when images
  // are present (AI SDK v5 image part shape).
  const buildInput = (text: string) =>
    images?.length
      ? [
          {
            role: 'user' as const,
            content: [
              { type: 'text' as const, text },
              ...images.map((img) => ({
                type: 'image' as const,
                // Correctly-typed data URL. The first multimodal attempt reached
                // Claude and only failed because the SDK defaulted the label to
                // image/jpeg; an explicit image/png data URL + mediaType fixes it.
                image: `data:${img.mimeType ?? 'image/png'};base64,${img.base64}`,
                mediaType: img.mimeType ?? 'image/png',
              })),
            ],
          },
        ]
      : text;

  // Tool-calling constrains the SHAPE, but Zod refinements (array vs string,
  // min/max, enums) still slip through — the model can emit `cards: "..."` for
  // an array field. The repair turn re-states the prompt plus the validation
  // error so the model corrects only what failed (mirrors lib/ai.ts draftObject).
  let userPrompt = prompt;
  for (let attempt = 0; ; attempt++) {
    const res = await agent.generate(buildInput(userPrompt) as never, {
      toolChoice: 'required',
      maxSteps: 2,
      abortSignal: AbortSignal.timeout(timeoutMs),
    });

    const call = res.toolCalls?.find((c) => c?.payload?.toolName === 'emit') ?? res.toolCalls?.[0];
    const args = call?.payload?.args;
    if (args === undefined) {
      throw new Error(
        `[${name}] model did not emit structured output (finishReason=${res.finishReason})`,
      );
    }

    const parsed = schema.safeParse(args);
    if (parsed.success) return parsed.data;

    if (attempt >= maxRepairs) throw parsed.error;
    userPrompt = `${prompt}\n\n---\nLa sortie précédente a échoué la validation du schéma :\n${parsed.error.issues
      .map((i) => `- ${i.path.join('.') || '(racine)'} : ${i.message}`)
      .join(
        '\n',
      )}\nCorrige UNIQUEMENT ces champs et réémets via l'outil la sortie complète et conforme.`;
  }
}
