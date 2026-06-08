import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, tool, type ToolSet } from 'ai';
import type { z } from 'zod';

/**
 * AI provider wired to 9router (a self-hosted, OpenAI-compatible gateway that
 * also fronts Anthropic). One key, multi-provider, namespaced model IDs
 * (`cc/claude-*`, `cx/gpt-*`, `ds/deepseek-*`). Any OpenAI-compatible endpoint
 * works via the same three env vars — 9router is just the configured target.
 *
 * Two non-obvious constraints drive the shape of this module:
 *
 * 1. **No `json_schema` structured outputs.** 9router (like most LiteLLM-style
 *    proxies) does not implement OpenAI's `response_format: json_schema`. It
 *    only supports `json_object`, which is a *hint*, not enforcement — the model
 *    invents field names against a complex union schema. So we do NOT use
 *    `generateObject`/`response_format`; we use **tool calling** (function
 *    calling), whose arguments the upstreams (both OpenAI and Anthropic)
 *    actually constrain to the JSON Schema. `draftObject` forces a single tool
 *    and reads its validated input.
 *
 * 2. **9router force-streams Anthropic models.** For `cc/*` IDs the gateway
 *    returns `text/event-stream` even on a non-streaming request *unless*
 *    `stream:false` is sent explicitly. The AI SDK's non-streaming path omits
 *    the field, so Claude responses arrive as a malformed SSE/JSON hybrid that
 *    no parser accepts. `forceNonStreamFetch` injects `stream:false` so Claude
 *    AND GPT both come back as clean JSON through one provider config.
 */

const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const apiKey = process.env.OPENAI_API_KEY || '';

/** Default drafting model. MUST be namespaced for 9router (e.g. `cc/...`, `cx/...`). */
export const DRAFT_MODEL = process.env.OPENAI_MODEL || 'cc/claude-sonnet-4-6';

/**
 * Wrap fetch to force `stream:false` on requests that don't already set it.
 * Without this, 9router streams Anthropic (`cc/*`) responses and the SDK's
 * non-streaming parser throws "Invalid JSON response".
 */
const forceNonStreamFetch: typeof fetch = async (input, init) => {
  if (init?.body && typeof init.body === 'string') {
    try {
      const parsed = JSON.parse(init.body) as Record<string, unknown>;
      if (parsed.stream === undefined) {
        parsed.stream = false;
        init = { ...init, body: JSON.stringify(parsed) };
      }
    } catch {
      // Non-JSON body (shouldn't happen for chat/completions) — leave untouched.
    }
  }
  return fetch(input, init);
};

export const nineRouter = createOpenAICompatible({
  name: '9router',
  baseURL,
  apiKey,
  fetch: forceNonStreamFetch,
});

/**
 * Generate a schema-validated object via tool calling against an
 * OpenAI-compatible gateway. This is the proxy-safe replacement for
 * `generateObject`: the schema is registered as a single forced tool, so the
 * model emits structured tool-call arguments (constrained by the upstream)
 * rather than free-form JSON. The AI SDK validates the arguments against
 * `schema` natively before returning.
 *
 * `temperature` is intentionally NOT set: newer models (e.g. `cc/claude-opus-4-8`)
 * reject the parameter ("temperature is deprecated for this model"), and the
 * default sampling is fine for drafting.
 *
 * @throws if the model does not call the tool or its arguments fail validation
 *         (surface this to the caller as a 422 — the output was unusable).
 */
export async function draftObject<T>({
  model,
  schema,
  system,
  prompt,
}: {
  model: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
}): Promise<T> {
  const tools = {
    emit: tool({
      description: 'Émettre les diapositives finales structurées.',
      inputSchema: schema,
    }),
  } satisfies ToolSet;

  const { toolCalls } = await generateText({
    model: nineRouter(model),
    system,
    prompt,
    tools,
    toolChoice: { type: 'tool', toolName: 'emit' },
  });

  const call = toolCalls[0];
  if (!call || call.toolName !== 'emit') {
    throw new Error('Le modèle n’a pas appelé l’outil de génération.');
  }
  // The AI SDK has already validated `input` against the tool's inputSchema.
  return call.input as T;
}
