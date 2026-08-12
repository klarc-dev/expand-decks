import config from '../src/payload.config';
import { getPayload } from 'payload';
import { convertSlidesMarkdownToLexical } from '../src/lib/richTextWrite';
import type { Presentation } from '../src/payload-types';

const payload = await getPayload({ config });
const slugBase = 'structuration-rd-groupe-perrin';

const slides = [
  {
    blockType: 'cover',
    eyebrow: 'DOCUMENT DE DÉCISION · AOÛT 2026',
    title: 'Structurer la R&D du groupe Perrin',
    subtitle:
      '**Sécuriser l’existant.** Installer une filiale R&D opérationnelle. Rationaliser progressivement l’historique.',
  },
  {
    blockType: 'statement',
    eyebrow: 'LA CONCLUSION EN UNE PHRASE',
    title: 'Financer d’un côté. Développer dans la filiale. Exploiter de l’autre.',
    body: 'Cette dissociation est **juridiquement possible** si chaque rôle est matérialisé par un acte, une contrepartie et un flux identifiables.',
    footer:
      'Le financement ne transfère, à lui seul, ni la propriété des résultats, ni le droit de les exploiter.',
    variant: 'big-statement',
  },
  {
    blockType: 'agenda',
    eyebrow: 'TRAME DE DÉCISION',
    title: 'Quatre questions à trancher',
    items: [
      {
        label: 'Pourquoi agir ?',
        description: 'Une R&D stratégique portée par une organisation devenue difficile à piloter.',
      },
      {
        label: 'Que sécuriser maintenant ?',
        description: 'CIR 2025, personnel, factures, contrats et chaîne de droits.',
      },
      {
        label: 'Quel modèle cible ?',
        description: 'Une filiale substantielle pour les nouveaux projets.',
      },
      {
        label: 'Comment basculer ?',
        description: 'Une trajectoire 80/20, sans transfert en bloc de l’historique.',
      },
    ],
  },
  {
    blockType: 'cardGrid',
    eyebrow: '01 · POURQUOI AGIR',
    title: 'La R&D est déjà une fonction transverse du groupe',
    sidebarText:
      'Elle ne sert plus seulement l’activité vitivinicole historique. Elle devient un **moteur de diversification**, une source de PI et, demain, une offre pour des tiers.',
    columns: '3',
    cards: [
      {
        number: '01',
        title: 'Vigne & vin',
        description: 'Œnologie expérimentale, fermentation, vinification et capteurs.',
      },
      {
        number: '02',
        title: 'Co-produits',
        description: 'Marc, jus, biosolvants, synthèses et pouvoir antioxydant.',
      },
      {
        number: '03',
        title: 'Nouveaux marchés',
        description: 'Cosmétique, nutraceutique, extraction et spiritueux sans alcool.',
      },
      {
        number: '04',
        title: 'Industrie',
        description: 'Solaire, procédés, matériaux, caisserie et packaging.',
      },
      {
        number: '05',
        title: 'Partenariats',
        description: 'Universités, IMT Mines Alès et partenaires industriels.',
      },
      {
        number: '06',
        title: 'Activité future',
        description: 'Prestations de R&D potentiellement commercialisables hors groupe.',
      },
    ],
  },
  {
    blockType: 'mermaid',
    eyebrow: 'LE SCHÉMA ACTUEL',
    title: 'Six rôles qui ne coïncident pas toujours',
    source: `flowchart LR
      GE[GE Caves / GE Agricoles] -->|personnel mis à disposition| S[Sociétés du groupe]
      S --> C[Contrats scientifiques]
      S --> D[Dépenses & équipements]
      S --> R[Déclarations CIR]
      C --> P[Résultats & PI dispersés]
      D --> P
      P --> E[Exploitants métiers]
      classDef focus fill:#6f1d3b,color:#fff,stroke:#6f1d3b
      class P focus`,
    caption:
      'Employeur, payeur, cocontractant, déclarant CIR, titulaire de la PI et exploitant doivent être réconciliés projet par projet.',
  },
  {
    blockType: 'table',
    eyebrow: 'FRAGILITÉS PRIORITAIRES',
    title: 'Le risque vient moins du modèle que de sa preuve',
    tableVariant: 'matrix',
    columns: [{ header: 'Axe' }, { header: 'Point de vigilance' }, { header: 'Priorité' }],
    rows: [
      {
        cells: [
          { value: '**CIR 2025**' },
          { value: 'Dossier technique, verrous, temps et dépenses à consolider.' },
          { value: 'blocked' },
        ],
      },
      {
        cells: [
          { value: '**Personnel**' },
          { value: 'Conventions nominatives, sites, périodes et sociétés utilisatrices.' },
          { value: 'blocked' },
        ],
      },
      {
        cells: [
          { value: '**Factures GE**' },
          { value: 'Séparer salaires et cotisations des frais de gestion exclus.' },
          { value: 'warn' },
        ],
      },
      {
        cells: [
          { value: '**Contrats & flux**' },
          { value: 'Objectiver les clés, livrables, bénéficiaires et contreparties.' },
          { value: 'warn' },
        ],
      },
      {
        cells: [
          { value: '**Propriété intellectuelle**' },
          { value: 'Identifier financeur, créateur, titulaire et exploitant.' },
          { value: 'warn' },
        ],
      },
      {
        cells: [
          { value: '**Pilotage**' },
          { value: 'Créer budget, gouvernance et suivi analytique consolidés.' },
          { value: 'warn' },
        ],
      },
    ],
  },
  {
    blockType: 'timeline',
    eyebrow: 'PRIORITÉ N° 1',
    title: 'Sécuriser le CIR 2025 maintenant',
    steps: [
      {
        label: 'Statut',
        description: 'Confirmer déclarations, clôtures et avancement du dossier technique.',
      },
      {
        label: 'Projets',
        description: 'Définir opérations retenues, verrous, essais, échecs et livrables.',
      },
      {
        label: 'Personnes',
        description: 'Rapprocher temps, contrats, conventions et sociétés utilisatrices.',
      },
      {
        label: 'Dépenses',
        description: 'Ventiler paie, factures GE, équipements et prestations externes.',
      },
      {
        label: 'Contrôle',
        description: 'Une dépense, un projet, un déclarant. Aucun double emploi.',
      },
    ],
    footer:
      'Ne pas antidater. Reconstituer les preuves disponibles, documenter les écarts et instaurer le suivi mensuel.',
  },
  {
    blockType: 'section',
    number: '02',
    title: 'Installer la brique qui manque',
    subtitle: 'Une fonction R&D juridiquement, financièrement et opérationnellement identifiable.',
  },
  {
    blockType: 'statement',
    eyebrow: 'RÉPONSE JURIDIQUE',
    title:
      'Oui, le financeur, le développeur, le titulaire de la PI et l’exploitant peuvent être distincts.',
    body: 'Mais aucune de ces qualités ne résulte automatiquement du seul financement. **Les actes juridiques et la réalité opérationnelle attribuent les droits, les risques et les rémunérations.**',
    footer: 'L’intérêt propre et la contrepartie de chaque société restent à démontrer.',
    variant: 'split',
  },
  {
    blockType: 'mermaid',
    eyebrow: 'LE MODÈLE CIBLE',
    title: 'Une chaîne juridique en trois étages',
    source: `flowchart LR
      A[Société financeuse] -->|1. Capital, compte courant ou prêt admissible| R[Filiale R&D]
      R -->|2. Équipe, laboratoire, contrats, coûts, CIR| X[Résultats & PI]
      X -->|3. Licence, cession ou prestation| B[Société exploitante]
      B -->|Rémunération documentée| R
      classDef rd fill:#6f1d3b,color:#fff,stroke:#6f1d3b
      class R rd`,
    caption:
      'A ne paie pas les charges de B. A finance la filiale, la filiale paie ses dépenses, B exploite sur le fondement de son propre acte.',
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'SUBSTANCE & GOUVERNANCE',
    title: 'La filiale doit être une vraie entreprise de R&D',
    sidebarText:
      'Une société dédiée ne sécurise rien par son seul Kbis. Elle doit concentrer **les décisions, les moyens, les risques et les preuves**.',
    columns: '3',
    cards: [
      {
        number: '01',
        title: 'Direction',
        description:
          '**Léo Lajoie, Directeur R&D** dans le modèle cible, avec fiche de fonction et délégations.',
      },
      {
        number: '02',
        title: 'Équipe',
        description: 'Noyau scientifique employé directement, complété selon les projets.',
      },
      {
        number: '03',
        title: 'Moyens',
        description: 'Locaux, laboratoire, équipements et titre d’occupation identifiables.',
      },
      {
        number: '04',
        title: 'Pilotage',
        description: 'Comité R&D, programme annuel, budget et arbitrages documentés.',
      },
      {
        number: '05',
        title: 'Traçabilité',
        description: 'Centres de coûts, temps, décisions, essais, résultats et livrables.',
      },
      {
        number: '06',
        title: 'Contrats',
        description:
          'Partenariats, prestations, financements et licences conclus avant les travaux.',
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'RÈGLE DE DÉCISION PAR PROJET',
    title: 'Choisir le flux selon la réalité économique',
    tableVariant: 'reference',
    columns: [{ header: 'Situation' }, { header: 'Flux recommandé' }, { header: 'Point clé' }],
    rows: [
      {
        cells: [
          { value: '**Programme transverse**' },
          { value: 'Ressources propres de la filiale, puis licences ou prestations.' },
          { value: 'Pas de bénéficiaire unique au départ.' },
        ],
      },
      {
        cells: [
          { value: '**Projet commandé**' },
          { value: 'Convention-cadre + ordre de mission + prix documenté.' },
          { value: 'Définir livrables, PI et CIR avant lancement.' },
        ],
      },
      {
        cells: [
          { value: '**Actif conservé par la R&D**' },
          { value: 'Licence par marché, territoire ou usage.' },
          { value: 'Redevance à justifier par comparables.' },
        ],
      },
      {
        cells: [
          { value: '**Exploitante avec minoritaires**' },
          { value: 'Conserver prioritairement la PI dans une entité contrôlée.' },
          { value: 'Éviter le transfert gratuit de valeur.' },
        ],
      },
      {
        cells: [
          { value: '**Projet propre à une société**' },
          { value: 'Portage direct possible.' },
          { value: 'Elle assume coûts, contrats, résultats et CIR.' },
        ],
      },
    ],
  },
  {
    blockType: 'statement',
    eyebrow: 'PROPRIÉTÉ INTELLECTUELLE',
    title: 'Ne pas déplacer les brevets pour rendre l’organigramme plus joli.',
    body: 'Les nouveaux actifs suivent une politique définie **avant** les travaux. L’historique est traité actif par actif, après audit, valorisation, analyse fiscale et vérification des consentements.',
    footer:
      'La détention du capital, la titularité de l’actif, le développement, l’exploitation et la perception des revenus sont cinq positions distinctes.',
    variant: 'pull-quote',
  },
  {
    blockType: 'timeline',
    eyebrow: 'FEUILLE DE ROUTE 80/20',
    title: 'Sécuriser maintenant, basculer les nouveaux projets, traiter l’historique ensuite',
    steps: [
      {
        label: 'Immédiat',
        description: 'CIR 2025, temps, conventions, factures et attribution unique des coûts.',
      },
      {
        label: '0–3 mois',
        description: 'Diagnostic social, PI, capital, fiscalité, laboratoire et modèle financier.',
      },
      {
        label: '3–6 mois',
        description: 'Constitution, gouvernance, locaux, équipe, contrats et procédures.',
      },
      {
        label: '6–12 mois',
        description: 'Entrée des nouveaux projets et documentation CIR au fil de l’eau.',
      },
      {
        label: '2027',
        description: 'Traitement chirurgical des actifs, contrats et projets historiques.',
      },
    ],
    footer:
      'Trajectoire recommandée : ne pas bouleverser immédiatement le groupe, mais rendre tout nouveau projet propre dès son origine.',
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'DÉCISIONS ATTENDUES',
    title: 'Huit arbitrages pour lancer la bascule',
    columns: '4',
    cards: [
      {
        number: '01',
        title: 'Principe',
        description: 'Créer une filiale R&D opérationnelle et contrôlée.',
      },
      {
        number: '02',
        title: 'Dissociation',
        description: 'Valider financeur distinct de l’exploitant.',
      },
      {
        number: '03',
        title: 'Financement',
        description: 'Capital, compte courant ou prêt admissible.',
      },
      { number: '04', title: 'Périmètre', description: 'Basculer d’abord les nouveaux projets.' },
      { number: '05', title: 'Équipe', description: 'Acter le noyau R&D et la direction de Léo.' },
      {
        number: '06',
        title: 'Premiers flux',
        description: 'Identifier financeurs et exploitants.',
      },
      { number: '07', title: 'Groupe projet', description: 'Mobiliser opérationnels et conseils.' },
      { number: '08', title: 'Calendrier', description: 'Fixer constitution et date de bascule.' },
    ],
  },
  {
    blockType: 'cta',
    eyebrow: 'RECOMMANDATION',
    title: 'Sécuriser l’existant. Créer la filiale. Y faire naître les nouveaux projets.',
    subtitle:
      'Chaque étape doit avoir son **contrat**, sa **contrepartie** et son **flux**. C’est cette chaîne qui rend la dissociation possible et défendable.',
    primaryAction: 'Valider le lancement',
    secondaryAction: 'Mandater le groupe projet',
    footerNote:
      'Document de décision. Les faits, textes et régimes fiscaux ou sociaux devront être actualisés et validés avant mise en œuvre.',
  },
];

const richSlides = await convertSlidesMarkdownToLexical(slides, payload);
const speakers = await payload.find({
  collection: 'users',
  where: {
    email: { in: ['joachim.brindeau@klarc.com', 'benjamin.visser@klarc.com'] },
  },
  limit: 2,
  overrideAccess: true,
});

if (speakers.docs.length !== 2 || richSlides[0]?.blockType !== 'cover') {
  throw new Error('Joachim, Benjamin, or the Perrin cover slide is missing');
}

const speakerIdByEmail = new Map(speakers.docs.map((user) => [user.email, user.id]));
const cover = richSlides[0] as (typeof richSlides)[number] & {
  intervenants: Array<{ user: string | number }>;
};
cover.intervenants = [
  { user: speakerIdByEmail.get('joachim.brindeau@klarc.com')! },
  { user: speakerIdByEmail.get('benjamin.visser@klarc.com')! },
];

let org = (
  await payload.find({
    collection: 'organisations',
    where: { name: { equals: 'Groupe Perrin · R&D' } },
    limit: 1,
    overrideAccess: true,
  })
).docs[0];

if (!org) {
  org = await payload.create({
    collection: 'organisations',
    data: {
      name: 'Groupe Perrin · R&D',
      primary: '#6F1D3B',
      secondary: '#C9A96E',
      ink: '#211A1D',
      paper: '#FBF8F3',
      headingFont: 'Gilroy',
      bodyFont: 'Roboto',
    },
    overrideAccess: true,
  });
}

const existing = await payload.find({
  collection: 'presentations',
  where: { slug: { equals: slugBase } },
  limit: 1,
  overrideAccess: true,
});

const data = {
  title: 'Structuration de la R&D du groupe Perrin',
  slug: slugBase,
  language: 'fr',
  status: 'published',
  organisation: org.id,
  tags: ['R&D', 'gouvernance', 'CIR', 'propriété intellectuelle', 'décision'],
  footer: {
    enabled: true,
    left: 'Groupe Perrin · R&D',
    center: 'Document de décision',
    right: '{page} / {total}',
  },
  slides: richSlides,
} as unknown as Presentation;

let presentation;
if (existing.docs[0]) {
  presentation = await payload.update({
    collection: 'presentations',
    id: existing.docs[0].id,
    data,
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });
  console.log(`Updated presentation ${presentation.id}`);
} else {
  presentation = await payload.create({
    collection: 'presentations',
    data,
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });
  console.log(`Created presentation ${presentation.id}`);
}

console.log('Presentation data is ready. Build is run separately.');
process.exit(0);
