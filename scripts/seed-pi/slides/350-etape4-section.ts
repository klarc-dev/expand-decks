// ÉTAPE 4 : SÉCURISER LE SECRET (intercalaire).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'section',
  number: '4',
  title: 'Sécuriser le secret',
  subtitle: rt('Le secret n’existe juridiquement que s’il est organisé.'),
  surface: 'dark',
});

export default slide;
