// S9 — L'entrée du collaborateur : « Points particuliers » → cardGrid (2 cartes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cardGrid',
  eyebrow: 'Étape 1 — Embauche',
  title: 'Embauche : points de vigilance',
  columns: '2',
  cards: [
    {
      number: '01',
      title: 'Missions inventives non décrites',
      description: rt(
        'Un salarié dont le contrat ne décrit pas les missions inventives peut contester la qualification « invention de mission » et revendiquer le régime de l’invention hors mission attribuable *(L.611-7, 2° CPI)* — le « juste prix » d’attribution est généralement supérieur à la rémunération supplémentaire.',
      ),
    },
    {
      number: '02',
      title: 'Clause de non-sollicitation',
      description: rt(
        'La clause de non-sollicitation présente dans certains NDA partenaires peut interdire le recrutement d’un ingénieur identifié lors d’une collaboration — à vérifier systématiquement.',
      ),
    },
  ],
});

export default slide;
