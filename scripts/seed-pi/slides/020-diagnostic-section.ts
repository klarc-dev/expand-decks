// PARTIE 0 — DIAGNOSTIC (intercalaire).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'section',
  number: '0',
  title: 'Diagnostic',
  subtitle: rt(
    'La plupart des pertes de PI dans les entreprises innovantes relèvent de **défauts d’organisation, pas d’erreurs juridiques**.',
  ),
  surface: 'dark',
});

export default slide;
