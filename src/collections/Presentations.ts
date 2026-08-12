import { createHash, randomUUID } from 'node:crypto';

import type { CollectionConfig, PayloadRequest } from 'payload';

import { isAdmin, isAdminOrAuthor, isAdminOrSelf, userIsAdmin } from '../access/roles';
import { BUILD_COOLDOWN_MS } from '../lib/draftConfig';
import { CTX } from '../lib/context';
import { BUILD_SLIDES_TASK } from '../jobs/buildSlides';
import { isValidSlug, slugFromTitle } from '../lib/slug';
import { COLLECTIONS } from '../lib/collections';
import { flattenVars } from '../export/vars';
import { BUILD_STATUS, DRAFT_STATUS, PRESENTATION_STATUS } from '../lib/status';
import { CoverBlock } from '../blocks/CoverBlock';
import { SectionBlock } from '../blocks/SectionBlock';
import { StatementBlock } from '../blocks/StatementBlock';
import { TwoColsBlock } from '../blocks/TwoColsBlock';
import { CardGridBlock } from '../blocks/CardGridBlock';
import { StatsBlock } from '../blocks/StatsBlock';
import { QuotesBlock } from '../blocks/QuotesBlock';
import { CtaBlock } from '../blocks/CtaBlock';
import { TableBlock } from '../blocks/TableBlock';
import { TimelineBlock } from '../blocks/TimelineBlock';
import { MermaidBlock } from '../blocks/MermaidBlock';
import { AgendaBlock } from '../blocks/AgendaBlock';
import { MarkdownBlock } from '../blocks/MarkdownBlock';
import { afterPresentationChange } from '../hooks/afterPresentationChange';

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

