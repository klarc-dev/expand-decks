// ÉTAPE 5 : LE DÉPART (intercalaire).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'section',
  number: '5',
  title: 'Le départ',
  subtitle: rt(
    'Le départ d’un collaborateur informé est un moment de risque élevé de fuite d’informations.',
  ),
});

export default slide;
