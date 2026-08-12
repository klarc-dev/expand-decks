// S2 — Le problème → statement block.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'statement',
  eyebrow: 'Diagnostic',
  title: 'Le risque PI est organisationnel avant d’être juridique',
  body: rt(
    "Cas type : un salarié soumet un article à une conférence. L'article décrit un procédé non encore déposé. La soumission constitue une divulgation au sens de L.611-11 CPI. La nouveauté est détruite. Aucun titre ne pourra plus être obtenu sur ce procédé — en France comme à l'étranger (art. 54 CBE).\n\nLe salarié n'a enfreint aucune règle parce qu'aucune règle interne ne lui imposait de faire valider le contenu. **Le défaut est dans le process, pas dans le droit.**",
  ),
  footer: rt(
    'La plupart des pertes de PI dans les entreprises innovantes relèvent de défauts d’organisation, pas d’erreurs juridiques.',
  ),
});

export default slide;
