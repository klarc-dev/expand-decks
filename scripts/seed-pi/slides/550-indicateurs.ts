// S26 — Indicateurs de pilotage → table (6 lignes scindées 3+3, partie 1/2).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Étape 6 — Piloter',
  title: 'Indicateurs de pilotage (1/2)',
  surface: 'light',
  tableVariant: 'reference',
  columns: [{ header: 'Indicateur' }, { header: 'Objet' }, { header: 'Cible' }],
  rows: [
    {
      cells: [
        { value: rt('Déclarations d’invention par trimestre') },
        { value: rt('Activité inventive captée') },
        { value: rt('Tendance croissante ou stable') },
      ],
    },
    {
      cells: [
        { value: rt('Taux de transformation (déclaration → dépôt)') },
        { value: rt('Pertinence du tri') },
        { value: rt('Variable selon secteur (20-60 %)') },
      ],
    },
    {
      cells: [
        { value: rt('Coût moyen par famille de titres') },
        { value: rt('Maîtrise budgétaire') },
        { value: rt('À comparer au budget PI annuel') },
      ],
    },
  ],
});

export default slide;
