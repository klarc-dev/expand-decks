// S12 — Dépôt avant divulgation, points particuliers → cardGrid (3 cartes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cardGrid',
  eyebrow: 'Étape 2 — Capter',
  title: 'Délais de priorité et exceptions',
  columns: '3',
  sidebarText: rt(
    'Trois régimes à surveiller : le dessin né de la divulgation, la priorité unioniste et l’unique exception au principe de nouveauté.',
  ),
  cards: [
    {
      number: '01',
      title: 'Dessin communautaire non enregistré',
      description: rt(
        "Le **dessin communautaire non enregistré** *(Règl. 6/2002, art. 11)* naît précisément de la divulgation : la première divulgation dans l'UE fait naître le droit (3 ans, protection contre la copie uniquement). Un **délai de grâce de 12 mois** existe pour le dépôt d'un dessin enregistré *(art. 7(2) Règl. 6/2002 ; L.511-6 CPI)* — ce délai n'existe pas pour les brevets en Europe.",
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
