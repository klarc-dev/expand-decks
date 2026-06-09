// S12 — Dépôt avant divulgation, points particuliers → cardGrid (3 cartes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cardGrid',
  eyebrow: 'Étape 3 — Capter',
  title: 'Délais de priorité et exceptions',
  columns: '3',
  sidebarText: rt(
    'Trois délais à surveiller : le délai de grâce du dessin enregistré, la priorité unioniste et l’unique exception au principe de nouveauté.',
  ),
  cards: [
    {
      number: '01',
      title: 'Délais à surveiller',
      description: rt(
        "Un **délai de grâce de 12 mois** permet de déposer un **dessin enregistré** après une première divulgation *(art. 7(2) Règl. 6/2002 ; L.511-6 CPI)* — ce délai n'existe pas pour les brevets en Europe. À noter en contraste : un **dessin communautaire non enregistré** *(Règl. 6/2002, art. 11)* naît automatiquement de la première divulgation dans l'UE (3 ans, protection contre la copie uniquement).",
      ),
    },
    {
      number: '02',
      title: 'Droit de priorité unioniste',
      description: rt(
        "Un dépôt de brevet ou de dessin à l'étranger ouvre un **droit de priorité unioniste de 12 mois** (brevets) ou **6 mois** (dessins et modèles) *(CUP art. 4)* — ce délai doit être surveillé activement.",
      ),
    },
    {
      number: '03',
      title: 'Exception étroite au principe de nouveauté',
      description: rt(
        "Seule exception *(L.611-13 CPI)* : divulgation résultant d'un **abus évident** ou dans le cadre d'une **exposition internationale officielle** — ne couvre ni les salons commerciaux ni les conférences.",
      ),
    },
  ],
});

export default slide;
