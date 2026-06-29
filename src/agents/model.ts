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
import { StylePolicyError } from './prompts/style';

/**
 * Per-call wall-clock budget; the gateway buffers the whole non-streamed body.
 * omniroute (vs the old 9router) regularly takes >110s on the long structured
 * calls (structure/draft emit big tool-argument blobs), and an abort surfaces
 * as the opaque `finishReason=tripwire` — so the budget is generous. The
 * fire-and-forget agent route tolerates it (maxDuration 800s).
 */
const DEFAULT_TIMEOUT_MS = 300_000;

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

const DEFAULT_RESEARCH_MAX_STEPS = 6;

/** Gateway hiccups worth one retry (omniroute occasionally 502s under load). */
const TRANSIENT_RE =
  /bad gateway|gateway timeout|502|503|504|ECONNRESET|fetch failed|socket hang up/i;
const TRANSIENT_RETRIES = 2;
const TRANSIENT_BACKOFF_MS = 5_000;

async function withTransientRetry<R>(name: string, fn: () => Promise<R>): Promise<R> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (error) {
      const msg = String((error as Error)?.message ?? error);
      if (i >= TRANSIENT_RETRIES || !TRANSIENT_RE.test(msg)) throw error;
      console.warn(
        `[${name}] transient gateway error (retry ${i + 1}/${TRANSIENT_RETRIES}): ${msg}`,
      );
      await new Promise((r) => setTimeout(r, TRANSIENT_BACKOFF_MS * (i + 1)));
    }
  }
}

function textFromGenerateResult(res: unknown): string {
  const value = res as {
    text?: unknown;
    content?: unknown;
    object?: unknown;
    response?: { messages?: unknown };
  };
  if (typeof value.text === 'string') return value.text;
  if (typeof value.content === 'string') return value.content;
  if (Array.isArray(value.content)) {
    return value.content
      .map((part) =>
        part && typeof part === 'object' && 'text' in part
          ? String((part as { text?: unknown }).text ?? '')
          : '',
      )
      .filter(Boolean)
      .join('\n');
  }
  if (value.object !== undefined) return JSON.stringify(value.object);
  return '';
}

export async function researchWithSources({
  name,
  instructions,
  prompt,
  toolsets,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxSteps = DEFAULT_RESEARCH_MAX_STEPS,
}: {
  name: string;
  instructions: string;
  prompt: string;
  toolsets: unknown;
  timeoutMs?: number;
  maxSteps?: number;
}): Promise<string> {
  const agent = new Agent({
    id: name,
    name,
    instructions,
    model: draftModel,
  });

  const res = await withTransientRetry(name, () =>
    agent.generate(prompt as never, {
      toolsets: toolsets as never,
      maxSteps,
      abortSignal: AbortSignal.timeout(timeoutMs),
    }),
  );

  return textFromGenerateResult(res).trim();
}

export async function generateStructured<T>({
  name,
  instructions,
  schema,
  prompt,
  images,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRepairs = 1,
  validate,
  maxValidationRepairs = 1,
}: {
  name: string;
  instructions: string;
  schema: z.ZodType<T>;
  prompt: string;
  /** Optional images appended to the user turn (multimodal critique). */
  images?: ImagePart[];
  timeoutMs?: number;
  maxRepairs?: number;
  /** Optional semantic/deterministic validation after schema validation succeeds. */
  validate?: (value: T) => string[];
  maxValidationRepairs?: number;
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
  let schemaRepairs = 0;
  let validationRepairs = 0;
  for (;;) {
    // maxSteps:1 — we only need the validated args of the forced `emit` call
    // from the FIRST response. A second step would send the tool result back
    // with toolChoice still forced; omniroute's Claude identity rejects that
    // multi-turn shape ("Thinking may not be enabled when tool_choice forces
    // tool use", HTTP 400) even when the request sets thinking:disabled.
    const res = await withTransientRetry(name, () =>
      agent.generate(buildInput(userPrompt) as never, {
        toolChoice: 'required',
        maxSteps: 1,
        abortSignal: AbortSignal.timeout(timeoutMs),
      }),
    );

    const call = res.toolCalls?.find((c) => c?.payload?.toolName === 'emit');
    const args = call?.payload?.args;
    if (args === undefined) {
      throw new Error(
        `[${name}] model did not emit via the emit tool (finishReason=${res.finishReason})`,
      );
    }

    const parsed = schema.safeParse(args);
    if (!parsed.success) {
      if (schemaRepairs >= maxRepairs) throw parsed.error;
      schemaRepairs++;
      userPrompt = `${prompt}\n\n---\nLa sortie précédente a échoué la validation du schéma :\n${parsed.error.issues
        .map((i) => `- ${i.path.join('.') || '(racine)'} : ${i.message}`)
        .join(
          '\n',
        )}\nCorrige UNIQUEMENT ces champs et réémets via l'outil la sortie complète et conforme.`;
      continue;
    }

    const violations = validate?.(parsed.data) ?? [];
    if (violations.length === 0) return parsed.data;

    if (validationRepairs >= maxValidationRepairs) {
      throw new StylePolicyError(violations);
    }
    validationRepairs++;
    userPrompt = `${prompt}\n\n---\nLa sortie précédente respecte le schéma, mais viole le style rédactionnel informationnel :\n${violations
      .map((v) => `- ${v}`)
      .join(
        '\n',
      )}\nRéécris uniquement les formulations concernées : retire slogans, superlatifs, adjectifs décoratifs et points d'exclamation ; conserve les faits, le sens et le schéma complet ; réémets via l'outil la sortie complète et conforme.`;
  }
}
