// S8 — Le cycle de vie. Redesign (clarté) : la frise unique mélangeait deux
// chronologies distinctes (le collaborateur ET la PI générée). On les SÉPARE en
// deux pistes, et on nomme « le process » = le dispositif PI qui relie les deux.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'twoCols',
  eyebrow: 'Partie III — Le cycle chronologique',
  title: 'Deux cycles de vie, un seul dispositif',
  intro: rt(
    `Le risque PI naît à l'intersection de **deux chronologies distinctes** — qu'il ne faut pas confondre.

**1 · Le cycle du collaborateur** *(la personne qui crée)*
Embauche → Activité de R&D → Départ

**2 · Le cycle de la PI générée** *(l'actif qu'elle produit)*
Création → Déclaration → Décision → Protection → Exploitation`,
  ),
  rightCards: [
    {
      title: 'Le dispositif relie les deux',
      description: rt(
        "À chaque jalon — d'une personne (entrée, sortie) ou d'un actif (déclaration, dépôt) — le process déclenche une action PI. C'est ce dispositif que parcourent les étapes suivantes.",
      ),
    },
    {
      title: 'Les six étapes du process',
      description: rt(
        'Embauche → **Sécuriser** → **Capter** → **Décider** → Départ, le tout sous **pilotage continu**.',
      ),
    },
  ],
});

export default slide;
