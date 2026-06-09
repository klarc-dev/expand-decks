// ÉTAPE 1 : EMBAUCHE & CADRAGE (intercalaire).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'section',
  number: '1',
  title: 'Embauche & cadrage',
  subtitle: rt('Cadrer avant le premier jour de travail.'),
  surface: 'dark',
});

export default slide;
