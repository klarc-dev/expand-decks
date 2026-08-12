// S25 — Points particuliers (confidentialité, non-concurrence, surveillance) → statement.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'statement',
  eyebrow: 'Étape 5 — Le départ',
  title: 'Confidentialité, non-concurrence, surveillance',
  body: rt(
    "- L'obligation de confidentialité contractuelle survit à la rupture du contrat pendant la durée stipulée — elle est distincte de la clause de non-concurrence.\n- Si la clause de non-concurrence n'est pas activée ou n'est pas assortie d'une contrepartie financière, elle est **nulle** *(Cass. soc., 10 juill. 2002)* — mais l'obligation de confidentialité, elle, demeure.\n- Un salarié qui dépose un brevet dans les mois suivant son départ, dans le domaine de ses anciennes missions, peut être concerné par les dispositions de L.611-7 CPI — la surveillance post-départ est le moyen de le détecter.",
  ),
});

export default slide;
