import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

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
 *    invents field names against a complex union schema. Structured-output callers
 *    should use **tool calling** (function calling), whose arguments the upstreams
 *    (both OpenAI and Anthropic) actually constrain to the JSON Schema.
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

/**
 * Default drafting model. MUST be namespaced for 9router (e.g. `cc/...`, `cx/...`).
 *
 * Drafting a structured multi-slide deck is a long, union-heavy structured-output
 * task; Opus holds up far better than Sonnet on long tool-call argument blobs, so
 * it is the default. Override per-deployment with `OPENAI_MODEL`.
 */
export const DRAFT_MODEL = process.env.OPENAI_MODEL || 'cc/claude-opus-4-8';

/**
 * Wrap fetch to normalise requests for the gateway:
 *
 * - Force `stream:false` when unset. Without this the gateway streams
 *   Anthropic (`cc/*`) responses and the SDK's non-streaming parser throws
 *   "Invalid JSON response".
 * - Force `thinking:{type:'disabled'}` when a tool call is forced. omniroute's
 *   Claude Code identity defaults thinking to `adaptive`, and Anthropic rejects
 *   thinking combined with a forced `tool_choice` ("Thinking may not be enabled
 *   when tool_choice forces tool use", HTTP 400). Every structured-output call
 *   in this app forces the single `emit` tool, so disabling thinking there is
 *   both required and harmless.
 */
export const forceNonStreamFetch: typeof fetch = async (input, init) => {
  if (init?.body && typeof init.body === 'string') {
    try {
      const parsed = JSON.parse(init.body) as Record<string, unknown>;
      let changed = false;
      if (parsed.stream === undefined) {
        parsed.stream = false;
        changed = true;
      }
      const tc = parsed.tool_choice as { type?: string } | string | undefined;
      const forcedTool =
        tc === 'required' ||
        (typeof tc === 'object' &&
          (tc?.type === 'function' || tc?.type === 'tool' || tc?.type === 'any'));
      if (forcedTool && parsed.thinking === undefined) {
        parsed.thinking = { type: 'disabled' };
        changed = true;
      }
      if (changed) init = { ...init, body: JSON.stringify(parsed) };
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
