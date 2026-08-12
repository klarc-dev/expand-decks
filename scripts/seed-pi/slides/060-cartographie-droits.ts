// S4 — Cartographie des droits → table block.
// 8 lignes débordent une slide : on scinde en deux tableaux (060 + 065),
// en-têtes répétés. Partie 1/2 : titres techniques et signes.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Partie I — Les outils',
  title: 'Chaque composant appelle un outil distinct (1/2)',
  tableVariant: 'reference',
  columns: [
    { header: 'Droit' },
    { header: 'Objet protégé' },
    { header: 'Condition clé' },
    { header: 'Durée' },
    { header: 'Coût indicatif' },
  ],
  rows: [
    {
      cells: [
        { value: rt('**Brevet** *(L.611-10 CPI)*') },
        { value: rt('Solution technique (produit, procédé)') },
        { value: rt('Nouveauté + activité inventive + application industrielle') },
        { value: rt('20 ans') },
        { value: rt('30-50 k€ (FR+EP), 100-300 k€ (famille internationale, annuités comprises)') },
      ],
    },
    {
      cells: [
        { value: rt('**Certificat d’utilité** *(L.611-2 CPI)*') },
        { value: rt('Solution technique') },
        { value: rt('Nouveauté (pas d’examen d’activité inventive)') },
        { value: rt('10 ans') },
        { value: rt('~50 % du coût brevet FR') },
      ],
    },
    {
      cells: [
        { value: rt('**Marque** *(L.711-1 CPI)*') },
        { value: rt('Signe distinctif') },
        { value: rt('Distinctivité + disponibilité') },
        { value: rt('10 ans, renouvelable sans limite') },
        { value: rt('200-500 € (FR, 1-3 classes)') },
      ],
    },
    {
      cells: [
        { value: rt('**Dessin & modèle FR** *(L.511-1 CPI)*') },
        { value: rt('Apparence d’un produit') },
        { value: rt('Nouveauté + caractère propre') },
        { value: rt('5 ans, renouvelable jusqu’à 25 ans') },
        { value: rt('~100 € par dépôt INPI') },
      ],
    },
  ],
});

export default slide;
