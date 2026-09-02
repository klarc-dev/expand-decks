import { createTool } from '@mastra/core/tools';
import { MCPServer } from '@mastra/mcp';
import { z } from 'zod';

import { WRITABLE_SLIDE_SCHEMA } from '@/blocks/spec';
import { agentDraftStartSchema } from '@/lib/agentDraftContract';
import { slideRevisionSchema } from '@/lib/deckCrudContract';
import { AGENT_TIME_TRAVEL_STEPS } from '@/jobs/agentRunLifecycle';

const id = z.union([z.string().min(1).max(128), z.number()]);
const runId = z.string().min(1).max(128);
const slideIndex = z.number().int().min(0);

const deckCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }),
  z.object({ action: z.literal('get'), deckId: id }),
  z.object({
    action: z.literal('create'),
    title: z.string().trim().min(1),
    organisation: id,
    language: z.enum(['fr', 'en']).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
  }),
  z.object({
    action: z.literal('update'),
    deckId: id,
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({ action: z.literal('delete'), deckId: id }),
  z.object({ action: z.literal('build'), deckId: id }),
  z.object({ action: z.literal('sources') }),
]);

const slideCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list'), deckId: id }),
  z.object({ action: z.literal('get'), deckId: id, slideIndex }),
  z.object({
    action: z.literal('create'),
    deckId: id,
    index: slideIndex.optional(),
    slide: WRITABLE_SLIDE_SCHEMA,
  }),
  z.object({ action: z.literal('update'), deckId: id, slideIndex, slide: WRITABLE_SLIDE_SCHEMA }),
  z.object({ action: z.literal('delete'), deckId: id, slideIndex }),
  z.object({ action: z.literal('move'), deckId: id, slideIndex, toIndex: slideIndex }),
  slideRevisionSchema
    .omit({ presentationId: true })
    .extend({ action: z.literal('revise'), deckId: id }),
]);

const workflowCommandSchema = z.discriminatedUnion('action', [
  agentDraftStartSchema.extend({ action: z.literal('start') }),
  z.object({ action: z.literal('status'), runId }),
  z.object({ action: z.literal('cancel'), runId }),
  z.object({ action: z.literal('restart'), runId }),
  z.object({ action: z.literal('resume'), runId, approved: z.boolean() }),
  z.object({ action: z.literal('time-travel'), runId, step: z.enum(AGENT_TIME_TRAVEL_STEPS) }),
]);

const deckSchema = z.object({ command: deckCommandSchema });
const slideSchema = z.object({ command: slideCommandSchema });
const workflowSchema = z.object({ command: workflowCommandSchema });

async function request(path: string, options: { method?: string; body?: unknown } = {}) {
  const baseUrl = process.env.DECK_API_URL?.replace(/\/$/, '');
  const apiKey = process.env.DECK_API_KEY;
  if (!baseUrl || !apiKey) throw new Error('DECK_API_URL and DECK_API_KEY are required');

  const { body, method = body === undefined ? 'GET' : 'POST' } = options;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: apiKey.startsWith('users API-Key ') ? apiKey : `users API-Key ${apiKey}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Deck API ${response.status}: ${data.error ?? response.statusText}`);
  }
  return data;
}

export const deckMcpTools = {
  deck: createTool({
    id: 'deck',
    description: 'List, get, create, update, delete, or build decks, and list workflow sources.',
    inputSchema: deckSchema,
    execute: ({ command: input }) => {
      switch (input.action) {
        case 'list':
          return request('/api/presentations?depth=0&limit=100');
        case 'get':
          return request(`/api/presentations/${input.deckId}?depth=0`);
        case 'create': {
          const { action: _, ...data } = input;
          return request('/api/presentations', { body: data });
        }
        case 'update':
          return request(`/api/presentations/${input.deckId}`, {
            method: 'PATCH',
            body: input.data,
          });
        case 'delete':
          return request(`/api/presentations/${input.deckId}`, { method: 'DELETE' });
        case 'build':
          return request(`/api/presentations/${input.deckId}/build`, { body: {} });
        case 'sources':
          return request('/api/agent-sources');
      }
    },
  }),
  slide: createTool({
    id: 'slide',
    description: 'List, get, create, update, delete, move, or AI-revise slides in a deck.',
    inputSchema: slideSchema,
    execute: ({ command: input }) => {
      switch (input.action) {
        case 'list':
          return request(`/api/deck-slides?deckId=${encodeURIComponent(input.deckId)}`);
        case 'get':
          return request(
            `/api/deck-slides?deckId=${encodeURIComponent(input.deckId)}&slideIndex=${input.slideIndex}`,
          );
        case 'revise': {
          const { action: _, deckId, ...data } = input;
          return request('/api/revise-slide', {
            body: { presentationId: deckId, ...data },
          });
        }
        default:
          return request('/api/deck-slides', { body: input });
      }
    },
  }),
  deck_workflow: createTool({
    id: 'deck_workflow',
    description: 'Start, inspect, resume, cancel, restart, or time-travel a durable deck workflow.',
    inputSchema: workflowSchema,
    execute: ({ command: input }) => {
      if (input.action === 'start') {
        const { action: _, ...data } = input;
        return request('/api/agent-draft', { body: data });
      }
      if (input.action === 'status') {
        return request(`/api/agent-draft/${encodeURIComponent(input.runId)}`);
      }
      const { runId, ...command } = input;
      return request(`/api/agent-draft/${encodeURIComponent(runId)}`, { body: command });
    },
  }),
};

export const deckMcpServer = new MCPServer({
  id: 'expand-decks',
  name: 'Expand Decks',
  version: '1.0.0',
  description: 'Durable access to Expand presentation workflows.',
  tools: deckMcpTools,
});
