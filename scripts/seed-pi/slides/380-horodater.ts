// S21 — Horodater : outils pour une date certaine → table (4 lignes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Étape 4 — Sécuriser',
  title: 'Donner une date certaine et prouver l’intégrité',
  surface: 'light',
  tableVariant: 'reference',
  columns: [
    { header: 'Outil' },
    { header: 'Mécanisme' },
    { header: 'Coût' },
    { header: 'Recevabilité' },
  ],
  rows: [
    {
      cells: [
        { value: rt('**e-Soleau** (INPI)') },
        { value: rt("Dépôt numérique horodaté par l'INPI, conservé 5 ans renouvelable") },
        { value: rt('15 € par dépôt') },
        { value: rt('Preuve établie par un organisme public') },
      ],
    },
    {
      cells: [
        { value: rt("**Certificat d'horodatage qualifié eIDAS**") },
        {
          value: rt(
            'Horodatage par un prestataire de confiance qualifié au sens du Règl. (UE) 910/2014',
          ),
        },
        { value: rt('Variable, automatisable') },
        { value: rt("Présomption d'exactitude de la date *(art. 41 eIDAS)*") },
      ],
    },
    {
      cells: [
        { value: rt('**Horodatage blockchain**') },
        { value: rt('Empreinte (hash) du document inscrite dans une blockchain publique') },
        { value: rt('Coût marginal, scalable') },
        {
          value: rt(
            'Recevable — *TJ Marseille, 20 mars 2025, n° 23/00046* — fiabilité comparable à un dépôt INPI',
          ),
        },
      ],
    },
    {
      cells: [
        { value: rt('**Cahier de laboratoire**') },
        { value: rt('Support papier ou électronique, daté, paginé, signé, contresigné') },
        { value: rt('Coût du support') },
        { value: rt("Référence historique dans les contentieux d'inventions de salariés") },
      ],
    },
  ],
});

export default slide;
