// S15b — Arbre de décision : apparence (forme, design, interface) → mermaid flowchart.
import type { SlideFactory } from '../types';

const slide: SlideFactory = () => ({
  blockType: 'mermaid',
  eyebrow: 'Étape 4 — Décider',
  title: 'Choisir l’outil : apparence',
  surface: 'light',
  source: `flowchart TD
  A["Apparence nouvelle et caractère propre ?"] -->|Oui| B{"Cycle de vie ?"}
  A -->|"Non ou incertain"| C["Droit d'auteur si originalité — sans dépôt, preuve d'antériorité à constituer"]
  B -->|"Court, renouvellement fréquent"| D["Dessin communautaire non enregistré — 3 ans, automatique à la divulgation UE"]
  B -->|"Long ou besoin de protection contre création indépendante"| E["Dessin enregistré — FR, UE ou international (Haye)"]`,
  caption: "L'analyse porte sur chaque création identifiée, composant par composant.",
});

export default slide;
