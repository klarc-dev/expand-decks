// S4 (suite) — Cartographie des droits, partie 2/2 : apparence, droit d'auteur,
// secret, bases de données. En-têtes répétés pour lisibilité autonome.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Partie I — Les outils',
  title: 'Chaque composant appelle un outil distinct (2/2)',
  surface: 'light',
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
        { value: rt('**Dessin communautaire non enregistré** *(Règl. 6/2002, art. 11)*') },
        { value: rt('Apparence d’un produit') },
        { value: rt('Première divulgation dans l’UE') },
        { value: rt('3 ans à compter de la divulgation, non renouvelable') },
        { value: rt('Gratuit (naît de la divulgation)') },
      ],
    },
    {
      cells: [
        { value: rt('**Droit d’auteur / logiciel** *(L.111-1 ; L.112-2 CPI)*') },
        { value: rt('Œuvre originale, code source') },
        { value: rt('Originalité (empreinte de la personnalité)') },
        { value: rt('70 ans post mortem (logiciel : idem)') },
        { value: rt('Pas de dépôt requis') },
      ],
    },
    {
      cells: [
        { value: rt('**Secret d’affaires** *(L.151-1 C. com.)*') },
        { value: rt('Information non divulguée') },
        { value: rt('Valeur commerciale + non connue + mesures raisonnables') },
        { value: rt('Illimité tant que les 3 critères sont remplis') },
        { value: rt('Coût des mesures organisationnelles') },
      ],
    },
    {
      cells: [
        { value: rt('**Droit sui generis sur les bases de données** *(L.341-1 CPI)*') },
        { value: rt('Investissement substantiel dans la constitution/vérification') },
        { value: rt('Investissement prouvé') },
        { value: rt('15 ans') },
        { value: rt('Pas de dépôt requis') },
      ],
    },
  ],
});

export default slide;
