// ÉTAPE 3 : CAPTER (intercalaire).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'section',
  number: '3',
  title: 'Capter',
  subtitle: rt('Identifier et documenter les créations.'),
  surface: 'dark',
});

export default slide;
