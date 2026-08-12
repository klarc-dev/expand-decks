// ÉTAPE 6 : PILOTER (intercalaire).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'section',
  number: '6',
  title: 'Piloter',
  subtitle: rt('Piloter le portefeuille et les process.'),
});

export default slide;
