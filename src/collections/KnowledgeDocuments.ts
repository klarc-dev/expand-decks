import type {
  Access,
  CollectionBeforeValidateHook,
  CollectionConfig,
  FieldAccess,
  FieldHook,
  PayloadRequest,
} from 'payload';
import { APIError } from 'payload';

import { isAdminOrAuthor, userIsAdmin } from '../access/roles';
import { afterKnowledgeDocumentChange } from '../hooks/afterKnowledgeDocumentChange';
import { afterKnowledgeDocumentDelete } from '../hooks/knowledgeLifecycle';
import { KNOWLEDGE_INGEST_TASK } from '../jobs/knowledgeIngest';
import { COLLECTIONS } from '../lib/collections';
import { CTX } from '../lib/context';
import { KNOWLEDGE_DIR } from '../lib/paths';
import { INDEXING_STATUS } from '../lib/status';

/**
 * Document formats we can extract text from. DOCX is the OOXML word type only —
 * the legacy binary .doc is not accepted because it needs a different parser.
 */
const KNOWLEDGE_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain',
] as const;

/** Extensions whose browser-reported MIME type is unreliable across platforms. */
const TEXT_EXTENSION_MIME: Record<string, string> = {
  md: 'text/markdown',
  markdown: 'text/markdown',
  txt: 'text/plain',
};

export const isAcceptedKnowledgeMimeType = (mimeType: unknown): boolean =>
  typeof mimeType === 'string' &&
  KNOWLEDGE_MIME_TYPES.some((accepted) => mimeType.split(';')[0].trim() === accepted);

const MAX_KNOWLEDGE_FILE_BYTES = 25 * 1024 * 1024;
const PDF_MAGIC = Buffer.from('%PDF-');
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const trustedLifecycleWrite: FieldAccess = ({ req }) =>
  req.context?.[CTX.trustedKnowledgeLifecycle] === true;

function uploadedBytes(req: PayloadRequest | undefined): Buffer | undefined {
  const data = req?.file?.data;
  return Buffer.isBuffer(data) ? data : undefined;
}

export function validateKnowledgeFileContent(
  filename: string,
  mimeType: string,
  bytes: Buffer,
): void {
  if (bytes.length > MAX_KNOWLEDGE_FILE_BYTES) {
    throw new APIError('Le fichier dépasse la limite de 25 Mo.', 400);
  }
  const normalizedMime = mimeType.split(';')[0].trim();
  if (normalizedMime === 'application/pdf') {
    if (!bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
      throw new APIError('Le fichier PDF est invalide.', 400);
    }
    return;
  }
  if (normalizedMime === KNOWLEDGE_MIME_TYPES[1]) {
    const zipDirectory = bytes.toString('utf8');
    if (
      !bytes.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC) ||
      !zipDirectory.includes('[Content_Types].xml') ||
      !zipDirectory.includes('word/document.xml')
    ) {
      throw new APIError('Le fichier DOCX est invalide.', 400);
    }
    return;
  }
  if (normalizedMime === 'text/plain' || normalizedMime === 'text/markdown') {
    if (bytes.includes(0))
      throw new APIError('Le fichier texte contient des données binaires.', 400);
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new APIError('Le fichier texte doit être encodé en UTF-8.', 400);
    }
    return;
  }
  throw new APIError(`Format non pris en charge pour ${filename}.`, 400);
}

async function assertReadableKnowledgeBase(req: PayloadRequest, value: unknown): Promise<void> {
  const id = value && typeof value === 'object' ? (value as { id?: unknown }).id : value;
  if (id === undefined || id === null || id === '') return;
  try {
    await req.payload.findByID({
      collection: COLLECTIONS.knowledgeBases,
      id: id as number | string,
      depth: 0,
      user: req.user ?? undefined,
      overrideAccess: false,
    });
  } catch {
    throw new APIError('Base de connaissances inaccessible.', 403);
  }
}

export const validateKnowledgeBaseRelationship: FieldHook = async ({ value, req }) => {
  await assertReadableKnowledgeBase(req, value);
  return value;
};

