import { createHash, randomUUID } from 'node:crypto';

import type { CollectionBeforeDeleteHook, CollectionConfig, PayloadRequest } from 'payload';

import {
  isAdmin,
  isAdminOrAuthor,
  isOrganisationAuthor,
  isOrganisationMember,
  relationshipId,
  userIsAdminOrAuthor,
  userIsOrganisationMember,
} from '../access/roles';
import {
  BUILD_COOLDOWN_MS,
  MAX_SELECTED_SOURCES,
  MAX_SLIDES,
  MIN_BRIEF_CHARS,
  MIN_SLIDES,
} from '../lib/draftConfig';
import { DEFAULT_AGENT_MODEL, agentModelSchema } from '../lib/agentModel';
import { BUILD_SLIDES_TASK } from '../jobs/buildSlides';
import { patchPresentationBuildMetadata } from '../jobs/patchPresentationBuildMetadata';
import { isValidSlug, slugFromTitle } from '../lib/slug';
import { COLLECTIONS } from '../lib/collections';
import { flattenVars } from '../export/vars';
import { ACTIVE_DRAFT_STATUSES, BUILD_STATUS, DRAFT_STATUS } from '../lib/status';
import {
  documentTemplateField,
  payloadBlocksForTemplate,
  payloadBlockSlugsForTemplate,
} from '../documents/payload';
import { resolvePrimaryArtifactHref } from '../documents/artifacts';
import { assertDocumentPages, resolveDocumentTemplate } from '../documents/templates';
import { afterPresentationChange } from '../hooks/afterPresentationChange';

/**
 * Resolve the organisation pre-selected for a new presentation: the author's
 * `defaultOrganisation`, whether the relationship arrives populated (depth > 0)
 * or as a bare id.
 */
function defaultOrganisationId(user: PayloadRequest['user']): number | undefined {
  const value = (user as { defaultOrganisation?: unknown } | null)?.defaultOrganisation;
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'number') {
    return (value as { id: number }).id;
  }
  return undefined;
}

