import { AsyncLocalStorage } from 'node:async_hooks';
import { z } from 'zod';

import { forceNonStreamFetch } from './ai';

export const agentModelSchema = z
  .string()
  .trim()
  .min(1, 'Le modèle est requis')
  .max(128, 'Le nom du modèle est trop long')
  .regex(/^[A-Za-z0-9._:/-]+$/, 'Le nom du modèle contient des caractères invalides');

export const DEFAULT_AGENT_MODEL = 'high';

const agentModelStorage = new AsyncLocalStorage<string>();

export function activeAgentModel(): string | undefined {
  return agentModelStorage.getStore();
}

export function withAgentModel<T>(model: string, run: () => Promise<T>): Promise<T> {
  return agentModelStorage.run(agentModelSchema.parse(model), run);
}

export type ModelVerification = {
  model: string;
  resolvedModel?: string;
};

type ChatCompletionProbe = {
  model?: unknown;
  choices?: Array<{
    message?: {
      tool_calls?: Array<{
        function?: { name?: unknown; arguments?: unknown };
      }>;
    };
  }>;
  error?: { message?: unknown };
};

/**
 * Verify a model with the exact capability deck generation requires: a forced
 * tool call through the configured CloudCLIProxy gateway. Listing a model is
 * insufficient because a listed alias may be cooling down or lack tool support.
 */
export async function verifyAgentModel(modelInput: unknown): Promise<ModelVerification> {
  const model = agentModelSchema.parse(modelInput);
  const baseURL =
    process.env.CLIPROXYAPI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://klarc.tail769c37.ts.net:8317/v1';
  const apiKey = process.env.CLIPROXYAPI_KEY || process.env.OPENAI_API_KEY || '';
  if (!apiKey) throw new Error('Clé CloudCLIProxy absente');

  const response = await forceNonStreamFetch(`${baseURL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'user', content: 'Call the verify tool exactly once.' }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'verify',
            description: 'Confirm tool calling support.',
            parameters: {
              type: 'object',
              additionalProperties: false,
              properties: { ok: { type: 'boolean', const: true } },
              required: ['ok'],
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'verify' } },
    }),
  });

  const payload = (await response.json().catch(() => null)) as ChatCompletionProbe | null;
  if (!response.ok) {
    const upstream =
      payload?.error && typeof payload.error.message === 'string'
        ? payload.error.message
        : `HTTP ${response.status}`;
    throw new Error(`Le modèle « ${model} » ne répond pas via CloudCLIProxy : ${upstream}`);
  }

  const call = payload?.choices?.[0]?.message?.tool_calls?.find(
    (candidate) => candidate.function?.name === 'verify',
  );
  if (!call || typeof call.function?.arguments !== 'string') {
    throw new Error(`Le modèle « ${model} » ne prend pas en charge l'appel d'outil requis`);
  }
  try {
    const args = JSON.parse(call.function.arguments) as { ok?: unknown };
    if (args.ok !== true) throw new Error('invalid verification payload');
  } catch {
    throw new Error(`Le modèle « ${model} » a renvoyé un appel d'outil invalide`);
  }

  return {
    model,
    ...(typeof payload?.model === 'string' ? { resolvedModel: payload.model } : {}),
  };
}
