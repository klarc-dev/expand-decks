/**
 * Versioned retrieval evaluation dataset.
 *
 * A small corpus of representative French knowledge-base content plus questions
 * an author would realistically ask, grouped by query class. It exists so
 * retrieval changes are judged by measurement rather than intuition; the corpus
 * is deliberately small enough to read and audit by hand.
 */

export const RETRIEVAL_DATASET_VERSION = 1;

export type DatasetChunk = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  headingPath?: string;
  text: string;
};

export type QueryClass = 'exact-term' | 'semantic' | 'multi-document';

export type DatasetCase = {
  id: string;
  queryClass: QueryClass;
  query: string;
  /** Chunks that genuinely support an answer to the question. */
  expectedChunkIds: string[];
};

export const DATASET_CHUNKS: DatasetChunk[] = [
  {
    chunkId: 'plan:budget',
    documentId: 'plan',
    documentTitle: 'Plan de déploiement 2026',
    headingPath: 'Pilote > Budget',
    text: 'Le budget du pilote est fixé à 90 000 EUR pour l’exercice 2026, dont 15 000 EUR de licences.',
  },
  {
    chunkId: 'plan:duree',
    documentId: 'plan',
    documentTitle: 'Plan de déploiement 2026',
    headingPath: 'Pilote > Calendrier',
    text: 'La phase pilote se déroule sur six semaines, du 2 mars au 10 avril, avec un comité hebdomadaire.',
  },
  {
    chunkId: 'plan:perimetre',
    documentId: 'plan',
    documentTitle: 'Plan de déploiement 2026',
    headingPath: 'Pilote > Périmètre',
    text: 'Le pilote couvre trois agences volontaires et un effectif de quarante utilisateurs formés.',
  },
  {
    chunkId: 'contrat:resiliation',
    documentId: 'contrat',
    documentTitle: 'Contrat cadre fournisseur',
    headingPath: 'Durée > Résiliation',
    text: 'Chaque partie peut résilier le contrat moyennant un préavis écrit de quatre-vingt-dix jours.',
  },
  {
    chunkId: 'contrat:penalites',
    documentId: 'contrat',
    documentTitle: 'Contrat cadre fournisseur',
    headingPath: 'Niveaux de service > Pénalités',
    text: 'En cas de disponibilité inférieure à 99,5 %, une pénalité de 5 % du montant mensuel est appliquée.',
  },
  {
    chunkId: 'contrat:reference',
    documentId: 'contrat',
    documentTitle: 'Contrat cadre fournisseur',
    headingPath: 'Identification',
    text: 'Le présent contrat porte la référence CTR-2026-0148 et annule tout accord antérieur.',
  },
  {
    chunkId: 'rapport:satisfaction',
    documentId: 'rapport',
    documentTitle: 'Rapport de satisfaction utilisateurs',
    headingPath: 'Résultats',
    text: 'Le taux de satisfaction atteint 82 % des répondants, en hausse de neuf points sur un an.',
  },
  {
    chunkId: 'rapport:adoption',
    documentId: 'rapport',
    documentTitle: 'Rapport de satisfaction utilisateurs',
    headingPath: 'Résultats > Adoption',
    text: 'Les utilisateurs se connectent en moyenne quatre fois par semaine après la formation initiale.',
  },
  {
    chunkId: 'rapport:reserves',
    documentId: 'rapport',
    documentTitle: 'Rapport de satisfaction utilisateurs',
    headingPath: 'Réserves',
    text: 'Les répondants signalent une lenteur de la recherche documentaire et un manque de formation avancée.',
  },
  {
    chunkId: 'securite:acces',
    documentId: 'securite',
    documentTitle: 'Politique de sécurité',
    headingPath: 'Contrôle d’accès',
    text: 'L’authentification à deux facteurs est obligatoire pour tout accès administrateur aux données.',
  },
];

export const DATASET_CASES: DatasetCase[] = [
  {
    id: 'budget-exact',
    queryClass: 'exact-term',
    query: 'budget 90 000 EUR pilote 2026',
    expectedChunkIds: ['plan:budget'],
  },
  {
    id: 'contract-reference',
    queryClass: 'exact-term',
    query: 'référence CTR-2026-0148',
    expectedChunkIds: ['contrat:reference'],
  },
  {
    id: 'penalty-threshold',
    queryClass: 'exact-term',
    query: 'pénalité disponibilité 99,5 %',
    expectedChunkIds: ['contrat:penalites'],
  },
  {
    id: 'pilot-duration',
    queryClass: 'semantic',
    query: 'combien de temps dure la phase pilote',
    expectedChunkIds: ['plan:duree'],
  },
  {
    id: 'termination-notice',
    queryClass: 'semantic',
    query: 'comment arrêter le contrat avec le fournisseur',
    expectedChunkIds: ['contrat:resiliation'],
  },
  {
    id: 'user-complaints',
    queryClass: 'semantic',
    query: 'ce que les utilisateurs reprochent au produit',
    expectedChunkIds: ['rapport:reserves'],
  },
  {
    id: 'pilot-overview',
    queryClass: 'multi-document',
    query: 'périmètre budget et calendrier du pilote',
    expectedChunkIds: ['plan:budget', 'plan:duree', 'plan:perimetre'],
  },
  {
    id: 'adoption-and-satisfaction',
    queryClass: 'multi-document',
    query: 'satisfaction et adoption des utilisateurs',
    expectedChunkIds: ['rapport:satisfaction', 'rapport:adoption'],
  },
];
