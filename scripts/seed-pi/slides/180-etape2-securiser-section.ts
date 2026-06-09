// ÉTAPE 2 : SÉCURISER LE SECRET (intercalaire).
// Placé avant Capter : on organise le dispositif de sécurisation (horodater,
// classer, partager, opposabilité) AVANT de capter les créations dans ce cadre.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'section',
  number: '2',
  title: 'Sécuriser le secret',
  subtitle: rt('Le secret n’existe juridiquement que s’il est organisé.'),
  surface: 'dark',
});

export default slide;
