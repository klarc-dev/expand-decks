/**
 * Shared operational contract for deck tooling and generated agent guidance.
 * Keep executable behavior in the command implementations and expose its public
 * interface here so CLI help and the repository-local skill cannot drift apart.
 */
export const SLIDES_OPERATIONS = {
  local: [
    {
      command: 'NODE_ENV=development pnpm deck:seed <name>',
      purpose:
        'Run the typed scripts/seed-<name>.ts authoring workflow against the configured local database.',
    },
    {
      command: 'NODE_ENV=development pnpm deck:build <presentationId>',
      purpose:
        'Run the real Slidev build path for one presentation against the configured local database.',
    },
  ],
  production: [
    {
      verb: 'status',
      usage: 'pnpm prod status',
      purpose: 'Show live containers, deployed SHA versus local HEAD, and the Payload job queue.',
      effect: 'read-only',
    },
    {
      verb: 'run',
      usage: 'pnpm prod run <scripts/file.ts> [args...] [--yes] [--allow-dirty]',
      purpose:
        'Execute one top-level repository script inside the production Payload container, then restore the deployed copy.',
      effect: 'script-defined',
      safeguards: [
        'Only files directly under scripts/ are accepted.',
        'Scripts named seed-* or set-* require --yes.',
        'An uncommitted script is refused unless --allow-dirty is explicit.',
      ],
    },
    {
      verb: 'pull',
      usage: 'pnpm prod pull [--no-media] [--name <db>] [--force]',
      purpose:
        'Restore a production dump into a fresh local database and optionally mirror media locally.',
      effect: 'production-read/local-write',
      safeguards: ['This operation never writes to production.'],
    },
  ],
  externalBoundaries: [
    {
      method: 'POST',
      path: '/api/slide-layout',
      purpose:
        'Authenticated layout analysis, recommendation, preview, atomic apply, stale rejection, loss diagnostics, and undo.',
    },
  ],
  mcp: {
    available: false,
    policy:
      'The retired deck MCP server must not be restored. External integrations use the authenticated canonical REST boundary.',
    decisionRecord: 'docs/agents/issue-45-resolution.md',
  },
};

export function productionUsage() {
  return [
    'Production deck operations:',
    ...SLIDES_OPERATIONS.production.map(
      (operation) => `  ${operation.usage}\n      ${operation.purpose}`,
    ),
    '',
    `MCP: ${SLIDES_OPERATIONS.mcp.policy}`,
  ].join('\n');
}
