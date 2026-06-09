// S11 — La déclaration d'invention (formulaire) → twoCols.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'twoCols',
  eyebrow: 'Étape 2 — Capter',
  title: 'La déclaration d’invention de salarié',
  intro: rt(
    "La déclaration est une obligation légale du salarié *(L.611-7 et R.611-1 CPI)*. En pratique, c'est à l'entreprise de fournir le formulaire et de l'intégrer au flux de travail.\n\n**Contenu du formulaire :**\n\n- Identité des inventeurs et contributeurs (y compris externes)\n- Description technique de l'invention (problème résolu, solution, avantages)\n- Circonstances de la création (dans le cadre des missions ? avec les moyens de l'entreprise ?)\n- Financements publics éventuels (ANR, BPI, H2020/HE — peuvent imposer des obligations de dépôt ou de licence)\n- État de l'art connu par l'inventeur\n- Divulgations déjà intervenues (publications, présentations, échanges avec des tiers)",
  ),
  rightCards: [
    {
      title: 'Délais employeur',
      description: rt(
        "- **2 mois** pour se prononcer sur le classement (mission / hors mission / hors mission attribuable) à compter de la réception *(R.611-7 CPI)*\n- **4 mois** pour exercer le droit d'attribution sur une invention hors mission attribuable\n- Le silence de l'employeur vaut acceptation du classement proposé par le salarié",
      ),
    },
    {
      title: 'Implémentation',
      description: rt(
        "- Intégrer le formulaire au workflow R&D (outil de gestion de projet, cahier de laboratoire électronique, intranet)\n- Déclencher la déclaration à chaque jalon projet (prototype, PoC, résultat d'essai significatif)\n- Archiver avec horodatage",
      ),
    },
  ],
});

export default slide;
