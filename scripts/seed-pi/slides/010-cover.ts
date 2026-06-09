// S1 — Titre / couverture.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cover',
  title: "Gérer la PI dans une entreprise d'innovation",
  footerLeft: rt('Joachim Brindeau'),
  surface: 'light',
});

export default slide;
