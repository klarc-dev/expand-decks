// S27 — Objectifs mesurables → cardGrid (3 cartes, 3 colonnes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cardGrid',
  eyebrow: 'Partie IV — Mise en œuvre',
  title: 'Objectifs mesurables',
  columns: '3',
  cards: [
    {
      number: '01',
      title: 'Quatre comités PI par an',
      description: rt('Chacun avec PV horodaté.'),
    },
    {
      number: '02',
      title: 'Zéro déchéance',
      description: rt('Aucune déchéance de titre par oubli d’annuité.'),
    },
    {
      number: '03',
      title: '100 % des embauches',
      description: rt('Toutes les nouvelles embauches avec clause PI complète dans le contrat.'),
    },
  ],
});

export default slide;
