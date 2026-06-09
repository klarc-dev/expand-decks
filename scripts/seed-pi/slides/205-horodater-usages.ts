// S21 — Horodatage : usages et mise en œuvre → twoCols.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'twoCols',
  eyebrow: 'Étape 2 — Sécuriser',
  title: 'Horodatage : usages et mise en œuvre',
  intro: rt(
    "**Ce que l'horodatage permet :**\n\n- Fonder une **possession personnelle antérieure** *(L.613-7 CPI)* — droit d'exploitation personnel si un tiers dépose ultérieurement un brevet sur la même solution\n- Prouver l'antériorité de la création en cas de litige de titularité ou de contrefaçon (droit d'auteur, secret)\n- Documenter les décisions de ne pas déposer — preuve que le secret est intentionnel",
  ),
  rightCards: [
    {
      title: 'Implémentation',
      description: rt(
        "- Automatiser l'horodatage sur le flux documentaire R&D (chaque version de document, chaque compte-rendu de comité PI)\n- Archiver les certificats dans un registre centralisé avec correspondance document-certificat",
      ),
    },
  ],
});

export default slide;
