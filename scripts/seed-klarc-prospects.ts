import { join } from 'node:path';
import type { Presentation } from '../src/payload-types';
import { convertSlidesMarkdownToLexical } from '../src/lib/richTextWrite';
import { runPayloadScript } from './lib/payloadScript';

// Editorial authority: KLARC_base_information_IA.md v1.2 and the approved
// 2026-09-14 prospect plan. No client claims or historical metrics are reused.
const title = 'KLARC — Présentation clients';
const slides = [
  {
    blockType: 'cover',
    eyebrow: 'KLARC · TOULOUSE / LYON',
    title: 'Avocats et Conseils en Propriété Industrielle',
    subtitle:
      'Conseil et contentieux pour les entreprises.\n\nProtection, financement et organisation de l’innovation.',
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'VOS ENJEUX',
    title: 'Préserver vos droits et vos possibilités d’action',
    sidebarText:
      'Dirigeants, directions juridiques, financières et scientifiques : un accompagnement adapté à votre situation.',
    columns: '3',
    cards: [
      {
        number: '01',
        title: 'Conclure des accords adaptés',
        description:
          'Clarifier les engagements, répartir les responsabilités et anticiper les désaccords.',
      },
      {
        number: '02',
        title: 'Conserver la valeur de vos actifs',
        description:
          'Protéger les créations et les technologies ; organiser leur exploitation et leur transmission.',
      },
      {
        number: '03',
        title: 'Faire valoir vos droits',
        description:
          'Prévenir un différend, négocier une issue ou défendre vos intérêts en contentieux.',
      },
    ],
  },
  {
    blockType: 'twoCols',
    eyebrow: 'DROIT DES AFFAIRES · CONSEIL ET CONTENTIEUX',
    title: 'Conseiller et défendre votre entreprise',
    intro:
      '**Organiser la vie de la société**\n\n\nCréation, statuts et pactes d’associés.\n\nGouvernance et conseil aux dirigeants.\n\nRestructurations et fusions-acquisitions, selon la mission.',
    leftFooter:
      'Une intervention autonome ou coordonnée avec la propriété intellectuelle et le droit fiscal.',
    rightCards: [
      {
        title: 'Rédiger et négocier',
        description:
          'Contrats commerciaux, distribution, concurrence, partenariats et conditions générales.',
      },
      {
        title: 'Prévenir et traiter les différends',
        description:
          'Impayés, inexécutions, ruptures de relations commerciales : assistance, négociation et contentieux.',
      },
    ],
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'PROPRIÉTÉ INTELLECTUELLE',
    title: 'Protéger vos actifs et organiser leur exploitation',
    sidebarText:
      'Identifier les titulaires, examiner les droits de tiers, négocier les licences et défendre les droits.',
    columns: '3',
    cards: [
      {
        number: '01',
        title: 'Inventions et brevets',
        description:
          'Brevetabilité, rédaction et dépôt, suivi des titres et liberté d’exploitation.',
      },
      {
        number: '02',
        title: 'Marques et créations',
        description:
          'Disponibilité, dépôts, surveillance, oppositions et protection des créations.',
      },
      {
        number: '03',
        title: 'Logiciels et savoir-faire',
        description:
          'Logiciels, bases de données et secrets d’affaires : titularité, preuve et confidentialité.',
      },
    ],
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'FINANCEMENT ET FISCALITÉ',
    title: 'Financer les projets, étayer leur traitement fiscal',
    sidebarText:
      'Les aides dépendent des financeurs ; les régimes fiscaux s’appliquent sous conditions. Aucun résultat n’est garanti.',
    columns: '3',
    cards: [
      {
        number: '01',
        title: 'Aides et financements',
        description:
          'Identifier les ressources, préparer les dossiers et organiser le calendrier des démarches.',
      },
      {
        number: '02',
        title: 'Fiscalité de l’innovation',
        description:
          'CIR, CII, JEI, IP Box : examiner les conditions, les dépenses et les justificatifs.',
      },
      {
        number: '03',
        title: 'Contrôle et contentieux',
        description:
          'Analyser les demandes, préparer les réponses et défendre la position de l’entreprise.',
      },
    ],
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'RECHERCHE ET DÉVELOPPEMENT (R&D)',
    title: 'Rendre vos projets de R&D plus faciles à piloter',
    sidebarText:
      'Un appui scientifique et organisationnel complémentaire aux interventions juridiques et financières.',
    columns: '3',
    cards: [
      {
        number: '01',
        title: 'Des priorités explicites',
        description:
          'Qualifier les projets, comparer les options et définir les critères de poursuite.',
      },
      {
        number: '02',
        title: 'Des décisions mieux suivies',
        description:
          'Préciser les responsabilités, les jalons et les modalités de revue des travaux.',
      },
      {
        number: '03',
        title: 'Une documentation exploitable',
        description:
          'Relier hypothèses, essais, résultats et dépenses ; conserver les preuves utiles.',
      },
    ],
  },
  {
    blockType: 'twoCols',
    eyebrow: 'EXEMPLE ILLUSTRATIF · HORS DOSSIER CLIENT',
    title: 'Une collaboration R&D engage plus qu’un contrat',
    intro:
      '**Une entreprise et un partenaire développent une technologie.**\n\n\nLeurs choix contractuels dépendent des apports, des travaux scientifiques et des usages futurs.',
    leftFooter:
      'Droit, propriété industrielle, science et fiscalité : des analyses à coordonner lorsque le projet le nécessite.',
    rightCards: [
      {
        title: 'Quels apports ? Quels propriétaires ?',
        description:
          'Distinguer les connaissances antérieures et les résultats ; définir leur titularité.',
      },
      {
        title: 'Quels usages ? Quelles preuves ?',
        description: 'Fixer les droits d’exploitation ; documenter les travaux et les dépenses.',
      },
    ],
  },
  {
    blockType: 'timeline',
    eyebrow: 'MODALITÉS D’ACCOMPAGNEMENT',
    title: 'Une mission définie à partir de votre situation',
    steps: [
      { label: 'Qualifier', description: 'Besoin, parties, documents et échéances.' },
      {
        label: 'Convenir',
        description: 'Interlocuteur principal, périmètre et honoraires ; lettre de mission.',
      },
      { label: 'Conduire', description: 'Travaux et échanges avec les professionnels concernés.' },
      {
        label: 'Remettre et suivre',
        description: 'Actes, analyses ou préconisations ; suivi convenu.',
      },
    ],
    footer: 'Une intervention ponctuelle ou transversale, selon les enjeux du dossier.',
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'UN MÊME CABINET · DES QUALITÉS DISTINCTES',
    title: 'Réunir les compétences utiles à votre dossier',
    sidebarText:
      'Une société pluriprofessionnelle d’exercice (SPE), à Toulouse et Lyon. Les profils de l’équipe figurent en annexe.',
    columns: '2',
    cards: [
      {
        title: 'Avocats et Conseils en Propriété Industrielle',
        description:
          'Conseil, actes, négociation, protection des droits et contentieux, dans le champ de chaque profession.',
      },
      {
        title: 'Compétences complémentaires',
        description:
          'Juriste en propriété intellectuelle, équipe scientifique, fiscalité et financement : un appui mobilisé selon la mission.',
      },
    ],
  },
  {
    blockType: 'cta',
    eyebrow: 'PARLONS DE VOTRE SITUATION',
    title: 'Quel sujet souhaitez-vous examiner ?',
    subtitle:
      'Un contrat, un actif à protéger, un différend, une question fiscale ou un projet à financer.\n\n[Réserver un premier échange](https://cal.klarc.com/team/meeting?user=team&duration=30) · [klarc.com](https://klarc.com)',
    footerNote:
      '**Toulouse · siège** — 15 rue d’Alsace-Lorraine, 31000 Toulouse\n[toulouse@klarc.com](mailto:toulouse@klarc.com)\n\n**Lyon · établissement** — 3 rue de Genève, 69006 Lyon\n[lyon@klarc.com](mailto:lyon@klarc.com)',
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'ANNEXE · ÉQUIPE 1/2',
    title: 'Droit et propriété industrielle',
    columns: '2',
    cards: [
      {
        title: 'Joachim Brindeau',
        description:
          '**Avocat en droit des affaires**\n\nContrats, partenariats, licences et précontentieux. Parcours en biotechnologies, droit des affaires et propriété intellectuelle.',
      },
      {
        title: 'Benjamin Visser',
        description:
          '**Avocat fiscaliste**\n\nFiscalité des entreprises et de l’innovation, contrôles et contentieux. Formation d’ingénieur, en finance et en droit des affaires.',
      },
      {
        title: 'Lucien Trouette',
        description:
          '**Conseil en Propriété Industrielle, mention Brevets**\n\nInventions, brevets et liberté d’exploitation. Parcours en biochimie structurale et formation au CEIPI.',
      },
      {
        title: 'Valentine Clédière',
        description:
          '**Juriste en propriété intellectuelle**\n\nMarques, logiciels, bases de données et gestion des droits. Master en propriété intellectuelle, Université Toulouse Capitole.',
      },
    ],
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'ANNEXE · ÉQUIPE 2/2',
    title: 'Science, fiscalité et financement',
    columns: '2',
    cards: [
      {
        title: 'Carine Doyharçabal',
        description:
          '**Docteure, responsable opérationnelle**\n\nGénétique quantitative, expérience statistique et managériale. Conduite de missions, encadrement et structuration de la R&D.',
      },
      {
        title: 'Chloé Liebgott',
        description:
          '**Docteure de Toulouse INP, rédactrice scientifique**\n\nDans l’équipe de Carine. Recherches à Toxalim et à l’IPREM ; analyse de données, rédaction et coordination R&D.',
      },
      {
        title: 'Samuel Bélé',
        description:
          '**Responsable de mission**\n\nAncien inspecteur des finances publiques. Fiscalité de l’innovation, justificatifs de CIR et CII, contrôles et financements publics.',
      },
      {
        title: 'Elisa Vibert',
        description:
          '**Consultante en financement de l’innovation**\n\nAnalyse économique et dossiers d’aides, de subventions et d’appels à projets. Formation en management stratégique, TSM.',
      },
    ],
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
          headingFont: 'Gilroy',
          bodyFont: 'Roboto',
        },
        overrideAccess: true,
        context: { skipBuildQueue: true },
      }),
    );
  }
  if (org.length !== 1 || org[0].primary !== '#02585C')
    throw new Error('Expected verified Klarc brand not found');
  // Original mark on a neutral plaque: the teal mark otherwise disappears on
  // native cover/CTA teal surfaces. No renderer or shared stylesheet changes.
  {
    const filename = 'klarc-logomark-on-white.svg';
    const prior = (
      await payload.find({
        collection: 'media',
        where: { filename: { equals: filename } },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0];
    const logo =
      prior ??
      (await payload.create({
        collection: 'media',
        data: { alt: 'Logomark officiel KLARC' },
        filePath: join(process.cwd(), 'scripts/seed-assets/klarc-prospects', filename),
        overrideAccess: true,
      }));
    await payload.update({
      collection: 'organisations',
      id: org[0].id,
      data: { logo: logo.id },
      overrideAccess: true,
      context: { skipBuildQueue: true },
    });
  }
  const richSlides = await convertSlidesMarkdownToLexical(structuredClone(slides), payload);
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
      where: { title: { equals: title } },
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
  if (verified.slides?.length !== 12) throw new Error('Expected 12 persisted slides');
  console.log(
    JSON.stringify({
      id: verified.id,
      slug: verified.slug,
      title: verified.title,
      slides: verified.slides.length,
    }),
  );
});
