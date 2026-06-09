// S28 — Récapitulatif → CTA de clôture (le récap détaillé vit dans la slide
// 980-recapitulatif ; cette slide ferme la présentation).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cta',
  eyebrow: 'Merci',
  title: "Gérer la PI dans une entreprise d'innovation",
  subtitle: rt('Questions & échanges'),
  footerNote: rt('Joachim Brindeau'),
});

export default slide;
