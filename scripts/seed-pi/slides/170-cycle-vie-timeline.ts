// S8 — Le cycle de vie → timeline (7 étapes + bandeau pilotage continu).
import type { SlideFactory } from '../types';

const slide: SlideFactory = () => ({
  blockType: 'timeline',
  eyebrow: 'Partie III — Le cycle chronologique',
  title: 'Le process suit le cycle de vie de l’innovation et des équipes',
  surface: 'light',
  steps: [
    { label: 'Embauche' },
    { label: 'R&D' },
    { label: 'Déclaration' },
    { label: 'Décision' },
    { label: 'Protection' },
    { label: 'Exploitation' },
    { label: 'Départ' },
  ],
  footer: 'Pilotage continu — chaque étape génère un risque PI spécifique.',
});

export default slide;
