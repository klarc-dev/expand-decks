// S12 — Dépôt avant divulgation → twoCols (intro principe + cartes divulgation / outil d'urgence).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'twoCols',
  eyebrow: 'Étape 2 — Capter',
  title: 'Toute divulgation antérieure au dépôt détruit la nouveauté',
  intro: rt(
    'La nouveauté est une condition de brevetabilité *(L.611-11 CPI ; art. 54 CBE)* et de validité des dessins et modèles *(L.511-2 CPI ; art. 5 Règl. 6/2002)*.\n\nLa destruction de nouveauté est **irréversible** — il n’existe pas de « délai de grâce » en droit européen des brevets (contrairement aux États-Unis, *35 USC §102(b)* : 1 an).',
  ),
  rightCards: [
    {
      title: 'Constituent une divulgation',
      description: rt(
        '- Publication scientifique, preprint, poster, soutenance de thèse\n- Présentation orale à une conférence, un salon, un client\n- Démonstration produit, même en cercle restreint sans NDA\n- Dépôt sur un repository public (GitHub, arXiv)\n- Offre commerciale décrivant l’innovation',
      ),
    },
    {
      title: 'Outil d’urgence',
      description: rt(
        'La **demande provisoire de brevet** *(art. L.612-2-1 CPI, loi PACTE)* permet de prendre date à l’INPI en 24-48h pour ~60 €, puis de compléter dans les 12 mois.',
      ),
    },
  ],
});

export default slide;
