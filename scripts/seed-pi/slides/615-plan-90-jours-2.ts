// S27 — Le plan à 90 jours → table (7 lignes scindées 4+3, partie 2/2).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Partie IV — Mise en œuvre',
  title: 'Plan de mise en œuvre — 90 jours (2/2)',
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
        { value: rt('6-10') },
        { value: rt('Modèles NDA + dataroom') },
        {
          value: rt(
            'NDA par scénario et par langue, dataroom paramétrée (accès, watermarking, journalisation)',
          ),
        },
        { value: rt('PI + IT') },
      ],
    },
    {
      cells: [
        { value: rt('8-10') },
        { value: rt('Premier inventaire PI') },
        {
          value: rt(
            'Cartographie des actifs existants (titres déposés, secrets identifiés, créations non protégées) + vérification de la chaîne de titularité',
          ),
        },
        { value: rt('PI') },
      ],
    },
    {
      cells: [
        { value: rt('10-12') },
        { value: rt('Premier comité PI') },
        {
          value: rt(
            'PV du comité avec premières décisions de dépôt/secret/abandon tracées et horodatées',
          ),
        },
        { value: rt('PI + direction') },
      ],
    },
  ],
});

export default slide;
