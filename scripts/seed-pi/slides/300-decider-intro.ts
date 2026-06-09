// S15 — Décider, introduction → statement.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'statement',
  eyebrow: 'Étape 3 — Décider',
  title: 'Choisir l’outil de protection adapté',
  body: rt(
    "L'analyse porte sur chaque création identifiée, **composant par composant**. Trois familles : solution technique, apparence, code source. Les arbres de décision qui suivent guident le choix.",
  ),
  surface: 'light',
});

export default slide;
