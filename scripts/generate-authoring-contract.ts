import { z } from 'zod';
import { type AuthoringOperation, authoringOperations } from './slides-authoring';

function jsonSchema(schema: z.ZodType) {
  const { $schema: _dialect, ...projected } = z.toJSONSchema(schema, { io: 'input' });
  return projected;
}

export function generateAuthoringContract(
  operations: readonly AuthoringOperation[] = authoringOperations,
) {
  const paths: Record<string, Record<string, object>> = {};
  const ids = new Set<string>();
  for (const {
    id,
    path,
    method,
    description,
    select,
    parameters,
    body,
    native,
    write,
    multipart,
  } of operations) {
    if (!/^[a-z][a-z0-9_]*$/.test(id) || ids.has(id) || paths[path]?.[method]) {
      throw new Error(`Duplicate or invalid authoring operation: ${id}`);
    }
    const placeholders = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
    const pathArgs = (parameters ?? []).filter((parameter) => parameter.in === 'path');
    if (
      placeholders.length !== pathArgs.length ||
      pathArgs.some((parameter) => !placeholders.includes(parameter.name))
    ) {
      throw new Error(`Unresolved authoring path: ${path}`);
    }
    ids.add(id);
    paths[path] ??= {};
    paths[path][method] = {
      operationId: id,
      description,
      'x-slides-select': select,
      'x-slides-write': Boolean(write),
      ...(native ? { 'x-slides-native': true } : {}),
      ...(parameters?.length && {
        parameters: parameters.map((parameter) => ({
          ...parameter,
          required: parameter.in === 'path' || parameter.required === true,
          schema: jsonSchema(parameter.schema),
        })),
      }),
      ...(body && {
        requestBody: {
          required: true,
          content: {
            [multipart ? 'multipart/form-data' : 'application/json']: { schema: jsonSchema(body) },
          },
        },
      }),
      responses: {
        '2XX': {
          description: 'Authorised Slides result',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    };
  }
  return { openapi: '3.1.0', info: { title: 'Slides authoring', version: '1.0.0' }, paths };
}

export function renderAuthoringTools() {
  const rows = authoringOperations.map(
    ({ id, description, write }) => `| \`${id}\` | ${write ? 'Action' : 'Read'} | ${description} |`,
  );
  return [
    '<!-- GENERATED FILE. Run pnpm generate:agent-skills. Do not edit manually. -->',
    '# LobeHub authoring tools',
    '',
    'These tools are available only if a personal authenticated Slides connector has been configured. The skill alone grants no access.',
    '',
    '- Create a deck with typed slides, then use `get_deck_outputs` to check the native build and open its protected export while signed into Slides.',
    '- Use the slide commands to edit one slide without replacing the rest. Fetch the latest revision before writing; do not replay a write whose outcome is unknown.',
    '- For deletion, send the confirmation link to the human. Never attempt to perform browser confirmation on their behalf.',
    '- Request permission before any costly draft, rebuild, visibility-affecting change or other write. Reconcile uncertain writes with list/read/status tools before considering a retry.',
    '- If the connector is unavailable, preserve the local authoring workflow rather than inventing tools, credentials or public links.',
    '',
    '| Tool | Effect | Use |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}
