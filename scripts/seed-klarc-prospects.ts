import { join } from 'node:path';
import type { Presentation } from '../src/payload-types';
import { convertSlidesMarkdownToLexical } from '../src/lib/richTextWrite';
import { runPayloadScript } from './lib/payloadScript';

// Editorial authority: KLARC_base_information_IA.md (version with Chloé
// Liebgott) and the approved 2026-09-14 plan v2 (client-centric, 12 pages).
// AI drafting: gpt-6-astra. Testimonials are faithful extracts from the
// delivered historical deck; the extract containing a historical entity name
// and the "120 structures" figure are excluded on purpose.
const title = 'KLARC : Présentation clients';
// Earlier seeds saved the deck under this title; matched so a rerun renames
// instead of duplicating.
const LEGACY_TITLE = 'KLARC — Présentation clients';
// Brand logomark variants (public/brand): colour on paper, white on the teal
// cover/CTA surfaces, black as the paper fallback. Rendered small, top-left,
// by the per-slide header layer on every page including the cover.
const LOGO_VARIANTS = [
  { field: 'logo', filename: 'klarc-logomark.svg', alt: 'Logo klarc' },
  {
    field: 'logoWhite',
    filename: 'klarc-logomark-white.svg',
    alt: 'Logo klarc (blanc)',
  },
  {
    field: 'logoBlack',
    filename: 'klarc-logomark-black.svg',
    alt: 'Logo klarc (noir)',
  },
] as const;
const slides = [
  // Page 1 — cover
  {
    blockType: 'cover',
    eyebrow: 'TOULOUSE · LYON',
    title: 'KLARC : Avocats et Conseils en Propriété Industrielle',
    subtitle:
      'Conseil et contentieux pour les entreprises innovantes, à Toulouse, à Lyon et partout en France.',
  },
  // Page 2 — 4 situations client, grille 2x2 numérotée
  {
    blockType: 'cardGrid',
    eyebrow: 'VOTRE SITUATION',
    title: 'Les situations que vous rencontrez',
    sidebarText:
      'Quatre situations fréquentes où une décision juridique, technique ou financière engage votre activité.',
    columns: '2',
    cards: [
      {
        number: '01',
        title: 'Vous négociez un contrat déterminant pour votre activité',
        description:
          'Répartition des risques, garanties, propriété des résultats, conditions de sortie : nous analysons les clauses, mesurons leurs conséquences et conduisons la négociation à vos côtés.',
      },
      {
        number: '02',
        title: 'Vous souhaitez protéger votre innovation ou votre image',
        description:
          'Levée de fonds, partenariat, salon ou publication : avant toute divulgation, nous vérifions les protections disponibles, organisons la confidentialité et arrêtons avec vous la stratégie de dépôt.',
      },
      {
        number: '03',
        title: 'Vous sollicitez un financement ou un dispositif fiscal',
        description:
          'CIR, CII, statut JEI, subventions : nous vérifions les conditions applicables à votre situation et constituons un dossier documenté en vue d’un éventuel examen de l’administration.',
      },
      {
        number: '04',
        title: 'Vous êtes confronté à un différend ou à un contrôle',
        description:
          'Réclamation, assignation ou avis de vérification : nous analysons les pièces, identifions les délais qui courent et définissons avec vous la stratégie de réponse et de défense.',
      },
    ],
  },
  // Page 3 — contraste problème / réponse
  {
    blockType: 'twoCols',
    eyebrow: 'LE CONSTAT',
    title: 'Le problème des expertises dispersées',
    lead: 'Pourquoi une seule équipe examine l’ensemble de votre dossier.',
    intro:
      'Votre projet innovant touche à la fois au droit, à la science, à la fiscalité et au financement. Consulter séparément multiplie les interlocuteurs, allonge les délais et peut conduire à des analyses incohérentes. Vous devez pourtant décider à partir d’une lecture commune de votre situation.',
    leftFooter:
      'L’enjeu : examiner ensemble les conséquences juridiques, techniques et financières de vos choix.',
    rightCards: [
      {
        title: 'Une seule équipe',
        description:
          'Au sein d’une même société pluriprofessionnelle d’exercice (SPE), avocats, Conseils en Propriété Industrielle, scientifiques et intervenants en financement examinent ensemble les questions que soulève votre projet.',
      },
      {
        title: 'Un même dossier partagé',
        description:
          'Les intervenants travaillent à partir des mêmes pièces, hypothèses et échéances, dans le respect des règles de confidentialité applicables.',
      },
      {
        title: 'Des professions réglementées',
        description:
          'Avocats et Conseils en Propriété Industrielle interviennent dans le respect des obligations déontologiques propres à leurs professions : secret professionnel, indépendance et prévention des conflits d’intérêts.',
      },
      {
        title: 'Une cohérence par construction',
        description:
          'Les dimensions juridiques, techniques et fiscales de votre projet sont examinées au sein d’une même structure, pour construire une stratégie commune.',
      },
    ],
  },
  // Page 4 — 4 temps d'action
  {
    blockType: 'timeline',
    eyebrow: 'SUR VOTRE DOSSIER',
    title: 'Notre réponse à vos besoins',
    lead: 'Quatre temps, de l’analyse de votre situation à la défense de vos droits.',
    steps: [
      {
        label: 'Analyser votre situation',
        description:
          'Examiner vos pièces, vos objectifs et vos échéances ; identifier les risques, les options et les points à trancher.',
      },
      {
        label: 'Conseiller une stratégie',
        description:
          'Vous recommander une voie et en expliquer les effets juridiques, fiscaux et opérationnels ; arbitrer les choix avec vous.',
      },
      {
        label: 'Formaliser vos décisions',
        description:
          'Rédiger les actes, négocier les clauses, déposer les titres et réunir les justificatifs qui sécurisent vos choix.',
      },
      {
        label: 'Représenter et défendre vos droits',
        description:
          'Préparer les réponses, les pièces et les écritures ; vous représenter en cas de négociation, de différend ou de contrôle.',
      },
    ],
    footer:
      'Les actions et les livrables sont définis selon votre situation et le périmètre de la mission.',
  },
  // Page 5 — cœur avocat
  {
    blockType: 'table',
    eyebrow: 'SITUATIONS 01 ET 04 · CONSEIL ET CONTENTIEUX',
    title: 'Conseiller, rédiger et défendre',
    lead: 'Contrats, vie de la société et différends : ce que l’avocat prend en charge sur votre dossier.',
    tableVariant: 'reference',
    columns: [{ header: 'Vos besoins' }, { header: 'Notre intervention' }],
    rows: [
      {
        cells: [
          { value: 'Vos contrats et accords' },
          {
            value:
              'Rédiger et négocier vos contrats commerciaux, partenariats et accords de confidentialité ; préciser les obligations, les responsabilités et les conditions de sortie.',
          },
        ],
      },
      {
        cells: [
          { value: 'La vie de votre société' },
          {
            value:
              'Rédiger vos statuts et pactes ; conseiller les associés et dirigeants sur la gouvernance, préparer les décisions sociales et accompagner les restructurations.',
          },
        ],
      },
      {
        cells: [
          { value: 'Vos différends et contrôles' },
          {
            value:
              'Examiner les voies de résolution, préparer le précontentieux et conduire le contentieux ; vous assister et défendre vos droits lors d’un contrôle fiscal.',
          },
        ],
      },
    ],
  },
  // Page 6 — propriété intellectuelle
  {
    blockType: 'twoCols',
    eyebrow: 'SITUATION 02 · VOS ACTIFS IMMATÉRIELS',
    title: 'Protéger et exploiter vos actifs immatériels',
    lead: 'Brevets, marques, logiciels et savoir-faire, de la stratégie de protection à la défense de vos droits.',
    intro:
      'Conseils en Propriété Industrielle (CPI) et avocats travaillent sur le même dossier pour articuler protection, contrats et défense de vos actifs.',
    rightCards: [
      {
        title: 'Vos brevets et inventions',
        description:
          'Examiner la brevetabilité et la titularité de vos inventions ; rédiger et déposer vos demandes de brevet, suivre les procédures et négocier les accords d’exploitation.',
      },
      {
        title: 'Vos marques, dessins et modèles',
        description:
          'Examiner les antériorités et les territoires utiles ; déposer vos marques, dessins et modèles, suivre les titres et défendre vos droits.',
      },
      {
        title: 'Vos logiciels',
        description:
          'Vérifier la titularité des droits et documenter les contributions ; rédiger et négocier les licences, défendre vos droits en cas d’atteinte.',
      },
      {
        title: 'Vos savoir-faire',
        description:
          'Identifier les informations confidentielles, documenter vos savoir-faire et organiser leur protection ; encadrer leur communication et leur exploitation par contrat.',
      },
    ],
  },
  // Page 7 — financement et fiscalité de l'innovation
  {
    blockType: 'table',
    eyebrow: 'SITUATION 03 · VOS PROJETS D’INNOVATION',
    title: 'Financer, étayer et organiser vos projets d’innovation',
    lead: 'Aides, fiscalité de l’innovation et preuves de R&D examinés dans une même démarche.',
    tableVariant: 'reference',
    columns: [{ header: 'Vos besoins' }, { header: 'Notre intervention' }],
    rows: [
      {
        cells: [
          { value: 'Vos aides et financements' },
          {
            value:
              'Examiner les dispositifs adaptés à votre projet, leurs critères et leurs contraintes ; préparer les demandes et suivre les obligations liées aux financements obtenus.',
          },
        ],
      },
      {
        cells: [
          { value: 'Votre fiscalité de l’innovation' },
          {
            value:
              'CIR, CII, JEI et IP Box : examiner les conditions applicables à votre situation, les dépenses ou revenus concernés et les justificatifs à réunir.',
          },
        ],
      },
      {
        cells: [
          { value: 'Votre organisation et vos preuves de R&D' },
          {
            value:
              'Structurer vos projets, leurs jalons et leurs responsables ; documenter l’état de l’art, les travaux et les résultats pour relier les preuves aux dépenses en cas de contrôle.',
          },
        ],
      },
    ],
    footnotes: [
      {
        text: 'L’éligibilité aux dispositifs dépend notamment de l’examen des pièces ; les décisions relèvent de l’administration et des financeurs.',
      },
    ],
  },
  // Page 8 — témoignages (extraits fidèles du deck historique livré)
  {
    blockType: 'quotes',
    eyebrow: 'TÉMOIGNAGES',
    title: 'Ils nous font confiance',
    lead: 'Extraits de témoignages de clients accompagnés par le cabinet, reproduits avec leur attribution.',
    quotes: [
      {
        quote:
          'EspeRare Foundation a collaboré avec Klarc sur un projet de licence sur un dispositif médical en développement, la collaboration est au TOP, je recommande cette équipe réactive et dynamique qui nous a apporté du soutien dans plusieurs domaines […]',
        authorName: 'Florence Porte-Thome',
        authorRole: 'Co-fondatrice et Directrice R&D, EspeRare Foundation',
      },
      {
        quote:
          'Le service Klarc aux petits soins. Les avocats que j’ai eus sur différents domaines en droit du digital et en propriété intellectuelle sont professionnels, réactifs et efficaces dans leur accompagnement juridique !',
        authorName: 'Marc Girard',
        authorRole: 'Président, Tillin',
      },
      {
        quote:
          'Benjamin, Carine et leurs équipes m’ont accompagné lorsque j’étais à la tête d’une équipe de R&D. Leur accompagnement était à la hauteur des enjeux, éclairé et nous a permis d’obtenir le CIR sans problème. Une belle équipe !',
        authorName: 'Kristof Descotes',
        authorRole: 'Althea',
      },
    ],
  },
  // Page 9 — vos contacts (shared person-card grid; people wired at seed time)
  {
    blockType: 'cardGrid',
    eyebrow: 'VOS INTERLOCUTEURS',
    title: 'Vos contacts',
    sidebarText:
      'Une équipe resserrée, des interlocuteurs identifiés : chaque mission est suivie par les personnes qui la conduisent.',
  },
  // Page 10 — cta
  {
    blockType: 'cta',
    eyebrow: 'UN PREMIER ÉCHANGE',
    title: 'Parlons de votre situation',
    subtitle:
      'Nous vous proposons un premier échange de 30 minutes pour examiner un contrat, un actif, un différend, une question fiscale ou un financement, et préciser les points à approfondir.',
    // Buttons and office details carry their own targets so the exported PDF
    // is clickable: booking page, site, and one tel:/mailto: per office.
    primaryAction: 'Prendre rendez-vous',
    primaryActionUrl: '{org.bookingUrl}',
    secondaryAction: 'klarc.com',
    secondaryActionUrl: '{org.website}',
    footerNote:
      '**Toulouse** · 15 rue d’Alsace-Lorraine, 31000 · [+33 (0)5 61 38 53 52](tel:+33561385352) · [toulouse@klarc.com](mailto:toulouse@klarc.com)\n\n**Lyon** · 3 rue de Genève, 69006 · [+33 (0)5 25 63 09 36](tel:+33525630936) · [lyon@klarc.com](mailto:lyon@klarc.com)',
  },
];

