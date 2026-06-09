// PARTIE II — LES PERSONNES : QUI CRÉE, QUI DÉTIENT (intercalaire).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'section',
  number: 'II',
  title: 'Les personnes',
  subtitle: rt('Qui crée, qui détient — le statut du créateur détermine le régime de titularité.'),
  surface: 'dark',
});

export default slide;