async function uniqueSlugFromTitle(req: PayloadRequest, title: string): Promise<string> {
  const derived = slugFromTitle(title);
  const base =
    derived || `presentation-${createHash('sha256').update(title).digest('hex').slice(0, 8)}`;

  for (let suffix = 1; suffix <= 999; suffix += 1) {
    const marker = suffix === 1 ? '' : `-${suffix}`;
    const candidate = `${base.slice(0, 64 - marker.length).replace(/-+$/g, '')}${marker}`;
    const existing = await req.payload.find({
      collection: COLLECTIONS.presentations,
      where: { slug: { equals: candidate } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    });
    if (existing.totalDocs === 0) return candidate;
  }

  throw new Error('Impossible de générer un identifiant unique pour cette présentation.');
}

async function beforePresentationDelete({ id, req }: Parameters<CollectionBeforeDeleteHook>[0]) {
  // Payload relationships default to ON DELETE SET NULL. Agent runs require a
  // presentation, so remove their durable ledgers first instead of letting the
  // database attempt to null a NOT NULL foreign key.
  await req.payload.delete({
    collection: COLLECTIONS.agentRuns,
    where: { presentation: { equals: id } },
    overrideAccess: true,
    req,
  });
}

/**
 * Agent options belong to the author, but a live run reads them mid-flight:
 * freeze them (admin renders read-only) until the run leaves its active phases.
 */
const agentOptionAccess = {
  update: ({ doc }: { doc?: Record<string, unknown> }) =>
    !ACTIVE_DRAFT_STATUSES.has(doc?.draftStatus as string),
};

/**
 * Fields the durable run owns. Writable only by `overrideAccess` writers (the
 * agent-draft routes and the run worker), never by an admin or REST save — a
 * mid-run form submit would otherwise reset the pointer to the live run.
 */
const runPointerAccess = { update: () => false };

/**
 * Ready bases, plus whatever this document already stores. Payload enforces
 * `filterOptions` server-side on every write carrying the value, so a base that
 * drifts off `ready` (a reindex, a failed document) would otherwise make the
 * presentation unsaveable until indexing finishes.
 */
const readyOrSelectedKnowledgeBases = ({ data }: { data?: Record<string, unknown> }) => {
  const ready = { readiness: { equals: 'ready' } };
  const selected = (Array.isArray(data?.agentKnowledgeBases) ? data.agentKnowledgeBases : [])
    .map((entry) => relationshipId((entry as { value?: unknown })?.value ?? entry))
    .filter((id): id is number | string => id !== undefined);
  // Payload rejects an empty `in`, so only union a non-empty selection.
  return selected.length > 0 ? { or: [ready, { id: { in: selected } }] } : ready;
};

/** Both bounds or neither, and min <= max. Shared by the two number fields. */
function validateSlideCountBound(
  _value: unknown,
  { siblingData }: { siblingData?: Record<string, unknown> },
): string | true {
  const min = siblingData?.agentSlideCountMin;
  const max = siblingData?.agentSlideCountMax;
  const hasMin = typeof min === 'number';
  const hasMax = typeof max === 'number';
  if (!hasMin && !hasMax) return true;
  if (hasMin !== hasMax) return 'Renseignez les deux bornes ou aucune.';
  if ((min as number) > (max as number))
    return 'Le maximum doit être supérieur ou égal au minimum.';
  return true;
}

export const Presentations: CollectionConfig = {
  slug: COLLECTIONS.presentations,
  labels: { singular: 'Présentation', plural: 'Présentations' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'updatedAt'],
    preview: (data) => {
      if (data.lastBuildStatus !== BUILD_STATUS.success) return null;
      const template = resolveDocumentTemplate(data.documentTemplate);
      return resolvePrimaryArtifactHref(template, data);
    },
    components: {
      edit: {
        beforeDocumentControls: [
          '/components/TitleField#PresentationTitleControl',
          '/components/ExportMenuItem#PresentationActionGroupStart',
          '/components/ExportMenuItem#DownloadPdfButton',
        ],
      },
    },
  },
  access: {
    create: isAdminOrAuthor,
    read: isOrganisationMember,
    update: isOrganisationAuthor,
    delete: isAdmin,
  },
  endpoints: [
    {
      // Trigger a rebuild on demand. Unlike the publish-gated afterChange hook,
      // this enqueues the same buildSlides job regardless of status. Owner or
      // admin only; throttled per-presentation via an enqueue-time timestamp so
      // rapid clicks can't spawn N concurrent Chromium/Slidev processes.
      path: '/:id/build',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        const user = req.user;
        if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 });

        const id = req.routeParams?.id as string | undefined;
        if (!id) return Response.json({ error: 'Identifiant manquant' }, { status: 400 });

        // findByID with the user enforces read access; 404 lumps missing +
        // forbidden, matching the draft route's convention.
        let presentation;
        try {
          presentation = await req.payload.findByID({
            collection: COLLECTIONS.presentations,
            id,
            depth: 0,
            user,
            overrideAccess: false,
          });
        } catch {
          return Response.json({ error: 'Présentation introuvable' }, { status: 404 });
        }
        if (!presentation) {
          return Response.json({ error: 'Présentation introuvable' }, { status: 404 });
        }

        // Authorize the write before spending a Chromium process.
        if (!userIsOrganisationMember(user, presentation.organisation)) {
          return Response.json({ error: 'Accès refusé' }, { status: 403 });
        }
        if (!userIsAdminOrAuthor(user)) {
          return Response.json({ error: 'Accès refusé' }, { status: 403 });
        }

        // Throttle: reject if a build was requested within the cooldown. Read
        // the enqueue-time timestamp, NOT lastBuildStatus (which the worker only
        // flips to 'building' on the next cron tick — too late to gate a burst).
        const last = presentation.lastBuildRequestedAt
          ? Date.parse(presentation.lastBuildRequestedAt as string)
          : 0;
        if (last && Date.now() - last < BUILD_COOLDOWN_MS) {
          return Response.json(
            {
              error:
                'L’aperçu et le PDF sont déjà en cours de préparation. Réessayez dans un instant.',
            },
            { status: 429 },
          );
        }

        const buildToken = randomUUID();

        const requestedAt = new Date().toISOString();

        // Stamp the request time + token before enqueuing, with the skipBuildQueue
        // flag so this patch doesn't itself trigger the hook. Set the visible
        // status immediately: the worker cron may not pick the job up for up to a
        // minute, but authors need confirmation in the Sortie tab right away.
        try {
          await patchPresentationBuildMetadata(
            req.payload,
            id,
            {
              lastBuildRequestedAt: requestedAt,
              lastBuildToken: buildToken,
              lastBuildStatus: BUILD_STATUS.building,
              lastBuildError: '',
            },
            req,
          );

          // Cast needed until `payload generate:types` adds buildSlides to TypedJobs.
          await (req.payload.jobs.queue as (args: unknown) => Promise<unknown>)({
            task: BUILD_SLIDES_TASK,
            input: { presentationId: id, buildToken },
            req,
          });
        } catch (error) {
          req.payload.logger.error({
            err: error,
            msg: `Failed to queue presentation ${id} export`,
          });

          const message = 'Impossible de préparer l’aperçu et le PDF. Réessayez dans un instant.';
          // Never leave the document stuck on "building" when no job exists, and
          // clear the cooldown timestamp so the author can retry immediately.
          await patchPresentationBuildMetadata(
            req.payload,
            id,
            {
              lastBuildStatus: BUILD_STATUS.failed,
              lastBuildError: message,
              lastBuildRequestedAt: null,
            },
            req,
          );

          return Response.json({ error: message }, { status: 500 });
        }

        return Response.json({
          queued: true,
          buildToken,
          lastBuildStatus: BUILD_STATUS.building,
          lastBuildRequestedAt: requestedAt,
        });
      },
    },
    {
      // Variable list for the `@`-mention editor menu. Exposes an explicit
      // public allow-list from the presentation and its linked organisation.
      // Read access is enforced via findByID + user.
      path: '/:id/vars',
      method: 'get',
      handler: async (req: PayloadRequest) => {
        const user = req.user;
        if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 });

        const id = req.routeParams?.id as string | undefined;
        if (!id) return Response.json({ error: 'Identifiant manquant' }, { status: 400 });

        let doc;
        try {
          doc = await req.payload.findByID({
            collection: COLLECTIONS.presentations,
            id,
            depth: 1, // populate organisation so its fields can be flattened
            user,
            overrideAccess: false,
          });
        } catch {
          return Response.json({ error: 'Présentation introuvable' }, { status: 404 });
        }

        const record = doc as unknown as Record<string, unknown>;
        const orgRel = record.organisation;
        const orgVars =
          orgRel && typeof orgRel === 'object'
            ? flattenVars(orgRel as Record<string, unknown>, 'org')
            : [];
        const slideCount = Array.isArray(record.slides) ? record.slides.length : 0;
        const vars = [
          ...flattenVars(record),
          ...orgVars,
          {
            path: 'date',
            label: 'date',
            sample: new Date().toLocaleDateString(record.language === 'en' ? 'en-GB' : 'fr-FR'),
          },
          { path: 'page', label: 'page', sample: '1' },
          { path: 'total', label: 'total', sample: String(slideCount) },
        ];

        return Response.json({ vars });
      },
    },
  ],
  hooks: {
    beforeDelete: [beforePresentationDelete],
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data || typeof data !== 'object') return data;
        const record = data as Record<string, unknown>;
        const previous = originalDoc as
          | { documentTemplate?: unknown; slides?: unknown }
          | undefined;
        const template = resolveDocumentTemplate(
          Object.hasOwn(record, 'documentTemplate')
            ? record.documentTemplate
            : previous?.documentTemplate,
        );
        const pages = Object.hasOwn(record, 'slides') ? record.slides : previous?.slides;
        // Authors must be able to save the aggregate before the ID-based draft
        // workflow can populate it. Once at least one page exists, enforce the
        // complete template contract at the write boundary; the build boundary
        // revalidates even empty documents and therefore cannot emit artifacts
        // for an incomplete standardized template.
        if (pages !== undefined && (!Array.isArray(pages) || pages.length > 0)) {
          assertDocumentPages(template, pages);
        }
        record.documentTemplate = template.id;
        return data;
      },
    ],
    afterChange: [afterPresentationChange],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
      // Edited in place as the document heading (see TitleField).
      admin: { components: { Field: '/components/TitleField#default' } },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contenu',
          fields: [
            {
              name: 'slides',
              type: 'blocks',
              label: 'Pages',
              admin: {
                description:
                  'Une page par bloc. Les layouts proposés dépendent du template de document.',
                initCollapsed: true,
              },
              blocks: payloadBlocksForTemplate(),
              filterOptions: ({ data }) =>
                payloadBlockSlugsForTemplate(
                  (data as { documentTemplate?: unknown } | undefined)?.documentTemplate,
                ),
            },
          ],
        },
        {
          label: 'IA',
          fields: [
            {
              name: 'draftStatus',
              type: 'select',
              defaultValue: DRAFT_STATUS.idle,
              label: 'Génération IA',
              access: runPointerAccess,
              admin: {
                readOnly: true,
              },
              options: [
                { label: 'En attente', value: DRAFT_STATUS.idle },
                { label: 'Recherche', value: DRAFT_STATUS.gathering },
                { label: 'Plan', value: DRAFT_STATUS.structuring },
                { label: 'Rédaction', value: DRAFT_STATUS.drafting },
                { label: 'Validation', value: DRAFT_STATUS.validating },
                { label: 'Mise en page', value: DRAFT_STATUS.building },
                { label: 'Terminé', value: DRAFT_STATUS.done },
                { label: 'Échoué', value: DRAFT_STATUS.failed },
              ],
            },
            {
              name: 'agentBrief',
              type: 'textarea',
              label: 'Brief',
              // Only enforced on a non-empty value: the field stays optional
              // until a run is started, which requires the same floor.
              minLength: MIN_BRIEF_CHARS,
              access: agentOptionAccess,
              admin: {
                rows: 5,
                placeholder: "Ex : Webinaire de 45 min pour juristes d'entreprise sur…",
                description:
                  'Public, objectif, points à traiter. La génération prend plusieurs minutes.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'agentSlideCountMin',
                  type: 'number',
                  label: 'Slides minimum',
                  min: MIN_SLIDES,
                  max: MAX_SLIDES,
                  access: agentOptionAccess,
                  validate: validateSlideCountBound,
                  admin: { step: 1, placeholder: 'Auto', width: '50%' },
                },
                {
                  name: 'agentSlideCountMax',
                  type: 'number',
                  label: 'Slides maximum',
                  min: MIN_SLIDES,
                  max: MAX_SLIDES,
                  access: agentOptionAccess,
                  validate: validateSlideCountBound,
                  admin: {
                    step: 1,
                    placeholder: 'Auto',
                    width: '50%',
                    description:
                      'Vide = automatique. Couverture et conclusion incluses ; en mode ajout, ne compte que les nouvelles slides.',
                  },
                },
              ],
            },
            {
              name: 'agentKnowledgeBases',
              type: 'relationship',
              relationTo: COLLECTIONS.knowledgeBases,
              hasMany: true,
              maxRows: MAX_SELECTED_SOURCES,
              filterOptions: readyOrSelectedKnowledgeBases,
              label: 'Bases de connaissances',
              access: agentOptionAccess,
              admin: {
                description: 'Seules les bases contenant des documents indexés sont proposées.',
              },
            },
            {
              name: 'agentMode',
              type: 'radio',
              defaultValue: 'revise',
              label: 'Mode',
              access: agentOptionAccess,
              options: [
                { label: 'Réviser', value: 'revise' },
                { label: 'Recréer', value: 'replace' },
                { label: 'Ajouter à la fin', value: 'augment' },
              ],
              admin: {
                layout: 'horizontal',
                condition: (data) => Array.isArray(data?.slides) && data.slides.length > 0,
                description:
                  'Réviser réécrit le deck actuel ; Recréer repart du brief ; Ajouter conserve les slides et en ajoute à la fin.',
              },
            },
            {
              name: 'agentModel',
              type: 'text',
              defaultValue: DEFAULT_AGENT_MODEL,
              maxLength: 128,
              access: agentOptionAccess,
              validate: (value: unknown) => {
                const parsed = agentModelSchema.safeParse(value);
                return parsed.success || (parsed.error.issues[0]?.message ?? 'Modèle invalide');
              },
              admin: { hidden: true },
            },
            {
              name: 'agentVisualCritique',
              type: 'checkbox',
              defaultValue: true,
              label: 'Critique visuelle IA (plus lent, meilleur rendu)',
              access: agentOptionAccess,
            },
            {
              name: 'agentApprovalRequired',
              type: 'checkbox',
              defaultValue: false,
              label: 'Valider le plan avant rédaction',
              access: agentOptionAccess,
            },
            {
              name: 'agentRun',
              type: 'ui',
              admin: {
                components: { Field: '/components/AgentRunControls#default' },
              },
            },
            {
              name: 'draftRunId',
              type: 'text',
              access: runPointerAccess,
              admin: { hidden: true, readOnly: true },
            },
          ],
        },
        {
          label: 'Réglages',
          fields: [
            {
              name: 'buildStatusLive',
              type: 'ui',
              admin: {
                components: {
                  Field: '/components/BuildStatusField#default',
                },
              },
            },
            {
              name: 'organisation',
              type: 'relationship',
              relationTo: COLLECTIONS.organisations,
              required: true,
              index: true,
              label: 'Organisation',
              // Pre-select the author's default organisation so a new deck opens
              // with its charte graphique already applied.
              defaultValue: ({ user }) => defaultOrganisationId(user),
              // The read/update policy keys off this field, so a non-admin must not
              // be able to move a deck into — or out of — an organisation they are
              // not a member of.
              validate: (value: unknown, { req }: { req?: PayloadRequest }) =>
                !req?.user || userIsOrganisationMember(req.user, value)
                  ? true
                  : 'Vous n’êtes pas membre de cette organisation.',
              admin: {
                description:
                  'Charte graphique (couleurs, logo, polices) appliquée à cette présentation',
              },
            },
            documentTemplateField,
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              label: 'Identifiant',
              admin: {
                hidden: true,
                readOnly: true,
              },
              hooks: {
                // The identifier is infrastructure, not authoring input. Derive
                // it once from the title, then keep it stable so published URLs
                // do not move when an author edits the title later.
                beforeValidate: [
                  async ({ value, data, operation, originalDoc, req }) => {
                    if (operation !== 'create') {
                      return (originalDoc as { slug?: string } | undefined)?.slug ?? value;
                    }
                    const title = (data as { title?: string } | undefined)?.title;
                    if (!title) return value;
                    return uniqueSlugFromTitle(req, title);
                  },
                ],
              },
              validate: (value: string | null | undefined) => {
                if (!value) return "L'identifiant est requis";
                if (!isValidSlug(value))
                  return 'Format invalide : 1 à 64 caractères parmi a-z, 0-9, -';
                return true;
              },
            },
            {
              name: 'language',
              type: 'select',
              required: true,
              defaultValue: 'fr',
              label: 'Langue',

              options: [
                { label: 'Français', value: 'fr' },
                { label: 'Anglais', value: 'en' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'lastBuildStatus',
      type: 'select',
      defaultValue: BUILD_STATUS.idle,
      options: Object.values(BUILD_STATUS),
      admin: { readOnly: true, hidden: true },
    },
    {
      name: 'artifacts',
      type: 'array',
      label: 'Artefacts du build',
      admin: {
        hidden: true,
        readOnly: true,
      },
      access: { create: () => false, update: () => false },
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'actionLabel', type: 'text', required: true },
        { name: 'buildId', type: 'text', required: true, index: true },
        { name: 'file', type: 'upload', relationTo: COLLECTIONS.media },
        { name: 'url', type: 'text' },
        { name: 'pageIndex', type: 'number', min: 0 },
      ],
    },
    {
      name: 'lastBuildError',
      type: 'textarea',
      admin: { readOnly: true, hidden: true },
    },
    {
      name: 'lastBuildRequestedAt',
      type: 'date',
      admin: { readOnly: true, hidden: true },
    },
    {
      name: 'lastBuildToken',
      type: 'text',
      admin: { readOnly: true, hidden: true },
    },
  ],
};
