import type { CollectionConfig, PayloadRequest } from 'payload';

import { isAdmin, isAdminOrSelf, isLoggedIn, userIsAdmin } from '../access/roles';
import { BUILD_COOLDOWN_MS } from '../lib/draftConfig';
import { CTX } from '../lib/context';
import { BUILD_SLIDES_TASK } from '../jobs/buildSlides';
import { isValidSlug, SLUG_MAX } from '../lib/slug';
import { COLLECTIONS } from '../lib/collections';
import { BUILD_STATUS, PRESENTATION_STATUS } from '../lib/status';
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
import { MarkdownBlock } from '../blocks/MarkdownBlock';
import { afterPresentationChange } from '../hooks/afterPresentationChange';

export const Presentations: CollectionConfig = {
  slug: COLLECTIONS.presentations,
  labels: { singular: 'Présentation', plural: 'Présentations' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'updatedAt'],
    livePreview: {
      url: '/preview',
    },
  },
  access: {
    create: isLoggedIn,
    read: isLoggedIn,
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

        // Stamp the request time atomically before enqueuing, with the
        // skipBuildQueue flag so this patch doesn't itself trigger the hook.
        await req.payload.update({
          collection: COLLECTIONS.presentations,
          id,
          data: { lastBuildRequestedAt: new Date().toISOString() },
          overrideAccess: true,
          context: { [CTX.skipBuildQueue]: true },
        });

        // Cast needed until `payload generate:types` adds buildSlides to TypedJobs.
        await (req.payload.jobs.queue as (args: unknown) => Promise<unknown>)({
          task: BUILD_SLIDES_TASK,
          input: { presentationId: id },
          req,
        });

        return Response.json({ queued: true });
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
              name: 'draftFromBrief',
              type: 'ui',
              admin: {
                components: {
                  Field: '/components/DraftFromBriefButton#default',
                },
              },
            },
            {
              name: 'slides',
              type: 'blocks',
              label: 'Diapositives',
              admin: { description: 'Une diapositive par bloc. Choisissez un type de bloc pour ajouter une slide.' },
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
                MarkdownBlock,
              ],
            },
          ],
        },
        {
          label: 'Métadonnées',
          description: 'Informations de classement et de publication.',
          fields: [
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              label: 'Identifiant',
              admin: {
                description:
                  'URL unique (lettres minuscules, chiffres et tirets, max 64 caractères). Généré automatiquement à partir du titre si laissé vide.',
              },
              hooks: {
                // Auto-slugify from the title so a first save never fails on
                // an empty required field hidden in another tab.
                beforeValidate: [
                  ({ value, data }) => {
                    if (value) return value;
                    const title = (data as { title?: string } | undefined)?.title;
                    if (!title) return value;
                    return title
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '')
                      .slice(0, SLUG_MAX)
                      .replace(/-+$/g, '');
                  },
                ],
              },
              validate: (value: string | null | undefined) => {
                if (!value) return 'L\'identifiant est requis';
                if (!isValidSlug(value)) return 'Format invalide : 1 à 64 caractères parmi a-z, 0-9, -';
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
          description: 'Artefacts générés automatiquement par le build (disponibles après publication).',
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
              },
            },
            {
              name: 'lastBuildError',
              type: 'textarea',
              label: 'Erreur du dernier build',
              admin: {
                description: 'Détails de l\'erreur en cas d\'échec du build',
                readOnly: true,
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
          ],
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: PRESENTATION_STATUS.draft,
      label: 'Statut',
      admin: {
        description: 'État de publication',
        position: 'sidebar',
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
        position: 'sidebar',
        description: 'Charte graphique (couleurs, logo, polices) appliquée à cette présentation',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: COLLECTIONS.users,
      label: 'Créé par',
      admin: {
        readOnly: true,
        position: 'sidebar',
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
  ],
};
