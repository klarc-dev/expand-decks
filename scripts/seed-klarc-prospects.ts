import { join } from 'node:path';
import type { Presentation } from '../src/payload-types';
import { runPayloadScript } from './lib/payloadScript';
import { convertSlidesMarkdownToLexical } from '../src/lib/richTextWrite';

// Editorial authority: KLARC_base_information_IA.md (version with Chloé
// Liebgott) and the approved 2026-09-14 plan v2 (client-centric, one page per
// expertise: business law, industrial property, tax law, innovation management).
// AI drafting: gpt-6-astra. Testimonials are faithful extracts from the
// delivered historical deck; the extract containing a historical entity name
// and the "120 structures" figure are excluded on purpose.
const title = 'Klarc : Présentation clients';
// Earlier seeds saved the deck under this title; matched so a rerun renames
// instead of duplicating.
const LEGACY_TITLE = 'KLARC : Présentation clients';
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
    pills: [{ text: 'Toulouse' }, { text: 'Lyon' }],
    pillVariant: 'primary',
    title: '[Klarc] : Avocats et Conseils en Propriété Industrielle',
    subtitle:
      'Conseil et contentieux pour les entreprises innovantes, à Toulouse, à Lyon et partout en France.',
  },
  // Page 2 — 4 situations client, grille 2x2 numérotée
  {
    blockType: 'cardGrid',
    title: 'Des enjeux à sécuriser',
    eyebrow: 'Vos situations',
    sidebarText:
      'Quatre situations fréquentes où une décision juridique, technique ou financière engage votre activité.',
    columns: '2',
    cards: [
      {
        number: '01',
        title: 'Vous négociez un contrat déterminant pour votre activité',
        description:
          'Répartition des risques, garanties, propriété des résultats, conditions de sortie : nous analysons les clauses, mesurons leurs conséquences et négocions à vos côtés.',
      },
      {
        number: '02',
        title: 'Vous préparez le lancement d’un produit ou d’une marque',
        description:
          'Brevets, marques, dessins et modèles : nous définissons les protections adaptées, préparons les dépôts utiles et organisons la confidentialité avant divulgation.',
      },
      {
        number: '03',
        title: 'Vous sollicitez un financement ou un dispositif fiscal',
        description:
          'CIR[^1], CII[^2], statut JEI[^3], subventions : nous vérifions les conditions applicables à votre situation et constituons un dossier documenté en vue d’un examen de l’administration.',
      },
      {
        number: '04',
        title: 'Vous lancez un projet de R&D ou recevez un contrôle',
        description:
          'Nouveau projet, partenariat de recherche ou avis de vérification : nous structurons vos travaux et leurs preuves et définissons la stratégie de réponse.',
      },
    ],
    footnotes: [
      { text: 'CIR : crédit d’impôt recherche.' },
      { text: 'CII : crédit d’impôt innovation.' },
      { text: 'JEI : jeune entreprise innovante.' },
    ],
  },
  // Page 3 — contraste problème / réponse
  {
    blockType: 'twoCols',
    eyebrow: 'LE CONSTAT',
    title: 'Le problème des expertises dispersées',
    lead: 'Une stratégie construite ensemble, à partir de votre situation.',
    intro:
      'Votre projet innovant touche à la fois au droit, à la science, à la fiscalité et au financement. Consulter séparément multiplie les interlocuteurs, allonge les délais et peut conduire à des analyses incohérentes. Vous devez pourtant décider à partir d’une lecture commune de votre situation.',
    leftFooter:
      'L’enjeu : examiner ensemble les conséquences juridiques, techniques et financières de vos choix.',
    rightCards: [
      {
        title: 'Des professions réglementées',
        description:
          'Avocats et Conseils en Propriété Industrielle interviennent dans le respect des obligations déontologiques propres à leurs professions : secret professionnel, indépendance et prévention des conflits d’intérêts.',
      },
      {
        title: 'Une seule équipe',
        description:
          'Au sein d’une même société pluriprofessionnelle d’exercice (SPE), avocats en droit des affaires, Conseils en Propriété Industrielle, avocat fiscaliste et équipe scientifique examinent ensemble les questions que soulève votre projet.',
      },
      {
        title: 'Un même dossier partagé',
        description:
          'Les intervenants travaillent à partir des mêmes pièces, hypothèses et échéances, dans le respect des règles de confidentialité applicables.',
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
        label: 'Construire votre stratégie',
        description:
          'Croiser les analyses juridiques, scientifiques et fiscales ; construire avec vous les options adaptées à vos objectifs et définir les actions à engager.',
      },
      {
        label: 'Formaliser vos décisions',
        description:
          'Rédiger les actes, négocier les clauses, déposer les titres et réunir les justificatifs qui sécurisent vos choix.',
      },
      {
        label: 'Défendre vos droits et vous représenter',
        description:
          'Préparer les réponses, les pièces et les écritures ; vous représenter en cas de négociation, de différend ou de contrôle.',
      },
    ],
    footer:
      'Les actions et les livrables sont définis selon votre situation et le périmètre de la mission.',
  },
  // Page 5 — droit des affaires
  {
    blockType: 'twoCols',
    eyebrow: 'Droit des affaires',
    title: 'Sécuriser vos [contrats] et votre société',
    lead: 'Contrats, gouvernance, opérations et différends : notre accompagnement.',
    intro:
      'Nos avocats interviennent en conseil et en contentieux, en lien avec les Conseils en Propriété Industrielle pour la propriété des résultats et avec l’avocat fiscaliste pour les effets de vos opérations.',
    leftFooter: 'En lien avec la propriété industrielle pour vos résultats de R&D.',
    rightCards: [
      {
        title: 'Vos contrats et partenariats',
        description:
          'Rédiger et négocier vos contrats commerciaux, de distribution, de partenariat R&D et de confidentialité ; préciser les obligations, les responsabilités et les conditions de sortie.',
      },
      {
        title: 'La vie de votre société',
        description:
          'Rédiger vos statuts et pactes ; conseiller les associés et dirigeants sur la gouvernance, préparer les décisions sociales et suivre les relations entre associés.',
      },
      {
        title: 'Vos opérations',
        description:
          'Levée de fonds, cession, acquisition ou restructuration : conduire les audits, négocier les termes et rédiger les actes qui sécurisent l’opération.',
      },
      {
        title: 'Vos différends',
        description:
          'Examiner les voies de résolution, préparer le précontentieux et la médiation ; conduire le contentieux commercial et de la propriété intellectuelle.',
      },
    ],
  },
  // Page 6 — propriété industrielle
  {
    blockType: 'twoCols',
    eyebrow: 'Propriété industrielle',
    title: 'Protéger et exploiter vos [actifs immatériels]',
    lead: 'Brevets, marques, logiciels et savoir-faire, de la stratégie de protection à la défense de vos droits.',
    intro:
      'Conseils en Propriété Industrielle (CPI) et avocats travaillent sur le même dossier pour articuler protection, contrats et défense de vos actifs.',
    leftFooter: 'En lien avec le droit des affaires pour vos licences et vos contrats.',
    rightCards: [
      {
        title: 'Vos brevets et inventions',
        description:
          'Examiner la brevetabilité, la titularité et la liberté d’exploitation ; rédiger et déposer vos demandes de brevet, suivre les procédures et négocier les accords d’exploitation.',
      },
      {
        title: 'Vos marques, dessins et modèles',
        description:
          'Examiner les antériorités et les territoires utiles ; déposer vos marques, dessins et modèles, suivre les titres et défendre vos droits.',
      },
      {
        title: 'Vos logiciels et données',
        description:
          'Vérifier la titularité des droits et documenter les contributions ; rédiger et négocier les licences, encadrer l’usage des données, défendre vos droits en cas d’atteinte.',
      },
      {
        title: 'Vos savoir-faire',
        description:
          'Identifier les informations confidentielles, documenter vos savoir-faire et organiser leur protection ; encadrer leur communication et leur exploitation par contrat.',
      },
    ],
  },
  // Page 7 — droit fiscal, avec une expertise particulière de l'innovation
  {
    blockType: 'twoCols',
    eyebrow: 'Droit fiscal',
    title: 'Construire votre stratégie [fiscale] et vous défendre',
    lead: 'Fiscalité de l’entreprise, de ses dirigeants et de l’innovation.',
    intro:
      'L’avocat fiscaliste construit avec vous une stratégie adaptée à vos opérations et vous défend en cas de contrôle. Avec l’équipe scientifique, il établit la position fiscale à partir de vos travaux de R&D.',
    leftFooter: 'En lien avec le management de l’innovation pour vos preuves de R&D.',
    rightCards: [
      {
        title: 'Votre fiscalité d’entreprise',
        description:
          'Résultat, TVA, groupe, capital et dirigeants : anticiper les effets fiscaux et sécuriser vos déclarations.',
      },
      {
        title: 'Vos crédits d’impôt recherche et innovation',
        description:
          'CIR et CII : examiner travaux et dépenses, sécuriser la position par rescrit et constituer le dossier justificatif.',
      },
      {
        title: 'Vos régimes de faveur',
        description:
          'JEI, IP Box et exonérations : vérifier les conditions, revenus concernés et obligations à respecter.',
      },
      {
        title: 'Vos contrôles et contentieux fiscaux',
        description:
          'Vous assister au contrôle, répondre aux rectifications et exercer les recours.',
      },
    ],
  },
  // Page 8 — management de l'innovation
  {
    blockType: 'twoCols',
    eyebrow: 'Management de l’innovation',
    title: 'Structurer et financer vos projets de [R&D]',
    lead: 'Une équipe scientifique pour structurer vos travaux de R&D et construire vos demandes de financement.',
    intro:
      'Docteurs et ingénieurs construisent avec vous le cadre scientifique et financier de vos projets, documentent vos travaux et préparent les dossiers en lien avec l’avocat fiscaliste.',
    leftFooter:
      'En lien avec le droit fiscal pour les dispositifs propres à l’innovation et à la R&D.',
    rightCards: [
      {
        title: 'Vos aides et financements',
        description:
          'Bpifrance, subventions, appels à projets régionaux et européens : examiner les dispositifs adaptés, préparer les demandes et suivre les obligations liées aux financements obtenus.',
      },
      {
        title: 'La structuration de vos projets',
        description:
          'Définir les projets, leurs jalons, leurs responsables et leur budget ; établir l’état de l’art et les verrous à lever pour cadrer les travaux de R&D.',
      },
      {
        title: 'Vos preuves de R&D',
        description:
          'Documenter les travaux, les essais et les résultats au fil du projet, pour relier les preuves aux dépenses déclarées en cas de contrôle.',
      },
      {
        title: 'Vos partenariats de recherche',
        description:
          'Laboratoires, thèses et consortiums : cadrer la collaboration, répartir les contributions et les résultats, en lien avec les contrats rédigés par l’avocat.',
      },
    ],
  },
  // Page 9 — témoignages (extraits fidèles du deck historique livré)
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
        authorRole: 'Co-fondatrice et Directrice R&D',
        authorCompany: 'EspeRare Foundation',
      },
      {
        quote:
          'Je retiens beaucoup de professionnalisme d’une équipe pluridisciplinaire maîtrisant les enjeux techniques, juridiques, comptables et rédactionnels. Les collaborateurs Klarc ont de bonnes qualités relationnelles leur permettant de s’adapter rapidement aux équipes projets et de travailler en bonne intelligence.',
        authorName: 'Frédéric Burnier',
        authorRole: 'Directeur général adjoint pôle ingénierie',
        authorCompany: 'GA Smart Building',
      },
      {
        quote:
          'Benjamin, Carine et leurs équipes m’ont accompagné lorsque j’étais à la tête d’une équipe de R&D. Leur accompagnement était à la hauteur des enjeux, éclairé et nous a permis d’obtenir le CIR sans problème. Une belle équipe !',
        authorName: 'Kristof Descotes',
        authorRole: 'Directeur R&D',
        authorCompany: 'Althea',
      },
    ],
    linkLabel: 'Voir d’autres témoignages',
    linkUrl: 'https://klarc.com/identite/temoignages',
  },
  // Page 10 — vos contacts (shared person-card grid; people wired at seed time)
  {
    blockType: 'cardGrid',
    eyebrow: 'POUR DÉMARRER',
    title: 'Un référent par domaine',
    sidebarText:
      'Choisissez votre point d’entrée selon votre besoin ; il mobilise les compétences utiles à votre dossier.',
  },
  // Page 11 — cta
  {
    blockType: 'cta',
    eyebrow: 'UN PREMIER ÉCHANGE',
    title: 'Parlons de votre situation',
    subtitle:
      'Nous vous proposons un premier échange de 30 minutes pour examiner un contrat, un actif, une question fiscale, un projet de R&D ou un différend, et préciser les points à approfondir.',
    // Buttons and office details carry their own targets so the exported PDF
    // is clickable: booking page and one tel:/mailto: per office.
    primaryAction: 'Prendre rendez-vous',
    primaryActionUrl: '{org.bookingUrl}',
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
  // delete or manufacture login identities. Refresh their public profiles from
  // klarc.com's canonical ProfilePage metadata before wiring them into the deck.
  const people = {
    joachim: {
      email: 'joachim.brindeau@klarc.com',
      description: 'Droit des affaires : contrats, vie de la société, opérations et différends.',
      website: 'https://klarc.com/identite/joachim-brindeau',
      linkedin: 'https://www.linkedin.com/in/joachim-brindeau/',
      portrait: 'https://klarc.com/wp-content/uploads/joachim-brindeau-nose-centered.webp',
    },
    lucien: {
      email: 'lucien.trouette@klarc.com',
      description: 'Propriété industrielle : brevets, marques, logiciels et savoir-faire.',
      website: 'https://klarc.com/identite/lucien-trouette',
      linkedin: 'https://www.linkedin.com/in/lucientrouette/',
      portrait: 'https://klarc.com/wp-content/uploads/lucien-trouette-nose-centered.webp',
    },
    benjamin: {
      email: 'benjamin.visser@klarc.com',
      description:
        'Droit fiscal : fiscalité de l’entreprise et de l’innovation, contrôles et contentieux.',
      website: 'https://klarc.com/identite/benjamin-visser',
      linkedin: 'https://www.linkedin.com/in/visser-benjamin/',
      portrait: 'https://klarc.com/wp-content/uploads/benjamin-visser-nose-centered.webp',
    },
    carine: {
      email: 'carine.doyharcabal@klarc.com',
      description: 'Management de l’innovation : aides, structuration et preuves de R&D.',
      website: 'https://klarc.com/identite/carine-doyharcabal',
      linkedin: 'https://www.linkedin.com/in/carine-doyhar%C3%A7abal-phd-822baa7a/',
      portrait: 'https://klarc.com/wp-content/uploads/carine-doyharcabal-nose-centered.webp',
    },
  } as const;
  const userIds = new Map<string, number | string>();
  for (const [key, profile] of Object.entries(people)) {
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: profile.email } },
      limit: 2,
      overrideAccess: true,
    });
    if (docs.length !== 1) throw new Error(`Expected one existing account for ${profile.email}`);
    const user = docs[0];
    let avatar = typeof user.avatar === 'object' && user.avatar ? user.avatar.id : user.avatar;
    if ('portrait' in profile) {
      const alt = `Portrait public de ${user.name ?? profile.email}`;
      const filename = `${key}-klarc-portrait.webp`;
      const existingPortrait = (
        await payload.find({
          collection: 'media',
          where: {
            or: [{ filename: { equals: filename } }, { alt: { equals: alt } }],
          },
          limit: 1,
          overrideAccess: true,
        })
      ).docs[0];
      if (existingPortrait) {
        avatar = existingPortrait.id;
      } else {
        const response = await fetch(profile.portrait);
        if (!response.ok) throw new Error(`Failed to fetch public portrait (${response.status})`);
        const data = Buffer.from(await response.arrayBuffer());
        const media = await payload.create({
          collection: 'media',
          data: { alt },
          file: {
            data,
            mimetype: response.headers.get('content-type')?.split(';')[0] ?? 'image/webp',
            name: filename,
            size: data.byteLength,
          },
          overrideAccess: true,
        });
        avatar = media.id;
      }
    }
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { avatar, website: profile.website, linkedin: profile.linkedin },
      overrideAccess: true,
      context: { skipBuildQueue: true },
    });
    userIds.set(key, user.id);
  }
  const wire = (page: number, keys: (keyof typeof people)[]) => {
    (richSlides[page - 1] as Record<string, unknown>).intervenants = keys.map((key) => ({
      user: userIds.get(key),
      description: people[key].description,
    }));
  };
  // The four expertise slides carry no person card: the contacts grid (page 10)
  // is the single place where the referents appear.
  wire(10, ['joachim', 'lucien', 'benjamin', 'carine']);
  const data = {
    title,
    organisation: org[0].id,
    language: 'fr',
    status: 'published',
    documentTemplate: 'presentation',
    agentModel: 'gpt-6-astra',
    footer: {
      enabled: true,
      left: 'Klarc',
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
