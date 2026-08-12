// PARTIE IV — MISE EN ŒUVRE (intercalaire).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'section',
  number: 'IV',
  title: 'Mise en œuvre',
  subtitle: rt('Un plan à 90 jours pour installer le dispositif.'),
});

export default slide;
