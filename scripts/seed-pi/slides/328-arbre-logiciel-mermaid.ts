// S15c — Arbre de décision : code source / logiciel → mermaid flowchart.
import type { SlideFactory } from '../types';

const slide: SlideFactory = () => ({
  blockType: 'mermaid',
  eyebrow: 'Étape 4 — Décider',
  title: 'Choisir l’outil : code source / logiciel',
  surface: 'light',
  source: `flowchart TD
  A["Le logiciel produit-il un effet technique supplémentaire ?"] -->|Oui| B["Brevet d'invention mise en œuvre par ordinateur + droit d'auteur sur le code"]
  A -->|Non| C["Droit d'auteur uniquement — automatique, sans dépôt ; constituer la preuve d'antériorité"]
  C --> D["+ secret sur les éléments non divulgués (algorithmes internes, architecture)"]`,
  caption: 'EPO : « computer-implemented invention ».',
});

export default slide;
