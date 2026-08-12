// S9 — L'entrée du collaborateur (checklist table 2/2). En-têtes répétés.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Étape 1 — Embauche',
  title: 'Cadrer avant le premier jour (2/2)',
  tableVariant: 'reference',
  columns: [{ header: 'Action' }, { header: 'Livrable' }, { header: 'Référence' }],
  rows: [
    {
      cells: [
        { value: rt("Insérer l'engagement de confidentialité") },
        { value: rt('Clause au contrat ou engagement séparé signé') },
        { value: rt('—') },
      ],
    },
    {
      cells: [
        { value: rt('Insérer le renvoi à la politique PI') },
        {
          value: rt(
            'Clause au contrat identifiant la politique par version et date, politique annexée',
          ),
        },
        { value: rt('Condition d’opposabilité') },
      ],
    },
    {
      cells: [
        { value: rt('Pour les non-salariés : convention adaptée signée') },
        { value: rt('Convention de prestation / stage / mandat avec clauses PI') },
        { value: rt('Avant tout accès') },
      ],
    },
  ],
});

export default slide;
