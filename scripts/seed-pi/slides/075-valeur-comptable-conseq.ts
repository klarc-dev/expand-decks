// S5 — Valeur comptable : conséquences opérationnelles.
// Redesign : cardGrid 3 colonnes pleine largeur (au lieu d'un twoCols
// déséquilibré). Le point « marque créée en interne » est retiré à la demande
// de l'auteur ; le focus est mis sur les trois leviers financiers concrets.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cardGrid',
  eyebrow: 'Partie I — Les outils',
  title: 'PI au bilan : trois leviers financiers',
  columns: '3',
  sidebarText: rt(
    "Un droit de PI remplit les conditions d'inscription à l'actif *(art. 211-1 PCG)* : identifiable, contrôlé, source d'avantages futurs, évaluable de manière fiable.",
  ),
  cards: [
    {
      number: '01',
      title: 'Activer les frais de développement',
      description: rt(
        "Activables sur option si les **6 critères IAS 38 / art. 212-3 PCG** sont remplis *(compte 203)*. L'activation renforce les capitaux propres — un atout en amont d'une levée de fonds ou d'une due diligence.",
      ),
    },
    {
      number: '02',
      title: 'Nantir les titres de PI',
      description: rt(
        "Les brevets et marques peuvent être **nantis** au profit d'un créancier *(L.613-8 CPI pour les brevets, L.714-1 CPI pour les marques)* — la PI devient une sûreté mobilisable.",
      ),
    },
    {
      number: '03',
      title: 'Optimiser via l’IP Box',
      description: rt(
        "Taux effectif réduit à **10 %** sur les revenus nets de cession ou concession de brevets, certificats d'utilité et logiciels *(art. 238 CGI)* — sous réserve d'une **documentation nexus** liant les dépenses de R&D aux actifs, constituée en continu.",
      ),
    },
  ],
});

export default slide;