export const Presentations: CollectionConfig = {
  slug: COLLECTIONS.presentations,
  labels: { singular: 'Présentation', plural: 'Présentations' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'updatedAt'],
    preview: (data) => (typeof data.spaUrl === 'string' && data.spaUrl ? data.spaUrl : null),
    components: {
      edit: {
        beforeDocumentControls: ['/components/ExportButton#default'],
      },
    },
  },
  access: {
    create: isAdminOrAuthor,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
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
        const createdById =
          typeof presentation.createdBy === 'object'
            ? presentation.createdBy?.id
            : presentation.createdBy;
        if (!userIsAdmin(user) && createdById !== user.id) {
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
            { error: 'Un build a déjà été demandé récemment. Réessayez dans un instant.' },
            { status: 429 },
          );
        }

        const buildToken = randomUUID();

        const requestedAt = new Date().toISOString();

        // Stamp the request time + token before enqueuing, with the skipBuildQueue
        // flag so this patch doesn't itself trigger the hook. Set the visible
        // status immediately: the worker cron may not pick the job up for up to a
        // minute, but authors need confirmation in the Sortie tab right away.
        await req.payload.update({
          collection: COLLECTIONS.presentations,
          id,
          data: {
            lastBuildRequestedAt: requestedAt,
            lastBuildToken: buildToken,
            lastBuildStatus: BUILD_STATUS.building,
            lastBuildError: '',
          },
          overrideAccess: true,
          context: { [CTX.skipBuildQueue]: true },
        });

        // Cast needed until `payload generate:types` adds buildSlides to TypedJobs.
        await (req.payload.jobs.queue as (args: unknown) => Promise<unknown>)({
          task: BUILD_SLIDES_TASK,
          input: { presentationId: id, buildToken },
          req,
        });

        return Response.json({
          queued: true,
          buildToken,
          lastBuildStatus: BUILD_STATUS.building,
          lastBuildRequestedAt: requestedAt,
        });
      },
    },
    {
      // Variable list for the `@`-mention editor menu. Flattens the populated
      // presentation + its linked organisation into `{path, label, sample}`
      // entries — generic, so any scalar field on either collection appears
      // with no code change (SSOT). Read access enforced via findByID + user.
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
          { path: 'total', label: 'total', sample: String(slideCount) },
        ];

        return Response.json({ vars });
      },
    },
  ],
  hooks: {
    afterChange: [afterPresentationChange],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
      admin: { description: 'Titre de la présentation (ex. "Klarc — L\'innovation à 360°")' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contenu',
          description: 'Rédigez le contenu de la présentation.',
          fields: [
            {
              name: 'slides',
              type: 'blocks',
              label: 'Diapositives',
              admin: {
                description:
                  'Une diapositive par bloc. Choisissez un type de bloc pour ajouter une slide.',
              },
              blocks: [
                CoverBlock,
                SectionBlock,
                StatementBlock,
                TwoColsBlock,
                CardGridBlock,
                StatsBlock,
                QuotesBlock,
                CtaBlock,
                TableBlock,
                TimelineBlock,
                MermaidBlock,
                AgendaBlock,
                MarkdownBlock,
              ],
            },
          ],
        },
        {
          label: 'IA',
          description:
            "Build agentique : l'agent recherche, structure, rédige, critique et corrige la présentation à partir d'un brief.",
          fields: [
            {
              name: 'agentDraftFromBrief',
              type: 'ui',
              admin: {
                components: {
                  Field: '/components/AgentDraftButton#default',
                },
              },
            },
            {
              name: 'draftStatus',
              type: 'select',
              defaultValue: DRAFT_STATUS.idle,
              label: 'Statut du build agentique',
              admin: {
                description: "État du dernier build par l'agent IA",
                readOnly: true,
              },
              options: [
                { label: 'En attente', value: DRAFT_STATUS.idle },
                { label: 'Recherche', value: DRAFT_STATUS.gathering },
                { label: 'Plan', value: DRAFT_STATUS.structuring },
                { label: 'Rédaction', value: DRAFT_STATUS.drafting },
                { label: 'Validation', value: DRAFT_STATUS.validating },
                { label: 'Build visuel', value: DRAFT_STATUS.building },
                { label: 'Terminé', value: DRAFT_STATUS.done },
                { label: 'Échoué', value: DRAFT_STATUS.failed },
              ],
            },
            {
              name: 'draftEvents',
              type: 'json',
              label: "Journal de l'agent",
              admin: {
                description: 'Progression détaillée du dernier build agentique',
                readOnly: true,
                hidden: true,
              },
            },
            {
              name: 'draftRunId',
              type: 'text',
              admin: { hidden: true, readOnly: true },
            },
            {
              name: 'draftSources',
              type: 'json',
              label: 'Sources utilisées par l’agent',
              admin: {
                description: 'Sources sélectionnées pour le dernier build agentique',
                readOnly: true,
              },
            },
            {
              name: 'draftEvidence',
              type: 'json',
              label: 'Preuves des sources',
              admin: {
                description: 'Extraits de preuve collectés auprès des sources (diagnostic)',
                readOnly: true,
                hidden: true,
              },
            },
          ],
        },
        {
          label: 'Réglages',
          description: 'Réglages de classement et de publication.',
          fields: [
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: PRESENTATION_STATUS.draft,
              label: 'Statut',
              admin: {
                description: 'État de publication',
              },
              options: [
                { label: 'Brouillon', value: PRESENTATION_STATUS.draft },
                { label: 'Publiée', value: PRESENTATION_STATUS.published },
                { label: 'Archivée', value: PRESENTATION_STATUS.archived },
              ],
            },
            {
              name: 'organisation',
              type: 'relationship',
              relationTo: COLLECTIONS.organisations,
              required: true,
              label: 'Organisation',
              admin: {
                description:
                  'Charte graphique (couleurs, logo, polices) appliquée à cette présentation',
              },
            },
            {
              name: 'createdBy',
              type: 'relationship',
              relationTo: COLLECTIONS.users,
              label: 'Créé par',
              admin: {
                readOnly: true,
                description: 'Auteur de la présentation',
              },
              hooks: {
                beforeChange: [
                  ({ req, operation }) => {
                    if (operation === 'create') return req.user?.id;
                    return undefined;
                  },
                ],
              },
            },
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
              name: 'tags',
              type: 'text',
              hasMany: true,
              label: 'Tags',
              admin: { description: 'Mots-clés libres pour classer la présentation' },
            },
            {
              name: 'language',
              type: 'select',
              required: true,
              defaultValue: 'fr',
              label: 'Langue',
              admin: { description: 'Langue du contenu de la présentation' },
              options: [
                { label: 'Français', value: 'fr' },
                { label: 'Anglais', value: 'en' },
              ],
            },
            {
              name: 'footer',
              type: 'group',
              label: 'Pied de page',
              admin: {
                description:
                  'Bandeau bas de diapositive (masqué sur couverture, section et clôture). Balises : {org.name} {title} {date} {page} {total}',
              },
              fields: [
                {
                  name: 'enabled',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Afficher le pied de page',
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'left',
                      type: 'text',
                      defaultValue: '{org.name}',
                      label: 'Gauche',
                      admin: { description: 'Texte + balises. Vide = masqué.' },
                    },
                    {
                      name: 'center',
                      type: 'text',
                      label: 'Centre',
                      admin: { description: 'Texte + balises. Vide = masqué.' },
                    },
                    {
                      name: 'right',
                      type: 'text',
                      defaultValue: '{page} / {total}',
                      label: 'Droite',
                      admin: { description: 'Texte + balises. Vide = masqué.' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Sortie',
          description:
            'Artefacts générés automatiquement par le build (disponibles après publication).',
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
              name: 'lastBuildStatus',
              type: 'select',
              defaultValue: BUILD_STATUS.idle,
              label: 'Statut du dernier build',
              admin: {
                description: 'État du dernier processus de génération',
                readOnly: true,
                hidden: true,
              },
              options: [
                { label: 'En attente', value: BUILD_STATUS.idle },
                { label: 'En cours', value: BUILD_STATUS.building },
                { label: 'Réussi', value: BUILD_STATUS.success },
                { label: 'Échoué', value: BUILD_STATUS.failed },
              ],
            },
            {
              name: 'spaUrl',
              type: 'text',
              label: 'URL de la présentation web',
              admin: {
                description: 'Lien vers la version web interactive (généré automatiquement)',
                readOnly: true,
                hidden: true,
              },
            },
            {
              name: 'pdfFile',
              type: 'upload',
              relationTo: COLLECTIONS.media,
              label: 'Fichier PDF',
              admin: {
                description: 'PDF généré automatiquement par le système de build',
                readOnly: true,
                hidden: true,
              },
            },
            {
              name: 'coverImage',
              type: 'upload',
              relationTo: COLLECTIONS.media,
              label: 'Image de couverture',
              admin: {
                description: 'Miniature générée à partir de la première diapositive',
                readOnly: true,
                hidden: true,
              },
            },
            {
              name: 'lastBuildError',
              type: 'textarea',
              label: 'Erreur du dernier build',
              admin: {
                description: "Détails de l'erreur en cas d'échec du build",
                readOnly: true,
                hidden: true,
              },
            },
            {
              name: 'lastBuildRequestedAt',
              type: 'date',
              label: 'Dernière demande de build',
              admin: {
                description:
                  'Horodatage de la dernière demande de build à la volée (throttle anti-spam).',
                readOnly: true,
                hidden: true,
              },
            },
            {
              name: 'lastBuildToken',
              type: 'text',
              admin: { readOnly: true, hidden: true },
            },
          ],
        },
      ],
    },
  ],
};
