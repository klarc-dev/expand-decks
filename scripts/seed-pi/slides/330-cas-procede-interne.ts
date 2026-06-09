// S16 — Cas : procédé de fabrication non détectable → twoCols.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'twoCols',
  eyebrow: 'Étape 3 — Décider',
  title: 'Cas d’application : procédé interne',
  intro: rt(
    "- Le procédé n'est pas identifiable par analyse du produit fini (pas de reverse engineering possible)\n- L'effectif ayant accès au procédé est restreint (<15 personnes)\n- Le confinement organisationnel est réaliste (un site, une équipe)\n\n**Décision : secret d'affaires**, avec mesures documentées (classification, restriction d'accès, NDA).",
  ),
  rightCards: [
    {
      title: 'Analyse',
      description: rt(
        "Un brevet ou certificat d'utilité imposerait de publier la description complète du procédé *(L.612-5 CPI)* — un tiers y accéderait par la publication sans que la contrefaçon soit détectable. Le secret permet une protection illimitée, au-delà des 20 ans du brevet.",
      ),
    },
    {
      title: 'Complément',
      description: rt(
        'Horodater la description technique du procédé pour fonder une possession personnelle antérieure *(L.613-7 CPI)* en cas de dépôt ultérieur par un tiers ayant développé indépendamment la même solution.',
      ),
    },
  ],
});

export default slide;
