// S15a — Arbre de décision : solution technique → mermaid flowchart.
// L'arbre canonique du draft (S15, « Pour une solution technique ») compte
// ~13 nœuds : scindé en 2 slides pour rester lisible, sans rien retirer.
import type { SlideFactory } from '../types';

const slide: SlideFactory = () => [
  {
    blockType: 'mermaid',
    eyebrow: 'Étape 4 — Décider',
    title: 'Choisir l’outil : solution technique (1/2)',
    source: `flowchart TD
  A["Solution stratégique et exploitable ?"] -->|Non| B["Abandon documenté ou publication défensive"]
  A -->|Oui| C{"Contrefaçon détectable sur le produit/service commercialisé ?"}
  C -->|"Non (procédé interne)"| D["Secret d'affaires si les 3 critères L.151-1 sont tenables"]
  C -->|Oui| E{"Activité inventive solide ?"}
  E -->|Oui| F["Brevet — 20 ans"]
  E -->|"Non ou incertaine"| G["Certificat d'utilité — 10 ans, pas d'examen de fond"]
  C -->|Oui| H{"Cycle de vie de l'innovation court (<10 ans) ?"}
  H -->|Oui| I["Certificat d'utilité — coût réduit, délivrance rapide"]
  H -->|Non| J["Brevet"]`,
    caption:
      'Contrefaçon détectable : choisir le titre selon l’activité inventive et le cycle de vie.',
  },
  {
    blockType: 'mermaid',
    eyebrow: 'Étape 4 — Décider',
    title: 'Choisir l’outil : solution technique (2/2)',
    source: `flowchart TD
  A["Solution stratégique et exploitable ?"] -->|Oui| K{"Secret tenable durablement (effectif restreint, confinement possible) ?"}
  K -->|Oui| L["Secret d'affaires — durée illimitée"]
  K -->|Non| M["Titre — brevet ou certificat d'utilité selon le cas"]`,
    caption: 'Le secret reste une alternative au titre quand il est durablement tenable.',
  },
];

export default slide;
