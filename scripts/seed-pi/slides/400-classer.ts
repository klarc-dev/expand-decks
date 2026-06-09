// S22 — Classer : grille de classification de confidentialité → table (5 lignes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Étape 4 — Sécuriser',
  title: 'Classification de confidentialité',
  surface: 'light',
  tableVariant: 'reference',
  columns: [
    { header: 'Niveau' },
    { header: 'Règle de diffusion' },
    { header: 'Exemples' },
    { header: 'Qui autorise' },
  ],
  rows: [
    {
      cells: [
        { value: rt('**C0 — Public**') },
        { value: rt('Librement diffusable') },
        { value: rt('Plaquette commerciale, site web, brevet publié') },
        { value: rt('Pas de validation requise') },
      ],
    },
    {
      cells: [
        { value: rt('**C1 — Interne**') },
        { value: rt('Diffusable en interne sans restriction') },
        { value: rt('Documentation produit générale, organigramme') },
        { value: rt('Pas de validation requise') },
      ],
    },
    {
      cells: [
        { value: rt('**C2 — Restreint**') },
        { value: rt('Diffusable à des tiers sous NDA signé') },
        { value: rt('Spécifications techniques, données de performance, roadmap') },
        { value: rt('Responsable projet') },
      ],
    },
    {
      cells: [
        { value: rt('**C3 — Confidentiel**') },
        { value: rt('Diffusable uniquement après validation du responsable PI') },
        { value: rt("Données R&D, procédés, algorithmes, résultats d'essais non publiés") },
        { value: rt('Responsable PI ou comité PI') },
      ],
    },
    {
      cells: [
        { value: rt('**C4 — Secret**') },
        { value: rt("Ne sort pas de l'entreprise — accès nominatif tracé") },
        { value: rt('Secret de fabrication, code source critique, formulations') },
        { value: rt('Direction générale') },
      ],
    },
  ],
});

export default slide;
