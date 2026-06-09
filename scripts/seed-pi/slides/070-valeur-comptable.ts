// S5 — Valeur comptable et financière (tableau) → table block.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Partie I — Les outils',
  title: 'La PI est un actif inscriptible au bilan',
  surface: 'light',
  tableVariant: 'reference',
  columns: [{ header: 'Situation' }, { header: 'Traitement comptable' }, { header: 'Compte' }],
  rows: [
    {
      cells: [
        { value: rt('Titre acquis (brevet, marque, licence)') },
        { value: rt('Immobilisation incorporelle au coût d’acquisition') },
        { value: rt('205') },
      ],
    },
    {
      cells: [
        { value: rt('Frais de développement') },
        {
          value: rt('Activables sur option si les 6 critères IAS 38 / art. 212-3 PCG sont remplis'),
        },
        { value: rt('203') },
      ],
    },
    {
      cells: [
        { value: rt('Recherche fondamentale') },
        { value: rt('Charges de l’exercice, non activables') },
        { value: rt('617') },
      ],
    },
    {
      cells: [
        { value: rt('Actif créé en interne (fonds de commerce)') },
        { value: rt('Non inscriptible — valeur hors bilan') },
        { value: rt('—') },
      ],
    },
  ],
});

export default slide;
