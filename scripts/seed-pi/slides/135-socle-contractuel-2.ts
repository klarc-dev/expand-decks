// S7 — Le socle contractuel (table 2/2). En-têtes répétés.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Partie II — Les personnes',
  title: 'Les contrats qui font entrer la PI dans l’entreprise (2/2)',
  surface: 'light',
  tableVariant: 'reference',
  columns: [
    { header: 'Relation' },
    { header: 'Document' },
    { header: 'Clauses essentielles' },
    { header: 'Moment de signature' },
  ],
  rows: [
    {
      cells: [
        { value: rt('Prestataire') },
        { value: rt('Contrat de prestation') },
        {
          value: rt('Cession PI *(avec détail L.131-3 CPI)* + confidentialité + non-réutilisation'),
        },
        { value: rt('Avant tout accès aux informations et avant tout début de travaux') },
      ],
    },
    {
      cells: [
        { value: rt('Partenaire R&D') },
        { value: rt('Accord de consortium / R&D') },
        {
          value: rt(
            'Définition du background / sideground / foreground + règles d’exploitation + publication',
          ),
        },
        { value: rt('Avant le démarrage du projet') },
      ],
    },
    {
      cells: [
        { value: rt('Tout tiers recevant de l’information confidentielle') },
        { value: rt('NDA') },
        {
          value: rt(
            'Définition des informations couvertes + durée + obligations de non-divulgation et non-utilisation',
          ),
        },
        { value: rt('Avant toute transmission') },
      ],
    },
  ],
});

export default slide;
