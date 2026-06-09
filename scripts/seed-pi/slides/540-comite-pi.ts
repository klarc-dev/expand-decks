// S26 — Le comité PI → twoCols.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'twoCols',
  eyebrow: 'Étape 6 — Piloter',
  title: 'Le comité PI',
  intro: rt(
    '- **Composition :** direction, R&D, juridique/PI, commercial (selon les sujets)\n- **Fréquence :** trimestrielle minimum\n- **Décisions tracées** dans un PV horodaté : dépôt, extension géographique, maintien, abandon, publication défensive, classification en secret\n- Les décisions de **ne pas protéger** sont documentées au même titre que les décisions de dépôt',
  ),
  rightCards: [
    {
      title: 'Veille & oppositions',
      description: rt(
        "La **veille brevets** sur les dépôts des concurrents permet de détecter les atteintes et de déclencher des observations de tiers devant l'EPO *(art. 115 CBE)* ou des oppositions *(art. 99 CBE, 9 mois post-délivrance)*.",
      ),
    },
    {
      title: 'Abandon actif',
      description: rt(
        "L'abandon actif de titres non stratégiques est une décision de gestion légitime — il libère du budget d'annuités pour les actifs à valeur. Le documenter en comité PI.",
      ),
    },
  ],
});

export default slide;
