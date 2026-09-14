import { join } from 'node:path';
import type { Presentation } from '../src/payload-types';
import { convertSlidesMarkdownToLexical } from '../src/lib/richTextWrite';
import { runPayloadScript } from './lib/payloadScript';

// Editorial authority: KLARC_base_information_IA.md (version with Chloé
// Liebgott) and the approved 2026-09-14 plan v2 (client-centric, 12 pages).
// AI drafting: gpt-6-astra. Testimonials are faithful extracts from the
// delivered historical deck; the extract containing a historical entity name
// and the "120 structures" figure are excluded on purpose.
const title = 'KLARC — Présentation clients';
const LOGO_FILENAME = 'klarc-logomark-on-white.svg';
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
        title: 'Vous vous apprêtez à divulguer une innovation',
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
    ],
  },
  // Page 4 — 4 temps d'action
  {
    blockType: 'timeline',
    eyebrow: 'SUR VOTRE DOSSIER',
    title: 'Ce que nous faisons sur votre dossier',
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
    blockType: 'cardGrid',
    eyebrow: 'SITUATIONS 01 ET 04 · L’ACCOMPAGNEMENT JURIDIQUE',
    title: 'Conseiller, rédiger et défendre',
    columns: '3',
    cards: [
      {
        title: 'Vos contrats et accords',
        description:
          'Rédiger et négocier vos contrats commerciaux, partenariats et accords de confidentialité ; préciser les obligations, les responsabilités et les conditions de sortie.',
      },
      {
        title: 'La vie de votre société',
        description:
          'Rédiger vos statuts et pactes ; conseiller les associés et dirigeants sur la gouvernance, préparer les décisions sociales et accompagner les restructurations.',
      },
      {
        title: 'Vos différends et contrôles',
        description:
          'Examiner les voies de résolution, préparer le précontentieux et conduire le contentieux ; vous assister et défendre vos droits lors d’un contrôle fiscal.',
      },
    ],
  },
  // Page 6 — propriété intellectuelle
  {
    blockType: 'cardGrid',
    eyebrow: 'SITUATION 02 · VOTRE PROPRIÉTÉ INTELLECTUELLE',
    title: 'Protéger et exploiter vos actifs immatériels',
    sidebarText:
      'Conseils en Propriété Industrielle (CPI) et avocats travaillent sur le même dossier pour articuler protection, contrats et défense de vos actifs.',
    columns: '3',
    cards: [
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
        title: 'Vos logiciels et savoir-faire',
        description:
          'Vérifier la titularité des droits, documenter les contributions et organiser la confidentialité ; rédiger et négocier les licences, défendre vos droits en cas d’atteinte.',
      },
    ],
  },
  // Page 7 — financement et fiscalité de l'innovation
  {
    blockType: 'cardGrid',
    eyebrow: 'SITUATION 03 · VOS PROJETS D’INNOVATION',
    title: 'Financer, étayer et organiser vos projets d’innovation',
    columns: '3',
    cards: [
      {
        title: 'Vos aides et financements',
        description:
          'Examiner les dispositifs adaptés à votre projet, leurs critères et leurs contraintes ; préparer les demandes et suivre les obligations liées aux financements obtenus.',
      },
      {
        title: 'Votre fiscalité de l’innovation',
        description:
          'CIR, CII, JEI et IP Box : examiner les conditions applicables à votre situation, les dépenses ou revenus concernés et les justificatifs à réunir.',
      },
      {
        title: 'Votre organisation et vos preuves de R&D',
        description:
          'Structurer vos projets, leurs jalons et leurs responsables ; documenter l’état de l’art, les travaux et les résultats pour relier les preuves aux dépenses en cas de contrôle.',
      },
    ],
    footnotes: [
      {
        text: 'L’éligibilité aux dispositifs dépend notamment de l’examen des pièces ; les décisions relèvent de l’administration et des financeurs.',
      },
    ],
  },
  // Page 8 — engagements de fonctionnement, grille 2x2 numérotée
  {
    blockType: 'cardGrid',
    eyebrow: 'NOS ENGAGEMENTS DE FONCTIONNEMENT',
    title: 'Comment nous travaillons avec vous',
    columns: '2',
    cards: [
      {
        number: '01',
        title: 'Un interlocuteur principal unique',
        description:
          'Vous identifiez dès le départ la personne qui coordonne votre dossier, suit les échéances et rassemble les contributions des intervenants.',
      },
      {
        number: '02',
        title: 'Une mission et des honoraires cadrés',
        description:
          'Avant de commencer, nous définissons avec vous le périmètre, les modalités d’intervention et les honoraires dans une lettre de mission.',
      },
      {
        number: '03',
        title: 'Des points d’étape réguliers',
        description:
          'Nous convenons avec vous du rythme des échanges pour suivre les actions, signaler les difficultés et examiner les décisions à prendre.',
      },
      {
        number: '04',
        title: 'Un accès direct aux spécialistes',
        description:
          'Vous échangez directement avec les professionnels qui interviennent sur votre dossier pour traiter les questions juridiques, techniques ou financières.',
      },
    ],
  },
  // Page 9 — témoignages (extraits fidèles du deck historique livré)
  {
    blockType: 'quotes',
    eyebrow: 'TÉMOIGNAGES',
    title: 'Ils nous font confiance',
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
  // Page 10 — vos contacts (shared person-card grid; people wired at seed time)
  {
    blockType: 'cardGrid',
    eyebrow: 'VOS INTERLOCUTEURS',
    title: 'Vos contacts',
    sidebarText:
      'Une équipe resserrée, des interlocuteurs identifiés : chaque mission est suivie par les personnes qui la conduisent.',
  },
  // Page 11 — cta
  {
    blockType: 'cta',
    eyebrow: 'UN PREMIER ÉCHANGE',
    title: 'Parlons de votre situation',
    subtitle:
      'Nous vous proposons un premier échange de 30 minutes pour examiner un contrat, un actif, un différend, une question fiscale ou un financement, et préciser les points à approfondir.',
    primaryAction: 'Prendre rendez-vous : cal.klarc.com',
    secondaryAction: 'klarc.com',
    footerNote:
      '**Toulouse** · 15 rue d’Alsace-Lorraine, 31000 · +33 (0)5 61 38 53 52 · toulouse@klarc.com\n\n**Lyon** · 3 rue de Genève, 69006 · +33 (0)5 25 63 09 36 · lyon@klarc.com',
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
    const prior = (
      await payload.find({
        collection: 'media',
        where: { filename: { equals: LOGO_FILENAME } },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0];
    const logo =
      prior ??
      (await payload.create({
        collection: 'media',
        data: { alt: 'Logomark officiel KLARC' },
        filePath: join(process.cwd(), 'scripts/seed-assets/klarc-prospects', LOGO_FILENAME),
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
  // Contacts: idempotent upsert by email, then wire the page 10 cardGrid
  // `intervenants` relationship rows (the contacts grid). No avatars — the shared person card falls
  // back to initials. Carine's title follows KLARC_base_information_IA.md.
  const people = {
    joachim: { email: 'joachim@klarc.com', name: 'Joachim Brindeau', title: 'Avocat' },
    lucien: {
      email: 'lucien@klarc.com',
      name: 'Lucien Trouette',
      title: 'Conseil en Propriété Industrielle',
    },
    benjamin: { email: 'benjamin@klarc.com', name: 'Benjamin Visser', title: 'Avocat' },
    carine: {
      email: 'carine@klarc.com',
      name: 'Carine Doyharçabal',
      title: 'Docteure en génétique quantitative, responsable opérationnelle',
    },
  } as const;
  const userIds = new Map<string, number | string>();
  for (const [key, referent] of Object.entries(people)) {
    const found = (
      await payload.find({
        collection: 'users',
        where: { email: { equals: referent.email } },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0];
    const user = found
      ? await payload.update({
          collection: 'users',
          id: found.id,
          data: { name: referent.name, title: referent.title },
          overrideAccess: true,
        })
      : await payload.create({
          collection: 'users',
          data: {
            email: referent.email,
            password: crypto.randomUUID(),
            name: referent.name,
            title: referent.title,
            membershipStatus: 'active',
            role: 'viewer',
          },
          overrideAccess: true,
        });
    userIds.set(key, user.id);
  }
  const wire = (page: number, keys: (keyof typeof people)[]) => {
    (richSlides[page - 1] as Record<string, unknown>).intervenants = keys.map((key) => ({
      user: userIds.get(key),
    }));
  };
  wire(10, ['joachim', 'benjamin', 'lucien', 'carine']);
  // Plan v2 page 1: logomark on its white plaque as the cover's right column.
  {
    const logoDoc = (
      await payload.find({
        collection: 'media',
        where: { filename: { equals: LOGO_FILENAME } },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0];
    if (!logoDoc) throw new Error('Logomark media missing before slide wiring');
    (richSlides[0] as Record<string, unknown>).image = logoDoc.id;
    (richSlides[0] as Record<string, unknown>).imagePosition = 'right';
  }
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
  if (verified.slides?.length !== 11) throw new Error('Expected 11 persisted slides');
  console.log(
    JSON.stringify({
      id: verified.id,
      slug: verified.slug,
      title: verified.title,
      slides: verified.slides.length,
    }),
  );
});
