// S26 — Indicateurs de pilotage → table (6 lignes scindées 3+3, partie 2/2).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Étape 6 — Piloter',
  title: 'Indicateurs de pilotage (2/2)',
  tableVariant: 'reference',
  columns: [{ header: 'Indicateur' }, { header: 'Objet' }, { header: 'Cible' }],
  rows: [
    {
      cells: [
        { value: rt('Échéancier d’annuités et de renouvellements') },
        { value: rt('Prévention des déchéances') },
        { value: rt('**Zéro déchéance par oubli**') },
      ],
    },
    {
      cells: [
        { value: rt('Couverture géographique vs. CA export par zone') },
        { value: rt('Adéquation portefeuille-marché') },
        { value: rt('Couverture des zones représentant >80 % du CA') },
      ],
    },
    {
      cells: [
        { value: rt('NDA signés vs. diffusions C2+') },
        { value: rt('Discipline de partage') },
        { value: rt('100 % de couverture') },
      ],
    },
  ],
});

export default slide;