await runPayloadScript(async (payload) => {
  const org = (
    await payload.find({
      collection: 'organisations',
      where: { name: { equals: 'Klarc' } },
      limit: 2,
      overrideAccess: true,
    })
  ).docs;
  if (org.length === 0) {
    org.push(
      await payload.create({
        collection: 'organisations',
        data: {
          name: 'Klarc',
          primary: '#02585C',
          secondary: '#F5A3B0',
          ink: '#0F2A2B',
          paper: '#FAFBFB',
          headingFont: 'Newsreader',
          bodyFont: 'IBM Plex Sans',
        },
        overrideAccess: true,
        context: { skipBuildQueue: true },
      }),
    );
  }
  if (org.length !== 1 || org[0].primary !== '#02585C')
    throw new Error('Expected verified Klarc brand not found');
  // One media doc per logo variant, idempotent by alt (Payload renames an
  // upload whose filename already exists on disk, so filename is not stable).
  const logos: Record<string, number | string> = {};
  for (const variant of LOGO_VARIANTS) {
    const prior = (
      await payload.find({
        collection: 'media',
        where: { alt: { equals: variant.alt } },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0];
    const doc =
      prior ??
      (await payload.create({
        collection: 'media',
        data: { alt: variant.alt },
        filePath: join(process.cwd(), 'public/brand', variant.filename),
        overrideAccess: true,
      }));
    logos[variant.field] = doc.id;
  }
  await payload.update({
    collection: 'organisations',
    id: org[0].id,
    data: {
      ...logos,
      // Public contact details: link the logo and footer name to the site,
      // feed {org.bookingUrl}/{org.website} to the closing slide's buttons.
      website: 'https://klarc.com',
      // Same families as klarc.com (Elementor heading/body variables), both
      // served by Google Fonts in the export and the admin preview.
      headingFont: 'Newsreader',
      bodyFont: 'IBM Plex Sans',
      bookingUrl: 'https://cal.klarc.com/team/meeting?user=team&duration=30',
      contactEmail: 'toulouse@klarc.com',
      phone: '+33 (0)5 61 38 53 52',
    },
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });
  const richSlides = await convertSlidesMarkdownToLexical(structuredClone(slides), payload);
  // Resolve existing canonical accounts only; a deck seed must not migrate,
  // delete or manufacture login identities. Preserve their names and portraits.
  const people = {
    joachim: 'joachim.brindeau@klarc.com',
    lucien: 'lucien.trouette@klarc.com',
    benjamin: 'benjamin.visser@klarc.com',
    carine: 'carine.doyharcabal@klarc.com',
  } as const;
  const userIds = new Map<string, number | string>();
  for (const [key, email] of Object.entries(people)) {
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 2,
      overrideAccess: true,
    });
    if (docs.length !== 1) throw new Error(`Expected one existing account for ${email}`);
    userIds.set(key, docs[0].id);
  }
  const wire = (page: number, keys: (keyof typeof people)[]) => {
    (richSlides[page - 1] as Record<string, unknown>).intervenants = keys.map((key) => ({
      user: userIds.get(key),
    }));
  };
  wire(9, ['joachim', 'benjamin', 'lucien', 'carine']);
  const data = {
    title,
    organisation: org[0].id,
    language: 'fr',
    status: 'published',
    documentTemplate: 'presentation',
    agentModel: 'gpt-6-astra',
    footer: {
      enabled: true,
      left: 'KLARC',
      center: 'Avocats et Conseils en Propriété Industrielle',
      right: '{page} / {total}',
    },
    slides: richSlides,
  } as unknown as Presentation;
  const existing = (
    await payload.find({
      collection: 'presentations',
      where: { title: { in: [title, LEGACY_TITLE] } },
      limit: 2,
      overrideAccess: true,
    })
  ).docs;
  if (existing.length > 1) throw new Error('Ambiguous presentation title');
  const saved = existing[0]
    ? await payload.update({
        collection: 'presentations',
        id: existing[0].id,
        data,
        overrideAccess: true,
        context: { skipBuildQueue: true },
      })
    : await payload.create({
        collection: 'presentations',
        data,
        overrideAccess: true,
        context: { skipBuildQueue: true },
      });
  const verified = await payload.findByID({
    collection: 'presentations',
    id: saved.id,
    depth: 0,
    overrideAccess: true,
  });
  if (verified.slides?.length !== 10) throw new Error('Expected 10 persisted slides');
  console.log(
    JSON.stringify({
      id: verified.id,
      slug: verified.slug,
      title: verified.title,
      slides: verified.slides.length,
    }),
  );
});
