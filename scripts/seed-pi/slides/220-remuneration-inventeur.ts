// S13 — Rémunération de l'inventeur salarié → twoCols.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'twoCols',
  eyebrow: 'Étape 2 — Capter',
  title: 'Rémunération supplémentaire : obligation d’ordre public',
  intro: rt(
    "La rémunération supplémentaire de l'inventeur salarié est due pour toute invention de mission *(L.611-7, 1° CPI)*. Elle ne peut être écartée ni par le contrat, ni par la convention collective, ni par un accord d'entreprise.\n\n- Le droit naît de la déclaration d'invention, indépendamment du dépôt ou de l'exploitation\n- Il n'est pas subordonné à un « intérêt exceptionnel » *(Cass. com., 22 fév. 2005, n° 03-11.027)*\n- Un titre défensif ou de barrage, non exploité, ouvre droit à rémunération\n- Prescription : 3 ans à compter du jour où le salarié a connu ou aurait dû connaître les éléments de calcul\n- Désaccord : saisine de la CNIS *(L.615-21 CPI)* puis, le cas échéant, TJ de Paris",
  ),
  rightCards: [
    {
      title: 'Inventions hors mission attribuables',
      description: rt(
        "*(L.611-7, 2° CPI)* — l'employeur dispose d'un droit d'attribution (4 mois) contre un « juste prix ». Le juste prix reflète la valeur de l'invention, pas la rémunération du salarié — il peut être significativement supérieur au barème.",
      ),
    },
    {
      title: 'Implémentation',
      description: rt(
        "- Barème interne (fixe au dépôt + variable à la délivrance + variable à l'exploitation) — la CNIS publie des données de référence\n- Qualifier l'invention dès la déclaration\n- Tracer chaque versement — l'absence de trace est le premier argument contentieux",
      ),
    },
  ],
});

export default slide;