/** `Rapport annuel 2026.pdf` → `Rapport annuel 2026`. */
export const titleFromFilename = (filename: unknown): string | undefined => {
  if (typeof filename !== 'string') return undefined;
  const base = filename.split('/').pop() ?? filename;
  const dot = base.lastIndexOf('.');
  const stem = (dot > 0 ? base.slice(0, dot) : base).trim();
  return stem || undefined;
};

/**
 * Documents inherit the visibility of their knowledge base rather than
 * re-deriving ownership, so the two collections can never drift apart — same
 * delegation Media uses against Presentations.
 */
export const canAccessKnowledgeDocuments: Access = async ({ req }) => {
  const { user, payload } = req;
  if (!user) return false;
  if (userIsAdmin(user)) return true;

  const ids: (number | string)[] = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const readable = await payload.find({
      collection: COLLECTIONS.knowledgeBases,
      depth: 0,
      limit: 1000,
      page,
      sort: 'id',
      user,
      overrideAccess: false,
    });
    ids.push(...readable.docs.map((doc) => doc.id));
    hasNextPage = readable.hasNextPage;
    page += 1;
  }

  return { knowledgeBase: { in: ids } };
};

/**
 * Browsers disagree on the MIME type of `.md` / `.txt` uploads (some send
 * `application/octet-stream`), which would trip the generated upload validator
 * on a perfectly valid file. Normalize from the extension — the raw bytes have
 * already been checked by Payload's own file restrictions — then refuse
 * anything still outside the accepted list with a French message.
 */
export const enforceKnowledgeMimeType: CollectionBeforeValidateHook = ({ data, req }) => {
  if (!data || typeof data !== 'object') return data;
  const record = data as { filename?: unknown; mimeType?: unknown };
  // No filename in the payload means no file changed hands (e.g. a title-only
  // patch); leave the stored document alone.
  if (typeof record.filename !== 'string') return data;

  const extension = record.filename.split('.').pop()?.toLowerCase() ?? '';
  const fromExtension = TEXT_EXTENSION_MIME[extension];
  if (fromExtension && !isAcceptedKnowledgeMimeType(record.mimeType)) {
    record.mimeType = fromExtension;
  }

  if (!isAcceptedKnowledgeMimeType(record.mimeType)) {
    // APIError, not ValidationError: Payload's ValidationError replaces the
    // per-field message with a generic "the following field is invalid",
    // which would hide the list of accepted formats from the author.
    throw new APIError(
      'Format non pris en charge. Formats acceptés : PDF, DOCX, Markdown (.md) et texte brut (.txt).',
      400,
    );
  }

  const bytes = uploadedBytes(req);
  if (bytes) validateKnowledgeFileContent(record.filename, String(record.mimeType), bytes);

  return data;
};

const prefillTitleFromFilename: FieldHook = ({ value, data, originalDoc }) => {
  if (typeof value === 'string' && value.trim()) return value;
  const filename =
    (data as { filename?: unknown } | undefined)?.filename ??
    (originalDoc as { filename?: unknown } | undefined)?.filename;
  return titleFromFilename(filename) ?? value;
};

