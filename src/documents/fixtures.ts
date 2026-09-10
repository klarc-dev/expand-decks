import type { DocumentTemplateId } from './templates';

export type DocumentTemplateFixture = {
  id: DocumentTemplateId;
  title: string;
  slides: Record<string, unknown>[];
};

export const DOCUMENT_TEMPLATE_FIXTURES: readonly DocumentTemplateFixture[] = [
  {
    id: 'presentation',
    title: 'Dogfood — Présentation 16:9',
    slides: [
      { blockType: 'cover', eyebrow: 'Décision', title: 'Présenter une décision clairement' },
      {
        blockType: 'statement',
        eyebrow: 'Principe',
        title: 'Une idée principale par page',
      },
      { blockType: 'cta', eyebrow: 'Action', title: 'Décider de la prochaine étape' },
    ],
  },
  {
    id: 'linkedin-carousel',
    title: 'Dogfood — Carrousel LinkedIn 4:5',
    slides: [
      { blockType: 'cover', eyebrow: 'Carrousel', title: 'Une accroche lisible au premier regard' },
      { blockType: 'statement', eyebrow: 'Preuve', title: 'Chaque page porte une idée autonome' },
      { blockType: 'cta', eyebrow: 'Action', title: 'Faire glisser puis agir' },
    ],
  },
  {
    id: 'standard-report',
    title: 'Dogfood — Rapport standardisé A4',
    slides: [
      { blockType: 'cover', eyebrow: 'Rapport', title: 'Vérification des documents natifs' },
      {
        blockType: 'agenda',
        title: 'Sommaire',
        items: [{ label: 'Constats' }, { label: 'Mesures' }],
      },
      {
        blockType: 'stats',
        title: 'Chiffres clés',
        stats: [
          { value: '5', label: 'formats vérifiés' },
          { value: '100 %', label: 'artefacts contrôlés' },
        ],
      },
      { blockType: 'section', number: '01', title: 'Constats' },
      { blockType: 'statement', title: 'Le rendu respecte le contrat du template' },
      { blockType: 'cta', eyebrow: 'Conclusion', title: 'Publier avec confiance' },
    ],
  },
  {
    id: 'visual-publication',
    title: 'Dogfood — Publication visuelle carrée',
    slides: [
      {
        blockType: 'statement',
        eyebrow: 'Publication',
        title: 'Un message net dans un format carré',
        body: 'Une composition concise, centrée sur une idée forte et immédiatement lisible.',
      },
    ],
  },
  {
    id: 'sales-sheet',
    title: 'Dogfood — Fiche commerciale A4',
    slides: [
      {
        blockType: 'cta',
        eyebrow: 'Proposition',
        title: 'Une proposition claire sur une seule page',
        body: 'Une promesse lisible, trois bénéfices concrets et une prochaine étape sans ambiguïté.',
        primaryCtaLabel: 'Planifier un échange',
        secondaryCtaLabel: 'Recevoir le détail',
      },
    ],
  },
] as const;

export function documentTemplateFixture(id: DocumentTemplateId): DocumentTemplateFixture {
  const fixture = DOCUMENT_TEMPLATE_FIXTURES.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`Fixture de document inconnue : ${id}`);
  return fixture;
}
