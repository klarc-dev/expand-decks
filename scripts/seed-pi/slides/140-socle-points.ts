// S7 — Quatre pièges contractuels → cardGrid (4 cartes, 2 colonnes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cardGrid',
  eyebrow: 'Partie II — Les personnes',
  title: 'Quatre pièges contractuels',
  columns: '2',
  cards: [
    {
      number: '01',
      title: "Cession de droits d'auteur incomplète",
      description: rt(
        'La clause qui ne détaille pas les droits cédés, les supports, la durée, le territoire et la destination est **nulle** *(L.131-3 CPI)* — une formule « tous droits cédés » ne suffit pas.',
      ),
    },
    {
      number: '02',
      title: 'NDA imprécis',
      description: rt(
        'Un NDA sans définition précise des informations couvertes ou sans durée d’obligation est difficilement opposable en contentieux.',
      ),
    },
    {
      number: '03',
      title: 'Politique PI non ancrée',
      description: rt(
        'La politique PI n’est pas un contrat : elle n’est opposable au salarié que si le contrat de travail y renvoie expressément ou si le règlement intérieur l’intègre dans son champ disciplinaire *(L.1321-1 C. trav.)*.',
      ),
    },
    {
      number: '04',
      title: 'Contamination PI',
      description: rt(
        'Recevoir une information non **horodatée** au préalable, c’est risquer des obligations (confidentialité, non-exploitation) sur un savoir déjà détenu — faute de preuve d’antériorité.',
      ),
    },
  ],
});

export default slide;