export const KnowledgeDocuments: CollectionConfig = {
  slug: COLLECTIONS.knowledgeDocuments,
  labels: { singular: 'Document de connaissance', plural: 'Documents de connaissance' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'knowledgeBase', 'indexingStatus', 'chunkCount', 'updatedAt'],
    description:
      'Documents source d’une base de connaissances : PDF, DOCX, Markdown ou texte brut.',
  },
  access: {
    create: isAdminOrAuthor,
    read: canAccessKnowledgeDocuments,
    update: canAccessKnowledgeDocuments,
    delete: canAccessKnowledgeDocuments,
  },
  upload: {
    // Distinct from the deck media directory, but under the same host volume
    // mounted on both `payload` and `payload-worker` (docker-compose.yaml), so
    // the worker can read a file dropped from the admin.
    staticDir: KNOWLEDGE_DIR,
    mimeTypes: [...KNOWLEDGE_MIME_TYPES],
  },
  hooks: {
    beforeValidate: [enforceKnowledgeMimeType],
    afterChange: [afterKnowledgeDocumentChange],
    afterDelete: [afterKnowledgeDocumentDelete],
  },
  endpoints: [
    {
      path: '/:id/retry',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        // fallow-ignore-next-line code-duplication -- Payload endpoint auth/route guard convention
        if (!req.user) return Response.json({ error: 'Non authentifié' }, { status: 401 });
        const id = req.routeParams?.id as string | undefined;
        if (!id) return Response.json({ error: 'Identifiant manquant' }, { status: 400 });

        let document;
        try {
          document = await req.payload.findByID({
            collection: COLLECTIONS.knowledgeDocuments,
            id,
            depth: 0,
            user: req.user,
            overrideAccess: false,
          });
        } catch {
          return Response.json({ error: 'Document introuvable' }, { status: 404 });
        }
        if (document.indexingStatus !== INDEXING_STATUS.failed) {
          return Response.json(
            { error: 'Seul un document en échec peut être relancé.' },
            { status: 409 },
          );
        }

        await req.payload.update({
          collection: COLLECTIONS.knowledgeDocuments,
          id,
          data: { indexingStatus: INDEXING_STATUS.pending, errorMessage: '', chunkCount: 0 },
          user: req.user,
          overrideAccess: false,
          context: {
            ...(req.context ?? {}),
            [CTX.skipIngestQueue]: true,
            [CTX.trustedKnowledgeLifecycle]: true,
          },
        });
        await (req.payload.jobs.queue as Function)({
          task: KNOWLEDGE_INGEST_TASK,
          input: { documentId: id },
          req,
        });
        // fallow-ignore-next-line code-duplication -- queue kick mirrors the collection hook intentionally
        void Promise.resolve()
          .then(() => (req.payload.jobs.run as Function)())
          .catch((err: unknown) =>
            req.payload.logger.warn({ err, documentId: id }, 'knowledge retry jobs.run failed'),
          );
        return Response.json({ queued: true, indexingStatus: INDEXING_STATUS.pending });
      },
    },
  ],
  fields: [
    {
      name: 'knowledgeBase',
      type: 'relationship',
      relationTo: COLLECTIONS.knowledgeBases,
      required: true,
      index: true,
      label: 'Base de connaissances',
      admin: { description: 'Base à laquelle ce document appartient' },
      hooks: { beforeChange: [validateKnowledgeBaseRelationship] },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
      admin: {
        description: 'Pré-rempli à partir du nom du fichier, modifiable à tout moment.',
      },
      hooks: { beforeValidate: [prefillTitleFromFilename] },
    },
    {
      name: 'indexingStatus',
      type: 'select',
      required: true,
      defaultValue: INDEXING_STATUS.pending,
      index: true,
      label: 'Statut d’indexation',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'État du traitement de ce document',
      },
      access: { create: trustedLifecycleWrite, update: trustedLifecycleWrite },
      options: [
        { label: 'En attente', value: INDEXING_STATUS.pending },
        { label: 'En cours', value: INDEXING_STATUS.indexing },
        { label: 'Indexé', value: INDEXING_STATUS.indexed },
        { label: 'Échec', value: INDEXING_STATUS.failed },
      ],
    },
    {
      name: 'chunkCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'Fragments',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Nombre de fragments produits par l’extraction',
      },
      access: { create: trustedLifecycleWrite, update: trustedLifecycleWrite },
    },
    {
      name: 'errorMessage',
      type: 'textarea',
      label: 'Motif de l’échec',
      admin: {
        readOnly: true,
        rows: 3,
        description: 'Raison du dernier échec d’indexation',
        condition: (data) => data?.indexingStatus === INDEXING_STATUS.failed,
      },
      access: { create: trustedLifecycleWrite, update: trustedLifecycleWrite },
    },
    {
      name: 'retryIndexing',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.indexingStatus === INDEXING_STATUS.failed,
        components: { Field: '/components/KnowledgeRetryButton#default' },
      },
    },
    {
      name: 'sourceHash',
      type: 'text',
      index: true,
      label: 'Empreinte du contenu',
      admin: {
        readOnly: true,
        hidden: true,
        description: 'Empreinte SHA-256 du contenu source indexé',
      },
      access: { create: trustedLifecycleWrite, update: trustedLifecycleWrite },
    },
  ],
};
