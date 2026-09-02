import type { Access, CollectionConfig, FieldHook } from 'payload';

import { ROLES } from '../access/roles';
import { COLLECTIONS } from '../lib/collections';

const runOwnerAccess: Access = async ({ req, id }) => {
  const user = req.user;
  if (!user) return false;
  if (user.role === ROLES.admin) return true;
  if (!id) return { createdBy: { equals: user.id } };
  const run = await req.payload.findByID({
    collection: COLLECTIONS.agentRuns,
    id,
    depth: 0,
    disableErrors: true,
  });
  const creator = typeof run?.createdBy === 'object' ? run.createdBy?.id : run?.createdBy;
  return creator === user.id;
};

const stampCreator: FieldHook = ({ req, operation }) =>
  operation === 'create' ? req.user?.id : undefined;

export const AgentRuns: CollectionConfig = {
  slug: COLLECTIONS.agentRuns,
  labels: { singular: 'Exécution agentique', plural: 'Exécutions agentiques' },
  admin: {
    useAsTitle: 'mastraRunId',
    defaultColumns: ['presentation', 'status', 'phase', 'command', 'updatedAt'],
    hidden: ({ user }) => user?.role !== ROLES.admin,
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: runOwnerAccess,
    update: runOwnerAccess,
    delete: ({ req }) => req.user?.role === ROLES.admin,
  },
  fields: [
    {
      name: 'presentation',
      type: 'relationship',
      relationTo: COLLECTIONS.presentations,
      required: true,
      index: true,
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: COLLECTIONS.users,
      required: true,
      index: true,
      admin: { readOnly: true },
      hooks: { beforeChange: [stampCreator] },
    },
    {
      name: 'organisation',
      type: 'relationship',
      relationTo: COLLECTIONS.organisations,
      index: true,
    },
    { name: 'mastraRunId', type: 'text', required: true, unique: true, index: true },
    { name: 'payloadJobId', type: 'text', index: true },
    { name: 'requestId', type: 'text', required: true, index: true },
    { name: 'traceId', type: 'text', required: true, index: true, admin: { hidden: true } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      index: true,
      options: [
        'queued',
        'running',
        'suspended',
        'waiting',
        'succeeded',
        'failed',
        'canceled',
        'stale',
      ],
    },
    {
      name: 'phase',
      type: 'select',
      defaultValue: 'gather',
      options: [
        'gather',
        'structure',
        'approval',
        'draft',
        'validate',
        'visual',
        'assemble',
        'persist',
        'complete',
      ],
    },
    {
      name: 'command',
      type: 'select',
      required: true,
      defaultValue: 'start',
      options: ['start', 'restart', 'resume', 'timeTravel'],
    },
    {
      name: 'mode',
      type: 'select',
      required: true,
      options: ['replace', 'augment', 'revise'],
    },
    { name: 'brief', type: 'textarea', required: true, maxLength: 20_000 },
    { name: 'language', type: 'select', required: true, options: ['fr', 'en'] },
    { name: 'visual', type: 'checkbox', defaultValue: true },
    { name: 'approvalRequired', type: 'checkbox', defaultValue: false },
    {
      name: 'sourcePolicy',
      type: 'select',
      required: true,
      defaultValue: 'none',
      options: ['none', 'exclusive', 'multiple'],
      admin: { readOnly: true },
    },
    { name: 'sourceIds', type: 'json' },
    { name: 'revisionContext', type: 'textarea', maxLength: 100_000, admin: { hidden: true } },
    { name: 'inputFingerprint', type: 'text', required: true, index: true },
    { name: 'events', type: 'json' },
    { name: 'evidence', type: 'json', admin: { hidden: true } },
    { name: 'sourceFailures', type: 'json', admin: { hidden: true } },
    { name: 'suspendedStep', type: 'text' },
    { name: 'suspendPayload', type: 'json' },
    { name: 'resumeDecision', type: 'json', admin: { hidden: true } },
    { name: 'targetStep', type: 'text', admin: { hidden: true } },
    { name: 'attempt', type: 'number', defaultValue: 0, min: 0 },
    { name: 'errorCode', type: 'text' },
    { name: 'errorSummary', type: 'textarea', maxLength: 2_000 },
    { name: 'startedAt', type: 'date' },
    { name: 'heartbeatAt', type: 'date', index: true },
    { name: 'suspendedAt', type: 'date' },
    { name: 'completedAt', type: 'date' },
  ],
};
