// S27 — Le plan à 90 jours → table (7 lignes scindées 4+3, partie 1/2).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Partie IV — Mise en œuvre',
  title: 'Plan de mise en œuvre — 90 jours (1/2)',
  surface: 'light',
  tableVariant: 'reference',
  columns: [
    { header: 'Semaine' },
    { header: 'Chantier' },
    { header: 'Livrable' },
    { header: 'Responsable' },
  ],
  rows: [
    {
      cells: [
        { value: rt('1-2') },
        { value: rt('Politique PI (2 pages)') },
        {
          value: rt('Document validé par la direction + clause de renvoi type pour contrats et RI'),
        },
        { value: rt('Direction + juridique') },
      ],
    },
    {
      cells: [
        { value: rt('2-4') },
        { value: rt('Formulaire de déclaration d’invention') },
        { value: rt('Formulaire intégré au workflow R&D, testé avec l’équipe') },
        { value: rt('PI + R&D') },
      ],
    },
    {
      cells: [
        { value: rt('3-5') },
        { value: rt('Grille de classification (C0-C4)') },
        { value: rt('Grille diffusée, formation des équipes R&D') },
        { value: rt('PI + IT') },
      ],
    },
    {
      cells: [
        { value: rt('4-8') },
        { value: rt('Clauses PI dans les contrats') },
        {
          value: rt(
            'Modèles par statut (salarié, prestataire, dirigeant, stagiaire) incluant le renvoi à la politique PI + plan d’avenant pour les salariés en poste',
          ),
        },
        { value: rt('Juridique + RH') },
      ],
    },
  ],
});

export default slide;
