import { z } from 'zod';
import { payloadFieldShape, recordIdSchema } from '../src/authoring/payloadSchema';
import { slideInputSchema, slidePatchSchema } from '../src/authoring/slideSchema';
import { KnowledgeBases } from '../src/collections/KnowledgeBases';
import { KnowledgeDocuments } from '../src/collections/KnowledgeDocuments';
import { Media } from '../src/collections/Media';
import { Organisations } from '../src/collections/Organisations';
import { Presentations } from '../src/collections/Presentations';
import { agentDraftCommandSchema, agentDraftStartSchema } from '../src/lib/agentDraftContract';
import {
  deckDeletionRequestSchema,
  deletionConfirmationPath,
  knowledgeDeletionRequestSchema,
} from '../src/lib/deckActionsContract';
import { deckSlidesCommandSchema, readDeckSlidesQuerySchema } from '../src/lib/deckSlidesContract';
import { MAX_SLIDES } from '../src/lib/draftConfig';
import { slideLayoutCommandSchema } from '../src/lib/slideLayoutContract';
import { slidePreviewRequestSchema } from '../src/lib/slidePreviewContract';
import { slideRevisionSchema } from '../src/lib/slideRevisionContract';

const fileSchema = z.strictObject({
  filename: z.string().min(1).max(255),
  base64: z
    .string()
    .min(4)
    .max(11_184_812)
    .describe('Base64 bytes of the attached file. Do not invent or fetch file URLs.'),
  contentType: z.string().max(128).optional(),
});

const deckFields = [
  'title',
  'language',
  'documentTemplate',
  'agentBrief',
  'agentSlideCountMin',
  'agentSlideCountMax',
  'agentKnowledgeBases',
  'agentMode',
  'agentVisualCritique',
  'agentApprovalRequired',
] as const;
const deckSelect = [
  'id',
  ...deckFields,
  'slug',
  'organisation',
  'draftRunId',
  'draftStatus',
  'lastBuildStatus',
  'updatedAt',
];
const orgSelect = [
  'name',
  'primary',
  'secondary',
  'ink',
  'paper',
  'logo',
  'logoWhite',
  'logoBlack',
  'website',
  'bookingUrl',
  'headingFont',
  'bodyFont',
] as const;
const mediaSelect = ['id', 'alt', 'url', 'filename', 'mimeType', 'filesize', 'width', 'height'];
const baseSelect = ['id', 'name', 'organisation', 'readiness', 'updatedAt'];
const documentSelect = [
  'id',
  'knowledgeBase',
  'filename',
  'mimeType',
  'filesize',
  'indexingStatus',
  'errorMessage',
  'updatedAt',
];

const deckCreate = z.strictObject({
  ...payloadFieldShape(Presentations.fields, { pick: deckFields }),
  slides: z
    .array(slideInputSchema)
    .max(MAX_SLIDES)
    .describe('Use an empty array only to prepare a new Mastra draft.'),
});
const deckUpdate = z.strictObject(
  payloadFieldShape(Presentations.fields, { pick: deckFields, partial: true }),
);
const brandUpdate = z.strictObject(
  payloadFieldShape(Organisations.fields, { pick: orgSelect, partial: true }),
);
const baseInput = z.strictObject(payloadFieldShape(KnowledgeBases.fields, { pick: ['name'] }));
const documentInput = z.strictObject(
  payloadFieldShape(KnowledgeDocuments.fields, { pick: ['knowledgeBase'] }),
);
const mediaInput = z.strictObject(payloadFieldShape(Media.fields, { pick: ['alt'] }));

export type AuthoringParameter = {
  in: 'path' | 'query';
  name: string;
  schema: z.ZodType;
  required?: true;
  'x-slides-arg'?: string;
};

