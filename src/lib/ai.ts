import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * AI provider wired to CloudCLIProxy's OpenAI-compatible endpoint. The default
 * model is the proxy's stable deployment alias (configured through
 * `OPENAI_MODEL`, with `high` as the application fallback) rather than a
 * concrete model id. A pinned id can enter a days-long per-credential cooldown
 * upstream, which surfaces as a 429 naming the failing provider and takes
 * drafting down until someone edits an env var.
 *
 * Structured-output callers use tool calling instead of `json_schema`, which
 * keeps the contract portable across OpenAI-compatible proxies.
 */

const baseURL = process.env.CLIPROXYAPI_BASE_URL || '';
const apiKey = process.env.CLIPROXYAPI_KEY || '';

/** CloudCLIProxy model routing. Phase aliases can be evaluated independently. */
export type AgentModelTier = 'research' | 'draft' | 'judge' | 'visual';

export function modelForTier(_tier: AgentModelTier): string {
  return process.env.OPENAI_MODEL || 'high';
}

/**
 * Wrap fetch to normalise requests for the gateway:
 *
 * Force `stream:false` when unset. The structured generation path expects one
 * JSON response and must not depend on a proxy's streaming default.
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
      if (changed) init = { ...init, body: JSON.stringify(parsed) };
    } catch {
      // Non-JSON body (shouldn't happen for chat/completions) — leave untouched.
    }
  }
  return fetch(input, init);
};

export const cloudCLIProxy = createOpenAICompatible({
  name: 'cloudcliproxy',
  baseURL,
  apiKey,
  fetch: forceNonStreamFetch,
});
