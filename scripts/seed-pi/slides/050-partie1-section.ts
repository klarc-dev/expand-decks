// PARTIE I — LES OUTILS (intercalaire).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'section',
  number: 'I',
  title: 'Les outils',
  subtitle: rt(
    'Ce qu’on protège et comment — chaque composant de l’innovation appelle un outil distinct.',
  ),
  surface: 'dark',
});

export default slide;