const id = { in: 'path', name: 'id', schema: recordIdSchema } satisfies AuthoringParameter;
const runId = {
  in: 'path',
  name: 'runId',
  schema: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
} satisfies AuthoringParameter;
const list = [
  { in: 'query', name: 'page', schema: z.int().min(1).default(1) },
  { in: 'query', name: 'limit', schema: z.int().min(1).max(50).default(20) },
] satisfies AuthoringParameter[];
const exactFilter = (name: string, schema: z.ZodType): AuthoringParameter => ({
  in: 'query',
  name: `where[${name}][equals]`,
  'x-slides-arg': name,
  schema,
});

export type AuthoringOperation = {
  id: string;
  method: 'get' | 'post' | 'patch';
  path: `/api/${string}`;
  description: string;
  select: readonly string[];
  parameters?: readonly AuthoringParameter[];
  body?: z.ZodType;
  native?: true;
  write?: boolean;
  multipart?: true;
};

const upload = (schema: z.ZodType) => z.strictObject({ _payload: schema, file: fileSchema });

export const authoringOperations: readonly AuthoringOperation[] = [
  {
    id: 'create_deck',
    method: 'post',
    path: '/api/presentations',
    native: true,
    write: true,
    select: deckSelect,
    body: deckCreate,
    description:
      'Save a deck and its typed slides in one call using the author’s default Slides organisation. The native build starts asynchronously. Return the deck ID and use get_deck_outputs to follow it. Only intentionally create an empty deck to prepare an IA draft.',
  },
  {
    id: 'list_decks',
    method: 'get',
    path: '/api/presentations',
    native: true,
    select: [
      'id',
      'title',
      'slug',
      'documentTemplate',
      'organisation',
      'lastBuildStatus',
      'updatedAt',
    ],
    parameters: [...list, exactFilter('slug', z.string().max(64))],
    description: 'List accessible decks with bounded pagination. Optionally match an exact slug.',
  },
  {
    id: 'get_deck',
    method: 'get',
    path: '/api/presentations/{id}',
    native: true,
    select: deckSelect,
    parameters: [id],
    description:
      'Read deck metadata and authoring settings. Use the individual slide tools for content and get_deck_outputs for exports.',
  },
  {
    id: 'update_deck',
    method: 'patch',
    path: '/api/presentations/{id}',
    native: true,
    write: true,
    select: deckSelect,
    parameters: [id],
    body: deckUpdate,
    description:
      'Change settings on an existing deck. To edit slides, use the slide commands instead. Does not change organisation or build metadata.',
  },
  {
    id: 'request_deck_deletion',
    method: 'post',
    path: deletionConfirmationPath,
    write: true,
    select: ['confirmationUrl', 'expiresAt'],
    body: deckDeletionRequestSchema,
    description:
      'Prepare deletion of one deck if the role allows it. Give the link to the human to confirm or cancel in their own authenticated Slides browser session.',
  },
  {
    id: 'get_deck_slides',
    method: 'get',
    path: '/api/deck-slides',
    parameters: [
      {
        in: 'query',
        name: 'deckId',
        required: true,
        schema: readDeckSlidesQuerySchema.shape.deckId,
      },
      { in: 'query', name: 'slideId', schema: readDeckSlidesQuerySchema.shape.slideId.unwrap() },
    ],
    select: ['deckId', 'revision', 'slides', 'slideId', 'index', 'slide'],
    description:
      'List slides in an accessible deck or read one by its stable slide ID. Keep the revision for subsequent edits.',
  },
  {
    id: 'manage_deck_slides',
    method: 'post',
    path: '/api/deck-slides',
    write: true,
    body: deckSlidesCommandSchema,
    select: [
      'deckId',
      'revision',
      'slides',
      'slideId',
      'index',
      'slide',
      'buildQueued',
      'confirmationUrl',
      'expiresAt',
    ],
    description:
      'Insert, patch, move, or prepare deletion of a single slide. First read its current revision with get_deck_slides. Only the human can confirm deletion in Slides.',
  },
  {
    id: 'get_deck_outputs',
    method: 'get',
    path: '/api/deck-outputs/{id}',
    select: ['id', 'status', 'error', 'links'],
    parameters: [id],
    description:
      'Check the latest native build, failure reason, and current protected artifact links. Open links in a browser with a Slides session.',
  },
  {
    id: 'rebuild_deck',
    method: 'post',
    path: '/api/presentations/{id}/build',
    write: true,
    select: ['queued', 'buildToken', 'lastBuildStatus', 'lastBuildRequestedAt'],
    parameters: [id],
    description:
      'Queue a native regeneration for an existing deck. Use get_deck_outputs to observe completion.',
  },
  {
    id: 'get_deck_variables',
    method: 'get',
    path: '/api/presentations/{id}/vars',
    select: ['vars'],
    parameters: [id],
    description: 'List the authorised variables and examples available to the deck.',
  },
  {
    id: 'preview_slide',
    method: 'post',
    path: '/api/slide-preview',
    select: ['preview', 'canvas', 'fingerprint', 'compatibility'],
    body: slidePreviewRequestSchema.extend({ block: slidePatchSchema }),
    description:
      'Generate a temporary native preview with an authenticated browser URL. Read only; does not save edits.',
  },
  {
    id: 'revise_slide',
    method: 'post',
    path: '/api/revise-slide',
    write: true,
    select: ['slide', 'slideIndex'],
    body: slideRevisionSchema,
    description:
      'Revise and save an existing slide through native IA, then queue a build. This changes the deck and consumes model resources; ask first.',
  },
  {
    id: 'manage_slide_layout',
    method: 'post',
    path: '/api/slide-layout',
    write: true,
    body: slideLayoutCommandSchema,
    select: [
      'action',
      'analysis',
      'deckId',
      'slideIndex',
      'slideId',
      'fingerprint',
      'compatibility',
      'recommendation',
      'targetLayout',
      'candidate',
      'slide',
      'undoToken',
      'buildQueued',
    ],
    description:
      'Analyze, recommend, preview, apply or undo a native layout change. Apply and undo require a current fingerprint; use analyze before changing content.',
  },
  {
    id: 'get_draft_sources',
    method: 'get',
    path: '/api/agent-sources',
    select: ['sources', 'maxSelected'],
    description: 'List authorised source options for a Mastra draft.',
  },
  {
    id: 'start_deck_draft',
    method: 'post',
    path: '/api/agent-draft',
    write: true,
    select: ['started', 'runId', 'requestId', 'status'],
    body: agentDraftStartSchema,
    description:
      'Start the native durable Mastra draft for an existing deck ID and author-approved brief and sources. Keep the deck ID if the start fails; do not create a replacement.',
  },
  {
    id: 'get_deck_draft',
    method: 'get',
    path: '/api/agent-draft/{runId}',
    select: [
      'runId',
      'status',
      'phase',
      'command',
      'events',
      'error',
      'suspended',
      'updatedAt',
      'heartbeatAt',
    ],
    parameters: [runId],
    description: 'Read native Mastra progress and approval state for a draft run.',
  },
  {
    id: 'control_deck_draft',
    method: 'post',
    path: '/api/agent-draft/{runId}',
    write: true,
    select: ['runId', 'status', 'command', 'step'],
    parameters: [runId],
    body: agentDraftCommandSchema,
    description:
      'Cancel, restart, resume after an explicit approval decision, or use an authorised native time-travel operation.',
  },
  {
    id: 'list_fonts',
    method: 'get',
    path: '/api/google-fonts',
    select: ['fonts'],
    description: 'Discover Google and bundled font families supported by Slides.',
  },
  {
    id: 'list_brands',
    method: 'get',
    path: '/api/organisations',
    native: true,
    select: ['id', ...orgSelect],
    parameters: list,
    description: 'List accessible organisations and their deck brand settings.',
  },
  {
    id: 'update_brand',
    method: 'patch',
    path: '/api/organisations/{id}',
    native: true,
    write: true,
    select: ['id', ...orgSelect],
    parameters: [id],
    body: brandUpdate,
    description:
      'Update branding for an authorised organisation. This affects decks that use the brand; obtain approval first.',
  },
  {
    id: 'list_media',
    method: 'get',
    path: '/api/media',
    native: true,
    select: mediaSelect,
    parameters: [...list, exactFilter('filename', z.string().max(255))],
    description:
      'Find accessible uploaded assets to reuse by ID in slide image or brand logo fields.',
  },
  {
    id: 'upload_media',
    method: 'post',
    path: '/api/media',
    native: true,
    write: true,
    select: mediaSelect,
    multipart: true,
    body: upload(mediaInput),
    description:
      'Upload existing image or PDF bytes as a Slides media asset. Ordinary uploads are readable to other authenticated Slides users; use only content approved for this visibility.',
  },
  {
    id: 'list_knowledge_bases',
    method: 'get',
    path: '/api/knowledge-bases',
    native: true,
    select: baseSelect,
    parameters: list,
    description: 'List organisation-scoped knowledge bases and their readiness for grounding.',
  },
  {
    id: 'get_knowledge_base',
    method: 'get',
    path: '/api/knowledge-bases/{id}',
    native: true,
    select: baseSelect,
    parameters: [id],
    description: 'Read a knowledge base and current readiness.',
  },
  {
    id: 'create_knowledge_base',
    method: 'post',
    path: '/api/knowledge-bases',
    native: true,
    write: true,
    select: baseSelect,
    body: baseInput,
    description: 'Create a knowledge base in the connector author’s sole organisation.',
  },
  {
    id: 'update_knowledge_base',
    method: 'patch',
    path: '/api/knowledge-bases/{id}',
    native: true,
    write: true,
    select: baseSelect,
    parameters: [id],
    body: baseInput,
    description:
      'Rename an organisation knowledge base without changing access or indexing status.',
  },
  {
    id: 'list_knowledge_documents',
    method: 'get',
    path: '/api/knowledge-documents',
    native: true,
    select: documentSelect,
    parameters: [...list, exactFilter('knowledgeBase', recordIdSchema)],
    description:
      'List authorised knowledge documents and indexing status; optionally match one base ID.',
  },
  {
    id: 'get_knowledge_document',
    method: 'get',
    path: '/api/knowledge-documents/{id}',
    native: true,
    select: documentSelect,
    parameters: [id],
    description: 'Read a knowledge document’s metadata and indexing status.',
  },
  {
    id: 'upload_knowledge_document',
    method: 'post',
    path: '/api/knowledge-documents',
    native: true,
    write: true,
    select: documentSelect,
    multipart: true,
    body: upload(documentInput),
    description:
      'Attach a supported file by bytes to an authorised knowledge base and enqueue native indexing.',
  },
  {
    id: 'update_knowledge_document',
    method: 'patch',
    path: '/api/knowledge-documents/{id}',
    native: true,
    write: true,
    select: documentSelect,
    parameters: [id],
    body: documentInput,
    description: 'Change a knowledge document’s base through the native access and indexing rules.',
  },
  {
    id: 'request_knowledge_deletion',
    method: 'post',
    path: '/api/knowledge-deletion',
    write: true,
    select: ['confirmationUrl', 'expiresAt'],
    body: knowledgeDeletionRequestSchema,
    description:
      'Prepare deletion of an authorised knowledge base or document. Give the link to the human to confirm or cancel in Slides. Deleting a base also deletes its documents.',
  },
  {
    id: 'retry_knowledge_document',
    method: 'post',
    path: '/api/knowledge-documents/{id}/retry',
    write: true,
    select: ['queued', 'indexingStatus'],
    parameters: [id],
    description: 'Request native indexing again for a failed, authorised document.',
  },
];
