// S19 — Le critère 3 est une condition de protégeabilité → twoCols.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'twoCols',
  eyebrow: 'Étape 4 — Sécuriser',
  title: 'Le critère 3 est une condition de protégeabilité',
  intro: rt(
    "Le **critère 3 est une condition de protégeabilité**, pas une bonne pratique facultative.\n\nSans mesures documentées, l'action en justice pour obtention illicite de secret d'affaires *(L.152-1 ss. C. com.)* échouera — même si l'information est objectivement secrète.\n\n*(L.151-1 C. com., transposant la directive (UE) 2016/943)*",
  ),
  rightCards: [
    {
      title: 'Reverse engineering licite',
      description: rt(
        "Le **reverse engineering** (ingénierie inverse) est licite en droit européen *(art. 3(1)(b) directive 2016/943 ; L.151-3 C. com.)* sauf clause contractuelle contraire — le secret ne protège pas ce qui est déductible de l'analyse d'un produit licitement acquis.",
      ),
    },
    {
      title: 'Caractère raisonnable des mesures',
      description: rt(
        "Le juge évalue le caractère « raisonnable » des mesures au regard de la **taille** de l'entreprise, de la **nature** de l'information et du **secteur** — il n'y a pas de liste légale fermée, mais la jurisprudence attend au minimum un **marquage**, une **restriction d'accès** et des **engagements de confidentialité**.",
      ),
    },
  ],
});

export default slide;
