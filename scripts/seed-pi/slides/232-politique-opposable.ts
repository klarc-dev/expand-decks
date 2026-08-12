// S24 — Rendre la politique PI opposable aux salariés → table (2 lignes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Étape 2 — Sécuriser',
  title: 'Opposabilité de la politique PI aux salariés',
  tableVariant: 'reference',
  columns: [
    { header: 'Véhicule' },
    { header: 'Mécanisme' },
    { header: 'Champ couvert' },
    { header: 'Procédure' },
  ],
  rows: [
    {
      cells: [
        { value: rt('**Contrat de travail** (ou avenant)') },
        {
          value: rt(
            'Clause de renvoi identifiant la politique PI par version et date, politique annexée au contrat',
          ),
        },
        {
          value: rt(
            'Ensemble des obligations PI : cession, déclaration, classification, confidentialité',
          ),
        },
        {
          value: rt(
            'Accord individuel du salarié — pour les salariés en poste, un avenant est nécessaire (pas de modification unilatérale)',
          ),
        },
      ],
    },
    {
      cells: [
        { value: rt('**Règlement intérieur**') },
        { value: rt('Intégration des règles PI pertinentes dans le RI') },
        {
          value: rt(
            'Limité au champ légal du RI : discipline, hygiène et sécurité *(L.1321-1 C. trav.)* — inclut les règles de classification, mais pas les clauses de cession PI ni le barème de rémunération',
          ),
        },
        {
          value: rt(
            'Consultation CSE + dépôt au greffe du conseil de prud’hommes + affichage *(L.1321-4 C. trav.)*',
          ),
        },
      ],
    },
  ],
});

export default slide;
