import config from '../src/payload.config';
import { getPayload } from 'payload';
import { convertSlidesMarkdownToLexical } from '../src/lib/richTextWrite';
import { buildSlidesMd } from '../src/export/buildSlidesMd';
import type { Presentation } from '../src/payload-types';

const payload = await getPayload({ config });

const slides = [
  {
    blockType: 'cover',
    eyebrow: 'RÉUNION DU 11 JUIN 2026 · DOCUMENT DE DÉCISION',
    title: 'Organisation de la R&D du groupe Perrin',
    subtitle: 'Problèmes constatés, mesures immédiates et organisation cible.',
    surface: 'gradient',
  },
  {
    blockType: 'table',
    eyebrow: 'CONSTATS DE LA RÉUNION',
    title: 'Les principales difficultés identifiées',
    surface: 'light',
    tableVariant: 'reference',
    columns: [{ header: 'Problème' }, { header: 'Constat chez Perrin' }, { header: 'Conséquence' }],
    rows: [
      {
        cells: [
          { value: '**Portage dispersé**' },
          {
            value:
              'Employeurs, contrats, dépenses, CIR et droits répartis entre plusieurs entités.',
          },
          { value: 'Rattachement des coûts et des résultats difficile à démontrer.' },
        ],
      },
      {
        cells: [
          { value: '**Personnel mis à disposition**' },
          {
            value:
              'Environ 80 % de la masse salariale passe par des GE ; conventions nominatives précises non établies.',
          },
          { value: 'Fragilité de la preuve des dépenses de personnel au CIR.' },
        ],
      },
      {
        cells: [
          { value: '**Refacturations**' },
          {
            value:
              'Certaines dépenses R&D sont refacturées à Perrin et Fils selon des clés qualifiées d’arbitraires en réunion.',
          },
          { value: 'Intérêt propre, bénéficiaire et méthode de prix insuffisamment objectivés.' },
        ],
      },
      {
        cells: [
          { value: '**Propriété intellectuelle**' },
          {
            value:
              'Contrats et dépôts utilisent des noms d’entités variables ; certains actifs ont été déposés ou portés dans des sociétés différentes.',
          },
          { value: 'Titularité et droits d’exploitation à reconstituer actif par actif.' },
        ],
      },
      {
        cells: [
          { value: '**Pilotage**' },
          {
            value:
              'La R&D est placée dans l’entité qui dispose du budget ou qui convient au projet.',
          },
          { value: 'Absence de budget, de gouvernance et de doctrine de portage uniques.' },
        ],
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'CIR 2025',
    title: 'Dossier technique non engagé au 11 juin 2026',
    surface: 'dark',
    tableVariant: 'reference',
    columns: [{ header: 'Fait relevé' }, { header: 'Problème' }, { header: 'Action' }],
    rows: [
      {
        cells: [
          { value: 'Léo indiquait ne pas avoir commencé la justification technique 2025.' },
          {
            value: 'Délai de réponse et qualité du dossier en cas de demande de l’administration.',
          },
          { value: 'Lancer immédiatement la rédaction projet par projet.' },
        ],
      },
      {
        cells: [
          {
            value:
              'Perrin et Fils porterait l’essentiel du CIR sans employer directement l’équipe R&D.',
          },
          { value: 'Dépendance à la régularité et à la preuve des mises à disposition.' },
          { value: 'Rapprocher salariés, GE, sociétés utilisatrices, sites, temps et factures.' },
        ],
      },
      {
        cells: [
          {
            value:
              'Gaël et plusieurs contributeurs ponctuels ne sont pas valorisés ou leur quotité n’est pas chiffrée.',
          },
          { value: 'Assiette incomplète ou insuffisamment justifiable.' },
          { value: 'Établir une matrice nominative des temps et projets.' },
        ],
      },
      {
        cells: [
          { value: 'Les preuves techniques sont constituées après la période de travaux.' },
          { value: 'Reconstitution tardive des verrous, essais, échecs et résultats.' },
          { value: 'Mettre en place un dossier et un suivi mensuels à compter de 2026.' },
        ],
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'PERSONNEL ET GROUPEMENTS D’EMPLOYEURS',
    title: 'Écarts documentaires et arbitrages sociaux',
    surface: 'light',
    tableVariant: 'reference',
    columns: [{ header: 'Constat' }, { header: 'Solution proposée' }],
    rows: [
      {
        cells: [
          {
            value:
              'Les contrats informent d’une mise à disposition générale, mais les conventions individuelles précises ne sont pas établies.',
          },
          {
            value:
              'Convention et annexe nominative par salarié, société utilisatrice, période, site et fonction.',
          },
        ],
      },
      {
        cells: [
          { value: 'Léo travaille sur plusieurs sites et pour plusieurs structures.' },
          { value: 'Documenter chaque affectation et la quote-part correspondante.' },
        ],
      },
      {
        cells: [
          {
            value:
              'Une salariée viticole ferait une partie de l’année en R&D et le reste en production.',
          },
          {
            value:
              'Séparer les périodes, activités et justificatifs ; exclure le temps de production.',
          },
        ],
      },
      {
        cells: [
          {
            value:
              'Le transfert vers une filiale modifierait convention collective, intéressement et avantages.',
          },
          {
            value:
              'Réaliser un audit social et examiner l’application éventuelle de l’article L. 1224-1.',
          },
        ],
      },
      {
        cells: [
          { value: 'Clara est affectée au contrôle qualité mais pourrait intervenir en R&D.' },
          {
            value:
              'Définir une affectation distincte ou des modalités documentées entre qualité et R&D.',
          },
        ],
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'ENTITÉS ET FLUX',
    title: 'Confusions relevées dans l’organisation actuelle',
    surface: 'light',
    tableVariant: 'reference',
    columns: [{ header: 'Situation' }, { header: 'Problème constaté' }, { header: 'Correction' }],
    rows: [
      {
        cells: [
          { value: '**« Famille Perrin »**' },
          {
            value:
              'Utilisé comme nom générique et comme désignation de sociétés dans des documents externes.',
          },
          { value: 'Employer la dénomination sociale exacte dans chaque contrat et facture.' },
        ],
      },
      {
        cells: [
          { value: '**20 Domaines**' },
          {
            value:
              'Société fermière, holding, tête d’intégration et activité ingrédients réunies dans une même entité selon la réunion.',
          },
          { value: 'Écarter les nouveaux travaux R&D et dépôts de brevets de cette entité.' },
        ],
      },
      {
        cells: [
          { value: '**Perrin et Fils**' },
          {
            value:
              'Porte le CIR et reçoit des dépenses R&D, notamment parce qu’elle dispose de trésorerie.',
          },
          {
            value:
              'Remplacer la prise en charge par un financement ou une commande juridiquement documentés.',
          },
        ],
      },
      {
        cells: [
          { value: '**Sociétés non détenues à 100 %**' },
          {
            value:
              'Une exploitation ou un transfert d’actif peut bénéficier à des associés minoritaires.',
          },
          {
            value:
              'Conserver la PI dans une entité contrôlée et concéder une licence lorsque cela est justifié.',
          },
        ],
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'LABORATOIRE D’EXTRACTION',
    title: 'Décisions à prendre avant l’investissement',
    surface: 'dark',
    tableVariant: 'reference',
    columns: [{ header: 'Question' }, { header: 'Décision requise' }],
    rows: [
      {
        cells: [
          { value: 'Qui achète les équipements ?' },
          {
            value:
              'Arrêter le propriétaire avant la commande et vérifier le traitement comptable et CIR.',
          },
        ],
      },
      {
        cells: [
          { value: 'Où le laboratoire est-il exploité ?' },
          {
            value:
              'Formaliser le titre d’occupation et distinguer physiquement les espaces qualité et R&D.',
          },
        ],
      },
      {
        cells: [
          { value: 'Qui utilise les équipements ?' },
          { value: 'Définir les règles d’accès, de mise à disposition et de refacturation.' },
        ],
      },
      {
        cells: [
          { value: 'Qui emploie Clara et les autres intervenants ?' },
          {
            value:
              'Répartir les fonctions, temps et responsabilités entre contrôle qualité et R&D.',
          },
        ],
      },
      {
        cells: [
          { value: 'Qui devient titulaire des résultats ?' },
          {
            value:
              'Fixer le régime des fractions, procédés, savoir-faire et dépôts avant le début des travaux.',
          },
        ],
      },
    ],
  },
  {
    blockType: 'section',
    number: '02',
    title: 'Solution proposée',
    subtitle: 'Créer une filiale R&D pour les nouveaux projets ; traiter l’historique séparément.',
    surface: 'dark',
  },
  {
    blockType: 'mermaid',
    eyebrow: 'ORGANISATION CIBLE',
    title: 'Séparer le financement, les travaux et l’exploitation',
    surface: 'light',
    source: `flowchart LR
      A[Société disposant des fonds] -->|capital, compte courant ou prêt admissible| R[Filiale R&D]
      R -->|salaires, laboratoire, contrats et dépenses| T[Travaux de R&D]
      T --> P[Résultats et PI]
      P -->|licence, cession ou prestation| B[Société exploitante]
      B -->|prix ou redevance documenté| R`,
    caption:
      'La société financeuse ne devient pas propriétaire par le seul paiement. La société exploitante reçoit ses droits par un acte distinct.',
  },
  {
    blockType: 'table',
    eyebrow: 'FONCTIONNEMENT DE LA FILIALE',
    title: 'Éléments à mettre en place dès la constitution',
    surface: 'light',
    tableVariant: 'reference',
    columns: [{ header: 'Élément' }, { header: 'Mise en œuvre' }],
    rows: [
      {
        cells: [
          { value: '**Direction**' },
          {
            value:
              'Formaliser Léo Lajoie comme Directeur R&D : fonction, rattachement, délégations et validation des temps.',
          },
        ],
      },
      {
        cells: [
          { value: '**Équipe**' },
          {
            value:
              'Transférer ou recruter les trois ou quatre personnes majoritairement affectées à la R&D ; documenter les autres interventions.',
          },
        ],
      },
      {
        cells: [
          { value: '**Moyens**' },
          { value: 'Locaux, laboratoire, équipements et contrats d’usage identifiables.' },
        ],
      },
      {
        cells: [
          { value: '**Pilotage**' },
          { value: 'Programme annuel, comité R&D, budget et comptabilité analytique par projet.' },
        ],
      },
      {
        cells: [
          { value: '**Contrats**' },
          {
            value:
              'Convention-cadre avec chaque société, puis ordre de mission ou devis avant chaque projet.',
          },
        ],
      },
      {
        cells: [
          { value: '**Propriété intellectuelle**' },
          {
            value:
              'Politique de titularité, dépôt, licence et perfectionnement arrêtée avant les travaux.',
          },
        ],
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'RÈGLE PAR PROJET',
    title: 'Informations à fixer avant tout démarrage',
    surface: 'light',
    tableVariant: 'reference',
    columns: [{ header: 'Rubrique' }, { header: 'Information obligatoire' }],
    rows: [
      {
        cells: [
          { value: '**Besoin et travaux**' },
          { value: 'Société demandeuse, verrou, hypothèses, programme, jalons et livrables.' },
        ],
      },
      {
        cells: [
          { value: '**Ressources**' },
          { value: 'Chef de projet, salariés, sites, équipements, partenaires et budget.' },
        ],
      },
      {
        cells: [
          { value: '**Flux**' },
          {
            value: 'Financeur, payeur des dépenses, méthode de prix et calendrier de facturation.',
          },
        ],
      },
      {
        cells: [
          { value: '**Résultats**' },
          {
            value:
              'Titulaire initial, droits de l’exploitant, exclusivité, territoire et perfectionnements.',
          },
        ],
      },
      {
        cells: [
          { value: '**Fiscalité**' },
          {
            value:
              'Déclarant CIR, aides demandées et absence de double financement ou double déclaration.',
          },
        ],
      },
      {
        cells: [
          { value: '**Échec**' },
          {
            value:
              'Traitement de l’abandon, des résultats négatifs et des résultats utilisables par plusieurs sociétés.',
          },
        ],
      },
    ],
  },
  {
    blockType: 'timeline',
    eyebrow: 'MISE EN ŒUVRE',
    title: 'Calendrier proposé',
    surface: 'light',
    steps: [
      {
        label: 'Immédiat',
        description:
          'Constituer le dossier CIR 2025 et les matrices personnel, temps, factures, contrats et dépenses.',
      },
      {
        label: '0 à 3 mois',
        description:
          'Décider du laboratoire ; auditer GE, équipe, PI, intégration fiscale et conséquences sociales.',
      },
      {
        label: '3 à 6 mois',
        description:
          'Constituer la filiale ; fixer financement, gouvernance, équipe, locaux, contrats et politique de PI.',
      },
      {
        label: 'À la bascule',
        description:
          'Faire porter les nouveaux projets, contrats et investissements par la filiale.',
      },
      {
        label: '2027',
        description:
          'Examiner les actifs et contrats historiques séparément, sans transfert général.',
      },
    ],
    footer:
      'La priorité est la sécurisation de l’existant et des nouveaux projets. Le nettoyage complet de l’historique est une opération distincte.',
  },
  {
    blockType: 'table',
    eyebrow: 'DÉCISIONS DU GROUPE',
    title: 'Arbitrages nécessaires',
    surface: 'dark',
    tableVariant: 'reference',
    columns: [{ header: 'Décision' }, { header: 'Points à arrêter' }],
    rows: [
      {
        cells: [
          { value: '**Création**' },
          { value: 'Validation de la nouvelle filiale R&D et date cible.' },
        ],
      },
      {
        cells: [
          { value: '**Capital et financement**' },
          { value: 'Actionnaires, contrôle, capital initial, compte courant ou prêt.' },
        ],
      },
      {
        cells: [
          { value: '**Équipe**' },
          {
            value:
              'Personnes transférées ou recrutées ; statut de Léo ; traitement de Clara et des contributeurs partiels.',
          },
        ],
      },
      {
        cells: [
          { value: '**Laboratoire**' },
          {
            value: 'Propriétaire, site, équipements, séparation qualité/R&D et calendrier d’achat.',
          },
        ],
      },
      {
        cells: [
          { value: '**Premiers projets**' },
          {
            value:
              'Projets d’extraction, jus, gin sans alcool, co-produits et autres projets à faire entrer dans la filiale.',
          },
        ],
      },
      {
        cells: [
          { value: '**Contrats et prix**' },
          {
            value:
              'Convention-cadre, ordres de mission, licences et méthode de rémunération intragroupe.',
          },
        ],
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'PIÈCES À OBTENIR',
    title: 'Documents nécessaires à l’exécution',
    surface: 'light',
    tableVariant: 'reference',
    columns: [{ header: 'Domaine' }, { header: 'Documents' }],
    rows: [
      {
        cells: [
          { value: '**GE et personnel**' },
          {
            value:
              'Statuts, adhérents, contrats, conventions, factures, suivi du temps et règles d’intéressement.',
          },
        ],
      },
      {
        cells: [
          { value: '**CIR**' },
          {
            value:
              'Déclarations 2024-2025, calculs, projets retenus, pièces techniques, paie et comptabilité.',
          },
        ],
      },
      {
        cells: [
          { value: '**Contrats**' },
          {
            value:
              'Universités, CIFRE, partenaires industriels, prestations et refacturations intragroupe.',
          },
        ],
      },
      {
        cells: [
          { value: '**PI**' },
          {
            value:
              'Titres, demandes, inventeurs, titulaires, copropriétés, licences, annuités et revenus.',
          },
        ],
      },
      {
        cells: [
          { value: '**Groupe**' },
          {
            value:
              'Organigramme juridique, détentions, minoritaires et périmètre d’intégration fiscale.',
          },
        ],
      },
      {
        cells: [
          { value: '**Filiale**' },
          {
            value:
              'Statuts, budget, financement, bail, équipements, gouvernance et contrats-cadres.',
          },
        ],
      },
    ],
  },
];

const richSlides = await convertSlidesMarkdownToLexical(slides, payload);
if (process.env.OUTPUT_MARKDOWN) {
  const { writeFileSync } = await import('node:fs');
  const md = buildSlidesMd({
    title: 'Organisation de la R&D du groupe Perrin',
    slides: richSlides as never,
  });
  writeFileSync(process.env.OUTPUT_MARKDOWN, md);
  console.log(`Wrote rendered deck to ${process.env.OUTPUT_MARKDOWN}`);
  process.exit(0);
}
if (process.env.OUTPUT_SLIDES_JSON) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(process.env.OUTPUT_SLIDES_JSON, JSON.stringify(richSlides));
  console.log(`Wrote ${richSlides.length} slides to ${process.env.OUTPUT_SLIDES_JSON}`);
  process.exit(0);
}
const presentation = await payload.update({
  collection: 'presentations',
  id: 16,
  data: {
    title: 'Organisation de la R&D du groupe Perrin',
    language: 'fr',
    status: 'published',
    tags: ['R&D', 'CIR', 'organisation', 'propriété intellectuelle', 'décision'],
    footer: {
      enabled: true,
      left: 'Groupe Perrin · R&D',
      center: 'Document de décision',
      right: '{page} / {total}',
    },
    slides: richSlides,
  } as unknown as Presentation,
  overrideAccess: true,
  context: { skipBuildQueue: true },
});

console.log(`Updated presentation ${presentation.id} with ${richSlides.length} slides.`);
process.exit(0);
