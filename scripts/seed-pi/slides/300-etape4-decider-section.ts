// ÉTAPE 4 : DÉCIDER (intercalaire).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'section',
  number: '4',
  title: 'Décider',
  subtitle: rt('Quel outil de protection pour quelle création.'),
});

export default slide;
