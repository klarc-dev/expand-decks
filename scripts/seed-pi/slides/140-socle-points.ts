// S7 — Trois pièges contractuels → statement block.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'statement',
  eyebrow: 'Partie II — Les personnes',
  title: 'Trois pièges contractuels',
  body: rt(
    "- La clause de cession de droit d'auteur qui ne détaille pas les droits cédés, les supports, la durée, le territoire et la destination est **nulle** *(L.131-3 CPI)* — une formule « tous droits cédés » ne suffit pas.\n- Un NDA sans définition précise des informations couvertes ou sans durée d'obligation est difficilement opposable en contentieux.\n- La politique PI n'est pas un contrat : elle n'est opposable au salarié que si le contrat de travail y renvoie expressément ou si le règlement intérieur l'intègre dans son champ disciplinaire *(L.1321-1 C. trav.)*.",
  ),
  surface: 'light',
});

export default slide;
