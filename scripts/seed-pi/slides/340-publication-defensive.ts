// S17 — La publication défensive → twoCols.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'twoCols',
  eyebrow: 'Étape 3 — Décider',
  title: 'La publication défensive : détruire la nouveauté volontairement',
  intro: rt(
    "Principe : divulguer une solution technique de manière suffisamment détaillée pour constituer un état de la technique opposable. L'objectif est d'empêcher un tiers de breveter cette solution — et de préserver sa propre liberté d'exploitation.\n\n**Quand l'utiliser :**\n- Améliorations et variantes périphériques qu'on ne veut pas breveter mais pas voir brevetées\n- Inventions secondaires dont le coût de dépôt n'est pas justifié\n- Activité inventive trop faible pour un brevet mais qu'un tiers pourrait tenter de déposer",
  ),
  rightCards: [
    {
      title: 'Supports adaptés',
      description: rt(
        '- **IP.com Prior Art Database** — publication datée, indexée par les examinateurs EPO/USPTO\n- **Research Disclosure** (Questel) — base historique Derwent\n- Prépublication sur serveur ouvert (moins ciblée)',
      ),
    },
    {
      title: 'Points particuliers',
      description: rt(
        "- La publication doit être **suffisamment détaillée et habilitante** au sens de l'art. 54 CBE\n- Elle détruit la nouveauté pour tout le monde, y compris l'entreprise qui publie — irréversible\n- Elle ne confère aucun monopole, seulement une liberté d'exploitation",
      ),
    },
  ],
});

export default slide;
