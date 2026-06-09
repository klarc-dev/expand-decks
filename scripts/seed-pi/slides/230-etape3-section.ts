// ÉTAPE 3 : DÉCIDER (intercalaire).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'section',
  number: '3',
  title: 'Décider',
  subtitle: rt('Quel outil de protection pour quelle création.'),
  surface: 'dark',
});

export default slide;
