// S20 — Le process du secret en 3 temps → cardGrid (3 cartes, 3 colonnes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cardGrid',
  eyebrow: 'Étape 2 — Sécuriser',
  title: 'Trois opérations : horodater → classer → partager',
  columns: '3',
  sidebarText: rt(
    "L'ordre est impératif : on date avant de diffuser. L'inverse prive l'horodatage de sa valeur probante.",
  ),
  cards: [
    {
      number: '01',
      title: 'Horodater',
      description: rt('Associer une date certaine au document, avant toute diffusion.'),
    },
    {
      number: '02',
      title: 'Classer',
      description: rt(
        'Attribuer un niveau de confidentialité déterminant les règles de diffusion.',
      ),
    },
    {
      number: '03',
      title: 'Partager',
      description: rt("Diffuser via la dataroom, sous l'accord de confidentialité approprié."),
    },
  ],
});

export default slide;
