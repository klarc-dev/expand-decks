import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * AI provider wired to CloudCLIProxy's OpenAI-compatible endpoint. The proxy's
 * stable `high` alias owns upstream model selection, so application code does
 * not carry provider-specific model IDs or stale routing policy.
 *
 * Structured-output callers use tool calling instead of `json_schema`, which
 * keeps the contract portable across OpenAI-compatible proxies.
 */

const baseURL = process.env.OPENAI_BASE_URL || 'https://klarc.tail769c37.ts.net:8317/v1';
const apiKey = process.env.OPENAI_API_KEY || '';

/** CloudCLIProxy's high-quality routing alias. Override only for explicit tests. */
export const DRAFT_MODEL = process.env.OPENAI_MODEL || 'high';

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
